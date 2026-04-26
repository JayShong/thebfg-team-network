const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const functions = require('firebase-functions');
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Set global options to use us-central1 (or your preferred region)
setGlobalOptions({ region: 'us-central1' });


const NUM_SHARDS = 10;
const NUM_BUSINESS_SHARDS = 10;

/**
 * Helper to update the global stats document using sharding to prevent hotspots.
 * Supports updating multiple fields at once.
 * Can be used within an existing transaction.
 */
async function updateGlobalStat(updatesMap, transaction = null) {
    const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
    const shardRef = db.collection('system').doc('stats').collection('shards').doc(shardId);
    
    const increments = {};
    for (const [key, value] of Object.entries(updatesMap)) {
        increments[key] = admin.firestore.FieldValue.increment(value);
    }

    if (transaction) {
        transaction.set(shardRef, increments, { merge: true });
        return Promise.resolve();
    } else {
        return shardRef.set(increments, { merge: true });
    }
}

/**
 * SELF-HEALING: Automated Reconciliation
 * Runs every 5 mins for counts, and every 6 hours for deep impact sum.
 */
exports.reconcilenetworkstats = onSchedule('every 5 minutes', async (event) => {

    console.log("CRON: Starting automated network reconciliation...");
    const now = new Date();
    const isDeepReconcile = (now.getDay() === 0 && now.getHours() === 3 && now.getMinutes() < 30);

    try {
        const [userCountSnap, bizCountSnap, checkinCountSnap, purchaseCountSnap, shardsSnap, mainDocSnap] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('businesses').count().get(),
            db.collection('transactions').where('type', '==', 'checkin').count().get(),
            db.collection('transactions').where('type', '==', 'purchase').count().get(),
            db.collection('system').doc('stats').collection('shards').get(),
            db.collection('system').doc('stats').get()
        ]);

        const mainStats = mainDocSnap.exists ? mainDocSnap.data() : {};
        const updates = {
            consumers: userCountSnap.data().count,
            businesses: bizCountSnap.data().count,
            checkins: checkinCountSnap.data().count,
            purchases: purchaseCountSnap.data().count,
            lastAutoReconcile: admin.firestore.FieldValue.serverTimestamp()
        };

        // 1. Sum up and CLEAR sharded increments
        let shardWaste = 0;
        let shardTrees = 0;
        const batch = db.batch();
        
        shardsSnap.forEach(doc => {
            const data = doc.data();
            shardWaste += (data.totalWaste || 0);
            shardTrees += (data.totalTrees || 0);
            
            // SECURITY FIX: Subtract the amount we just processed instead of deleting the doc
            // This prevents losing increments that happen between the 'get' and the 'delete'
            const resetBatch = {};
            if (data.totalWaste) resetBatch.totalWaste = admin.firestore.FieldValue.increment(-data.totalWaste);
            if (data.totalTrees) resetBatch.totalTrees = admin.firestore.FieldValue.increment(-data.totalTrees);
            
            if (Object.keys(resetBatch).length > 0) {
                batch.set(doc.ref, resetBatch, { merge: true });
            }
        });

        // Add shard deltas to main stats
        updates.totalWaste = (mainStats.totalWaste || 0) + shardWaste;
        updates.totalTrees = (mainStats.totalTrees || 0) + shardTrees;

        if (isDeepReconcile) {
            console.log("CRON: Performing deep impact reconciliation...");
            const [allBizSnap, transSnap] = await Promise.all([
                db.collection('businesses').get(),
                db.collection('transactions').where('type', '==', 'purchase').where('status', '==', 'verified').get()
            ]);

            let totalFamilies = 0;
            const bizMap = {};
            allBizSnap.forEach(doc => { 
                const b = doc.data();
                bizMap[doc.id] = b;
                totalFamilies += (parseInt(b.impactJobs) || 0);
            });

            let totalWaste = 0;
            let totalTrees = 0;
            transSnap.forEach(doc => {
                const txn = doc.data();
                const biz = bizMap[txn.bizId];
                if (biz && biz.yearlyAssessments) {
                    let latestRev = 0; let latestWaste = 0; let latestTrees = 0;
                    const assessments = Array.isArray(biz.yearlyAssessments) 
                        ? biz.yearlyAssessments : Object.values(biz.yearlyAssessments);

                    assessments.forEach(ya => {
                        const rev = parseFloat(ya.revenue?.toString().replace(/,/g, '')) || 0;
                        if (rev > latestRev) {
                            latestRev = rev;
                            latestWaste = parseFloat(ya.wasteKg?.toString().replace(/,/g, '')) || 0;
                            latestTrees = parseFloat(ya.treesPlanted?.toString().replace(/,/g, '')) || 0;
                        }
                    });

                    if (latestRev > 0) {
                        const proportion = (parseFloat(txn.amount) || 0) / latestRev;
                        totalWaste += (proportion * latestWaste);
                        totalTrees += (proportion * latestTrees);
                    }
                }
            });

            updates.totalWaste = parseFloat(totalWaste.toFixed(2));
            updates.totalTrees = Math.round(totalTrees);
            updates.totalFamilies = totalFamilies;
        }
        
        batch.set(db.collection('system').doc('stats'), updates, { merge: true });
        await batch.commit();

        // 2. CONSOLIDATE BUSINESS SHARDS (Scalable "Dirty Flag" Pattern)
        const dirtyBizSnap = await db.collection('businesses')
            .where('needsReconciliation', '==', true)
            .limit(50) // Process in chunks to avoid timeouts
            .get();

        if (!dirtyBizSnap.empty) {
            console.log(`CRON: Consolidating shards for ${dirtyBizSnap.size} businesses...`);
            for (const bizDoc of dirtyBizSnap.docs) {
                const bizId = bizDoc.id;
                const bizData = bizDoc.data();
                
                const shardsSnap = await db.collection('businesses').doc(bizId).collection('shards').get();
                
                let checkinsInc = 0;
                let ghostCheckinsInc = 0;
                let purchasesInc = 0;
                let volumeInc = 0;

                const shardBatch = db.batch();
                shardsSnap.forEach(sDoc => {
                    const s = sDoc.data();
                    checkinsInc += (s.checkinsCount || 0);
                    ghostCheckinsInc += (s.ghostCheckinsCount || 0);
                    purchasesInc += (s.purchasesCount || 0);
                    volumeInc += (s.purchaseVolume || 0);

                    // SECURITY FIX: Subtract the amount we just processed instead of deleting
                    const bReset = {};
                    if (s.checkinsCount) bReset.checkinsCount = admin.firestore.FieldValue.increment(-s.checkinsCount);
                    if (s.ghostCheckinsCount) bReset.ghostCheckinsCount = admin.firestore.FieldValue.increment(-s.ghostCheckinsCount);
                    if (s.purchasesCount) bReset.purchasesCount = admin.firestore.FieldValue.increment(-s.purchasesCount);
                    if (s.purchaseVolume) bReset.purchaseVolume = admin.firestore.FieldValue.increment(-s.purchaseVolume);

                    if (Object.keys(bReset).length > 0) {
                        shardBatch.set(sDoc.ref, bReset, { merge: true });
                    }
                });

                if (shardsSnap.size > 0) {
                    await shardBatch.commit();
                    await db.collection('businesses').doc(bizId).update({
                        checkinsCount: admin.firestore.FieldValue.increment(checkinsInc),
                        ghostCheckinsCount: admin.firestore.FieldValue.increment(ghostCheckinsInc),
                        purchasesCount: admin.firestore.FieldValue.increment(purchasesInc),
                        purchaseVolume: admin.firestore.FieldValue.increment(volumeInc),
                        needsReconciliation: false,
                        lastReconciled: admin.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await db.collection('businesses').doc(bizId).update({ needsReconciliation: false });
                }
            }
        }

        // 3. SEASONAL EXPIRY CHECK (Dependency-based archival)
        const { seasonId } = getSeasonContext();
        const lastArchivedSeason = mainStats.lastArchivedSeason || '2026_S1'; 

        if (lastArchivedSeason !== seasonId) {
            console.log(`CRON: Season transition detected (${lastArchivedSeason} -> ${seasonId}). Triggering archival...`);
            await runSeasonArchive(lastArchivedSeason);
            await db.collection('system').doc('stats').update({ lastArchivedSeason: seasonId });
        }

        console.log("CRON: Reconciliation successful. Global and Business shards cleared.");
    } catch (e) {
        console.error("CRON: Reconciliation failed", e);
    }
});


// 1. User Triggers
exports.onusercreated = onDocumentCreated('users/{userId}', async (event) => {
    console.log('Incrementing consumer count');
    return updateGlobalStat({ consumers: 1 });
});

exports.onuserdeleted = onDocumentDeleted('users/{userId}', async (event) => {
    console.log('Decrementing consumer count');
    return updateGlobalStat({ consumers: -1 });
});

// 2. Business Triggers
exports.onbusinesscreated = onDocumentCreated('businesses/{bizId}', async (event) => {
    console.log('Incrementing business count');
    return updateGlobalStat({ businesses: 1 });
});

exports.onbusinessdeleted = onDocumentDeleted('businesses/{userId}', async (event) => {
    console.log('Decrementing business count');
    return updateGlobalStat({ businesses: -1 });
});

const { BADGES_CONFIG, evaluateTier, evaluateBadges } = require('./badgeEngine');

/**
 * Determine the current season and year based on timestamp.
 * Standard rule: S1 (Jan-Jun), S2 (Jul-Dec)
 */
const getSeasonContext = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date();
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    // Genesis Season Extension: All of 2026 is S1
    if (year === 2026) return { year: '2026', seasonId: '2026_S1' };

    // S1: Months 0-5 (Jan-Jun), S2: Months 6-11 (Jul-Dec)
    const sNum = month < 6 ? 1 : 2;
    const seasonId = `${year}_S${sNum}`;

    return { year: year.toString(), seasonId };
};

// 3. Transaction Triggers (Sanitized Feed & The Sentinel)
exports.ontransactioncreated = onDocumentCreated('transactions/{txnId}', async (event) => {
    const txn = event.data.data();
    if (!txn.userId) return null;
    const today = new Date().toISOString().split('T')[0];
    const { year, seasonId } = getSeasonContext(txn.timestamp);

    try {
        // A. The Sentinel: Background Verification
        // ... (Sentinel logic remains unchanged) ...
        const dailyQuery = await db.collection('transactions')
            .where('userId', '==', txn.userId)
            .where('bizId', '==', txn.bizId)
            .where('type', '==', 'checkin')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        const duplicates = dailyQuery.docs.filter(doc => {
            if (doc.id === event.params.txnId) return false;
            const ts = doc.data().timestamp;
            if (!ts) return false;
            const d = ts.toDate().toISOString().split('T')[0];
            return d === today;
        });

        if (duplicates.length > 0) {
            console.warn(`Sentinel: Rule violation detected for ${txn.userId}. Flagging user.`);
            if (!txn.isGhost) {
                await db.collection('users').doc(txn.userId).update({ 
                    isFlagged: true,
                    flagReason: `Daily limit bypass at ${txn.bizName || txn.bizId}`
                });
            }
            await event.data.ref.update({ status: 'flagged_by_sentinel' });
            await updateGlobalStat({ sentinelBlocks: 1 });
            return null;
        }

        // B. SCALE-FIRST: Update User Stats & Evaluate Badges
        await updateGlobalStat({ checkins: 1 });
        if (!txn.isGhost) {
            const statsRef = db.collection('users').doc(txn.userId).collection('counters').doc('summary');
            const annualRef = db.collection('users').doc(txn.userId).collection('annual').doc(year);
            const seasonalRef = db.collection('users').doc(txn.userId).collection('seasons').doc(seasonId);
            const userRef = db.collection('users').doc(txn.userId);
            
            const bizDoc = await db.collection('businesses').doc(txn.bizId).get();
            const biz = bizDoc.exists ? bizDoc.data() : null;
            
            await db.runTransaction(async (transaction) => {
                const statsDoc = await transaction.get(statsRef);
                const annualDoc = await transaction.get(annualRef);
                const seasonalDoc = await transaction.get(seasonalRef);
                const userDoc = await transaction.get(userRef);
                
                const updateLayer = (doc) => {
                    const stats = doc.exists ? doc.data() : {
                        totalCheckins: 0, totalPurchases: 0, totalWaste: 0,
                        totalTrees: 0, totalFamilies: 0,
                        uniqueBizIds: {}, uniqueLocations: {}, uniqueIndustries: {},
                        uniqueImpactfulBizIds: {}, uniqueVerifiedBizIds: {}, uniqueTransparentBizIds: {},
                        bizVisits: {}
                    };

                    const isNewBiz = !stats.uniqueBizIds?.[txn.bizId];
                    if (txn.type === 'checkin') stats.totalCheckins = (stats.totalCheckins || 0) + 1;
                    if (txn.type === 'purchase') stats.totalPurchases = (stats.totalPurchases || 0) + 1;
                    
                    if (txn.bizId) {
                        stats.uniqueBizIds = stats.uniqueBizIds || {};
                        if (isNewBiz) {
                            stats.uniqueBizIds[txn.bizId] = true;
                            if (biz) {
                                stats.totalFamilies = (stats.totalFamilies || 0) + (parseInt(biz.impactJobs) || 0);
                                if (parseInt(biz.impactJobs) >= 5) {
                                    stats.uniqueImpactfulBizIds = stats.uniqueImpactfulBizIds || {};
                                    stats.uniqueImpactfulBizIds[txn.bizId] = true;
                                }
                                if (biz.isVerified) {
                                    stats.uniqueVerifiedBizIds = stats.uniqueVerifiedBizIds || {};
                                    stats.uniqueVerifiedBizIds[txn.bizId] = true;
                                }
                                if (Object.keys(biz.yearlyAssessments || {}).length > 0) {
                                    stats.uniqueTransparentBizIds = stats.uniqueTransparentBizIds || {};
                                    stats.uniqueTransparentBizIds[txn.bizId] = true;
                                }
                            }
                        }
                        
                        stats.bizVisits = stats.bizVisits || {};
                        stats.bizVisits[txn.bizId] = (stats.bizVisits[txn.bizId] || 0) + 1;

                        if (txn.type === 'purchase') {
                            stats.bizPurchases = stats.bizPurchases || {};
                            stats.bizPurchases[txn.bizId] = (stats.bizPurchases[txn.bizId] || 0) + 1;
                        }
                        if (txn.bizLocation) {
                            stats.uniqueLocations = stats.uniqueLocations || {};
                            stats.uniqueLocations[txn.bizLocation] = true;
                        }
                        if (txn.bizIndustry) {
                            stats.uniqueIndustries = stats.uniqueIndustries || {};
                            stats.uniqueIndustries[txn.bizIndustry] = true;
                        }
                    }
                    return stats;
                };

                const updatedLifetime = updateLayer(statsDoc);
                const updatedAnnual = updateLayer(annualDoc);
                const updatedSeasonal = updateLayer(seasonalDoc);

                // C. Badge Evaluation (Strictly Seasonal)
                const { updatedBadges, newlyUnlocked, tier } = evaluateBadges(txn, updatedSeasonal, updatedSeasonal.badges || {});
                updatedSeasonal.badges = updatedBadges;

                // D. Write Updates
                transaction.set(statsRef, updatedLifetime);
                transaction.set(annualRef, updatedAnnual);
                transaction.set(seasonalRef, updatedSeasonal);

                // Sync lifetime tier to root user doc for primary display
                transaction.update(userRef, { 
                    currentTier: tier,
                    lastActiveSeason: seasonId 
                });

                if (newlyUnlocked.length > 0) {
                    console.log(`Badge Unlocked for ${txn.userId}: ${newlyUnlocked.join(', ')}`);
                }
            });
        }

        // C. Create Sanitized Public Activity for Newsreel
        const uName = (txn.userNickname || txn.userName || 'Explorer').substring(0, 15);
        const bName = (txn.bizName || 'Business').substring(0, 20);
        
        await db.collection('public_activity').add({
            text: txn.type === 'purchase' 
                ? `💳 ${uName} supported ${bName}` 
                : `📍 ${uName} checked-in at ${bName}`,
            type: 'activity',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // D. Update Business-specific stats (Distributed Sharding)
        const bizShardId = Math.floor(Math.random() * NUM_BUSINESS_SHARDS).toString();
        const bizShardRef = db.collection('businesses').doc(txn.bizId).collection('shards').doc(bizShardId);
        
        const bizUpdate = {};
        if (txn.type === 'checkin') {
            if (txn.isGhost) {
                bizUpdate.ghostCheckinsCount = admin.firestore.FieldValue.increment(1);
            } else {
                bizUpdate.checkinsCount = admin.firestore.FieldValue.increment(1);
            }
        }
        
        if (Object.keys(bizUpdate).length > 0) {
            await bizShardRef.set(bizUpdate, { merge: true });
            // Mark for reconciliation (Dirty Flag)
            await db.collection('businesses').doc(txn.bizId).update({ needsReconciliation: true });
        }
        
        return null;
    } catch (e) {
        console.error("Transaction processing failed:", e);
        return null;
    }
});

// 3.1 Verification Trigger (Move Pending to Verified Stats)
exports.ontransactionupdated = onDocumentUpdated('transactions/{txnId}', async (event) => {
    try {
        const before = event.data.before.data();
        const after = event.data.after.data();

        // Triggered only when a purchase is verified by a merchant
        if (before.status === 'pending' && after.status === 'verified') {
            console.log(`Purchase verified for ${after.bizId}. Updating Verified Stats & Badges.`);
            
            const bizDoc = await db.collection('businesses').doc(after.bizId).get();
            const biz = bizDoc.exists ? bizDoc.data() : null;
            
            // 1. Calculate the verified impact increment
            let incWaste = 0;
            let incTrees = 0;
            
            if (biz) {
                let latestRev = 0; let latestWaste = 0; let latestTrees = 0;
                const assessments = Array.isArray(biz.yearlyAssessments) 
                    ? biz.yearlyAssessments : Object.values(biz.yearlyAssessments || {});

                assessments.forEach(ya => {
                    const rev = parseFloat(ya.revenue?.toString().replace(/,/g, '')) || 0;
                    if (rev > latestRev) {
                        latestRev = rev;
                        latestWaste = parseFloat(ya.wasteKg?.toString().replace(/,/g, '')) || 0;
                        latestTrees = parseFloat(ya.treesPlanted?.toString().replace(/,/g, '')) || 0;
                    }
                });

                if (latestRev > 0) {
                    const proportion = (parseFloat(after.amount) || 0) / latestRev;
                    incWaste = proportion * latestWaste;
                    incTrees = proportion * latestTrees;
                }
            }

            // 2. Update Global Shards (Distributed)
            await updateGlobalStat({
                purchases: 1,
                totalWaste: incWaste,
                totalTrees: incTrees
            });

            // 2.1 Update Business-specific counters (Distributed Sharding - Verified only)
            const bizShardId = Math.floor(Math.random() * NUM_BUSINESS_SHARDS).toString();
            const bizShardRef = db.collection('businesses').doc(after.bizId).collection('shards').doc(bizShardId);
            
            const bizCounterUpdate = {
                purchasesCount: admin.firestore.FieldValue.increment(1),
                purchaseVolume: admin.firestore.FieldValue.increment(parseFloat(after.amount) || 0)
            };
            await bizShardRef.set(bizCounterUpdate, { merge: true });
            
            // Mark for reconciliation (Dirty Flag)
            await db.collection('businesses').doc(after.bizId).update({ needsReconciliation: true });

            // 3. Securely evaluate badges and impact for the user
            if (!after.isGhost) {
                const { year, seasonId } = getSeasonContext(after.timestamp);
                const userRef = db.collection('users').doc(after.userId);
                const statsRef = userRef.collection('counters').doc('summary');
                const seasonalRef = userRef.collection('seasons').doc(seasonId);
                
                await db.runTransaction(async (transaction) => {
                    const uSnap = await transaction.get(userRef);
                    const sSnap = await transaction.get(statsRef);
                    const seasSnap = await transaction.get(seasonalRef);
                    
                    if (uSnap.exists && sSnap.exists) {
                        const stats = sSnap.data();
                        const seasonalData = seasSnap.exists ? seasSnap.data() : { totalCheckins: 0, totalPurchases: 0, badges: {} };
                        
                        // Update User's Quantified Impact (Lifetime)
                        const newWaste = (stats.totalWaste || 0) + incWaste;
                        const newTrees = (stats.totalTrees || 0) + incTrees;
                        
                        transaction.update(statsRef, { 
                            totalWaste: newWaste, 
                            totalTrees: newTrees 
                        });

                        // Update User's Quantified Impact (Seasonal)
                        const newSeasWaste = (seasonalData.totalWaste || 0) + incWaste;
                        const newSeasTrees = (seasonalData.totalTrees || 0) + incTrees;

                        // Re-evaluate Badges with the NEW verified totals (Strictly Seasonal)
                        const { updatedBadges, newlyUnlocked, tier } = evaluateBadges(
                            after, 
                            { ...seasonalData, totalWaste: newSeasWaste, totalTrees: newSeasTrees }, 
                            seasonalData.badges || {}
                        );

                        // Update Seasonal Doc
                        transaction.set(seasonalRef, { 
                            totalWaste: newSeasWaste,
                            totalTrees: newSeasTrees,
                            badges: updatedBadges,
                            lastVerified: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                        
                        // Also update root tier for display
                        transaction.update(userRef, { 
                            currentTier: tier 
                        });
                    }
                });
            }

            // 4. Final log
            console.log(`Verified impact for ${after.bizId} successfully recorded via shards.`);
            return null;
        }
    } catch (e) {
        console.error(`ERROR: ontransactionupdated failed for txn ${event.params.txnId}`, e);
    }
    return null;
});

exports.ontransactiondeleted = onDocumentDeleted('transactions/{txnId}', async (event) => {
    try {
        const txn = event.data.data();
        const updates = {};
        
        if (txn.type === 'checkin') {
            updates.checkins = admin.firestore.FieldValue.increment(-1);
        } else if (txn.type === 'purchase') {
            updates.purchases = admin.firestore.FieldValue.increment(-1);
            const amount = parseFloat(txn.amount) || 0;
            if (amount > 0) {
                updates.purchaseVolume = admin.firestore.FieldValue.increment(-amount);
            }
        }

        if (Object.keys(updates).length > 0) {
            return db.collection('system').doc('stats').set(updates, { merge: true });
        }
    } catch (e) {
        console.error(`ERROR: ontransactiondeleted failed for txn ${event.params.txnId}`, e);
    }
    return null;
});

// 4. Partitioned Role Management (Callable)
exports.managerole = functions.https.onCall(async (data, context) => {
    // 1. Verify Requester
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    const requesterEmail = context.auth.token.email;
    const isRoot = context.auth.token.isSuperAdmin === true;

    const { targetEmail, roleType, action } = data; // roleType: 'merchant' or 'compliance'
    const cleanEmail = targetEmail.trim().toLowerCase();
    const docPath = roleType === 'merchant' ? 'system/merchant_roles' : 'system/compliance_roles';

    // 2. Authorization Rules
    if (!isRoot) {
        // Platform Staff (CS) can only manage their own role type if granted specific sub-admin rights
        // (Currently strictly root-only for simplicity, but logic remains for future scalability)
        throw new functions.https.HttpsError('permission-denied', 'Only Superadmins can manage Network roles.');
    }

    // 3. Update Roles
    const roleRef = db.doc(docPath);
    const roleSnap = await roleRef.get();
    const currentList = roleSnap.data()?.emails || [];
    let updatedList;

    if (action === 'assign') {
        if (currentList.includes(cleanEmail)) return { message: 'Already assigned.' };
        updatedList = [...currentList, cleanEmail];
    } else {
        updatedList = currentList.filter(e => e !== cleanEmail);
    }

    await roleRef.set({ emails: updatedList }, { merge: true });
    
    // 4. Sync Role Flags to User Document AND Set Custom Claims (Secure Access Layer)
    const userSnap = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        const uid = userDoc.id;
        const flagField = roleType === 'merchant' ? 'isCustomerSuccess' : 'isAuditor';
        
        // Update Firestore
        await userDoc.ref.update({ [flagField]: action === 'assign' });

        // Update Auth Custom Claims (The secure layer)
        const currentClaims = (await admin.auth().getUser(uid)).customClaims || {};
        const newClaims = { 
            ...currentClaims,
            [flagField]: action === 'assign'
        };
        await admin.auth().setCustomUserClaims(uid, newClaims);
    }

    // 5. Log Action
    await db.collection('system').doc('audit_trail').collection('logs').add({
        action: `${action}_${roleType}_role`,
        target: cleanEmail,
        performedBy: requesterEmail,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});

// 4.1 Dynamic Claims Synchronization (Self-Service)
exports.syncuserclaims = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const uid = context.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found.');
    }

    const userData = userDoc.data();
    const claims = {};

    // 1. Resolve Roles from Firestore intent
    if (userData.isSuperAdmin === true) {
        claims.isSuperAdmin = true;
        claims.isAuditor = true;
        claims.isCustomerSuccess = true;
    } else {
        if (userData.isAuditor === true) claims.isAuditor = true;
        if (userData.isCustomerSuccess === true) claims.isCustomerSuccess = true;
    }

    if (Object.keys(claims).length === 0) {
        console.warn(`SYNC: No elevated roles found for user ${uid}.`);
        // If they had claims but now don't have flags in Firestore, clear them
        await admin.auth().setCustomUserClaims(uid, null);
        return { success: true, message: 'Claims cleared (no roles found).' };
    }

    console.log(`SYNC: Updating claims for user ${uid}:`, claims);
    await admin.auth().setCustomUserClaims(uid, claims);
    
    return { success: true, message: 'Your security claims have been synchronized with your profile.' };
});

// 5. Institutional Impact Aggregator
// Triggers on any business update to recalculate global totals
exports.aggregatenetworkimpact = onDocumentCreated('businesses/{bizId}', async (event) => {
    return runImpactAggregation();
});

exports.onbusinessupdated = onDocumentUpdated('businesses/{bizId}', async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    const formulaChanged = 
        JSON.stringify(before.yearlyAssessments) !== JSON.stringify(after.yearlyAssessments) ||
        before.impactJobs !== after.impactJobs;

    if (formulaChanged) {
        console.log(`Impact formula changed for ${after.id}. Triggering recount.`);
        return runImpactAggregation();
    }
    return null;
});

async function runImpactAggregation() {
    console.log('Running Scalable Global Impact Aggregation (Future-Proofed)...');
    
    try {
        // 1. High-Efficiency Global Aggregations (Index-based, not document-based)
        const [checkinAgg, ghostAgg, purchaseAgg] = await Promise.all([
            db.collection('transactions').where('type', '==', 'checkin').count().get(),
            db.collection('transactions').where('type', '==', 'checkin').where('isGhost', '==', true).count().get(),
            db.collection('transactions').where('type', '==', 'purchase').where('status', 'in', ['verified', 'approved'])
                .aggregate({
                    totalVolume: admin.firestore.AggregateField.sum('amount'),
                    totalCount: admin.firestore.AggregateField.count()
                }).get()
        ]);

        const totalCheckinsRaw = checkinAgg.data().count;
        const totalGhostCheckins = ghostAgg.data().count;
        const totalMemberCheckins = totalCheckinsRaw - totalGhostCheckins;
        const totalPurchases = purchaseAgg.data().totalCount;
        const totalVolume = purchaseAgg.data().totalVolume || 0;

        // 2. Fetch Business Data for Impact Proportions
        // We still fetch business docs as they contain the 'yearlyAssessments' formulas
        const bizSnap = await db.collection('businesses')
            .select('impactJobs', 'yearlyAssessments', 'name', 'purchaseVolume')
            .get();
        
        let totalWaste = 0;
        let totalTrees = 0;
        let totalFamilies = 0;

        // 3. Aggregate Environmental Impact based on business assessments
        bizSnap.forEach(doc => {
            const biz = doc.data();
            totalFamilies += (parseInt(biz.impactJobs) || 0);

            // Use the aggregated purchaseVolume already stored on the business doc
            const bizVolume = parseFloat(biz.purchaseVolume) || 0;

            if (bizVolume > 0) {
                let latestRev = 0; let latestWaste = 0; let latestTrees = 0;
                const assessments = Array.isArray(biz.yearlyAssessments) 
                    ? biz.yearlyAssessments : Object.values(biz.yearlyAssessments || {});

                assessments.forEach(ya => {
                    const rev = parseFloat(ya.revenue?.toString().replace(/,/g, '')) || 0;
                    if (rev > latestRev) {
                        latestRev = rev;
                        latestWaste = parseFloat(ya.wasteKg?.toString().replace(/,/g, '')) || 0;
                        latestTrees = parseFloat(ya.treesPlanted?.toString().replace(/,/g, '')) || 0;
                    }
                });

                if (latestRev > 0) {
                    const proportion = bizVolume / latestRev;
                    totalWaste += (proportion * latestWaste);
                    totalTrees += (proportion * latestTrees);
                }
            }
        });

        // 4. Update Global Stats with verified counts
        return db.collection('system').doc('stats').set({
            totalWaste: Math.round(totalWaste),
            totalTrees: Math.round(totalTrees),
            totalFamilies: totalFamilies,
            purchaseVolume: totalVolume,
            purchases: totalPurchases,
            checkins: totalMemberCheckins,
            ghostCheckins: totalGhostCheckins,
            lastAggregated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

    } catch (error) {
        console.error("Aggregation failed:", error);
        return null;
    }
}

// 6. GDPR Deletion Safeguard (Callable)
exports.deleteuseraccount = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    const uid = context.auth.uid;
    const userEmail = context.auth.token.email;

    console.log(`Starting GDPR deletion for user: ${uid}`);

    try {
        // 1. Anonymize Transactions (De-linking)
        // SAFETY GATE: We limit to 500 per run to prevent timeout. 
        // Evidence of failure will be logged if user has more than 500.
        const transSnap = await db.collection('transactions')
            .where('userId', '==', uid)
            .limit(500) 
            .get();
        
        const batch = db.batch();
        
        transSnap.forEach(doc => {
            // Irreversible Anonymization
            batch.update(doc.ref, { 
                userId: 'deleted_user',
                userName: 'Anonymized User',
                userNickname: 'Anonymized',
                userEmail: 'anonymized@thebfg.team'
            });
        });

        // 2. Delete User Announcements/Notifications
        const annSnap = await db.collection('announcements').where('targetEmail', '==', userEmail).get();
        annSnap.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 3. Delete User Profile Document
        batch.delete(db.collection('users').doc(uid));

        await batch.commit();

        // 4. Delete from Firebase Authentication (Admin SDK)
        await admin.auth().deleteUser(uid);

        console.log(`GDPR deletion successful for: ${uid}. ${transSnap.size} records anonymized.`);
        return { success: true, count: transSnap.size };
    } catch (e) {
        console.error(`CRITICAL: GDPR deletion failed for user ${uid}`, e);
        throw new functions.https.HttpsError('internal', 'Deletion failed. Support has been notified.');
    }
});

/**
 * 7. Self-Cleaning Maintenance (Future-Proofing)
 * Volume-based pruning: Keeps only the latest 50 activities.
 * Frequency: Every 1 hour to keep the collection lean and fast.
 */
exports.prunepublicactivity = onSchedule('0 * * * *', async (event) => {
    console.log("Starting hourly volume-based cleanup of activity logs...");

    try {
        // 1. Find the threshold: The timestamp of the 50th most recent activity
        const latestDocs = await db.collection('public_activity')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        if (latestDocs.size < 50) {
            console.log(`Pruning skipped: Collection size (${latestDocs.size}) below threshold.`);
            return null;
        }

        const oldestToKeep = latestDocs.docs[latestDocs.docs.length - 1];
        const thresholdTimestamp = oldestToKeep.data().timestamp;

        if (!thresholdTimestamp) {
            console.warn("Cleanup Warning: 50th document has no timestamp. Skipping run.");
            return null;
        }

        // 2. Identify all stale logs older than our fixed window
        const toPrune = await db.collection('public_activity')
            .where('timestamp', '<', thresholdTimestamp)
            .get();

        if (toPrune.empty) {
            console.log("No stale logs detected above the 50-doc window.");
            return null;
        }

        // 3. Batch delete
        const batch = db.batch();
        toPrune.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Cleanup Success: Pruned ${toPrune.size} records. Newsreel maintained at exactly 50 docs.`);
        return null;
    } catch (e) {
        // This will trigger an alert in Google Cloud Error Reporting
        console.error("CRITICAL: prunepublicactivity failed!", {
            message: e.message,
            stack: e.stack,
            timestamp: new Date().toISOString()
        });
        return null;
    }
});

// 7. Sentinel Governance (Superadmin Only)
exports.clearidentityflag = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.email !== 'jayshong@gmail.com') {
        throw new functions.https.HttpsError('permission-denied', 'Superadmin access required.');
    }
    const { targetUserId } = data;
    await db.collection('users').doc(targetUserId).update({
        isFlagged: false,
        flagReason: admin.firestore.FieldValue.delete()
    });
    return { success: true };
});

exports.resetlockout = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.email !== 'jayshong@gmail.com') {
        throw new functions.https.HttpsError('permission-denied', 'Superadmin access required.');
    }
    const { targetUserId } = data;
    await db.collection('users').doc(targetUserId).collection('sentinel').doc('state').set({
        lockoutUntil: null,
        spamAttempts: {}
    }, { merge: true });
    return { success: true };
});

// 8. Customer Intelligence & Rewards (Gratitude Bonds)
exports.creategratitudebond = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    const { targetUserId, bizId } = data;
    if (!targetUserId || !bizId) throw new functions.https.HttpsError('invalid-argument', 'User UID and Business ID required.');

    // 1. Verify merchant permissions
    const userEmail = context.auth.token.email;
    const bizDoc = await db.collection('businesses').doc(bizId).get();
    if (!bizDoc.exists) throw new functions.https.HttpsError('not-found', 'Business not found.');
    const bizData = bizDoc.data();
    
    const isOwner = bizData.ownerEmail === userEmail;
    const stewardship = bizData.stewardship || {};
    const isSteward = (stewardship.founders || []).includes(userEmail) || 
                      (stewardship.managers || []).includes(userEmail) || 
                      (stewardship.crew || []).includes(userEmail);
    
    const maSnap = await db.doc('system/merchant_roles').get();
    const isCustomerSuccess = maSnap.data()?.emails?.includes(userEmail);
    
    if (!isOwner && !isSteward && !isCustomerSuccess) {
        throw new functions.https.HttpsError('permission-denied', 'Only authorized stewards or customer success can create bonds.');
    }

    // 2. Create the Gratitude Bond
    const bondId = `${bizId}_${targetUserId}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    
    await db.collection('gratitude_bond_records').doc(bondId).set({
        bizId,
        userId: targetUserId,
        merchantEmail: userEmail,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        type: 'handshake_scan'
    });

    // 3. Log to audit trail
    await db.collection('system').doc('audit_trail').collection('logs').add({
        action: 'GRATITUDE_BOND_CREATED',
        bizId,
        targetUserId,
        performedBy: userEmail,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, expiresAt: expiresAt.toISOString() };
});

exports.getcustomerintelligence = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    const { targetUserId, bizId } = data;
    const userEmail = context.auth.token.email;

    // 1. Verify bond exists and is valid
    const bondId = `${bizId}_${targetUserId}`;
    const bondSnap = await db.collection('gratitude_bond_records').doc(bondId).get();
    
    if (!bondSnap.exists) {
        // Fallback: Check for any verified purchase history (Legitimate Interest)
        const purchaseSnap = await db.collection('transactions')
            .where('bizId', '==', bizId)
            .where('userId', '==', targetUserId)
            .where('type', '==', 'purchase')
            .where('status', '==', 'verified')
            .limit(1)
            .get();
            
        if (purchaseSnap.empty) {
            throw new functions.https.HttpsError('permission-denied', 'No active bond or purchase history found for this user.');
        }
    } else {
        const bond = bondSnap.data();
        if (bond.expiresAt.toDate() < new Date()) {
            throw new functions.https.HttpsError('permission-denied', 'Gratitude bond has expired. Please re-scan.');
        }
    }

    // 2. Fetch Aggregated Stats
    const transSnap = await db.collection('transactions')
        .where('bizId', '==', bizId)
        .where('userId', '==', targetUserId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

    let checkins = 0;
    let purchases = 0;
    let totalSpend = 0;
    const purchaseLog = [];
    const rewardsLog = [];
    let nickname = 'Explorer';

    transSnap.forEach(doc => {
        const t = doc.data();
        if (t.type === 'checkin') checkins++;
        if (t.type === 'purchase') {
            // Log ALL purchases but flag verified ones for stats
            if (t.status === 'verified') {
                purchases++;
                totalSpend += (parseFloat(t.amount) || 0);
            }
            purchaseLog.push({
                id: doc.id,
                amount: t.amount,
                status: t.status,
                receiptId: t.receiptId,
                timestamp: t.timestamp?.toDate ? t.timestamp.toDate().toISOString() : t.timestamp
            });
        }
        if (t.type === 'reward') {
            rewardsLog.push({
                id: doc.id,
                description: t.description,
                timestamp: t.timestamp?.toDate ? t.timestamp.toDate().toISOString() : t.timestamp
            });
        }
        if (t.userNickname) nickname = t.userNickname;
    });

    // 3. Determine Role for Response
    const stewardship = (await db.collection('businesses').doc(bizId).get()).data().stewardship || {};
    let role = 'crew';
    if (userEmail === (await db.collection('businesses').doc(bizId).get()).data().ownerEmail || (stewardship.founders || []).includes(userEmail)) role = 'founder';
    else if ((stewardship.managers || []).includes(userEmail)) role = 'manager';

    return {
        nickname,
        stats: { checkins, purchases, totalSpend },
        purchaseLog,
        rewardsLog,
        role // Include role to help frontend gating
    };
});

exports.grantcustomerreward = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    const { targetUserId, bizId, description } = data;
    const userEmail = context.auth.token.email;

    if (!description) throw new functions.https.HttpsError('invalid-argument', 'Reward description is required.');

    // 1. Verify merchant permissions (Founders & Managers Only)
    const bizDoc = await db.collection('businesses').doc(bizId).get();
    if (!bizDoc.exists) throw new functions.https.HttpsError('not-found', 'Business not found.');
    const bizData = bizDoc.data();
    const stewardship = bizData.stewardship || {};

    const isFounder = bizData.ownerEmail === userEmail || (stewardship.founders || []).includes(userEmail);
    const isManager = (stewardship.managers || []).includes(userEmail);

    const maSnap = await db.doc('system/merchant_roles').get();
    const isCustomerSuccess = maSnap.data()?.emails?.includes(userEmail);
    
    if (!isFounder && !isManager && !isCustomerSuccess) {
        throw new functions.https.HttpsError('permission-denied', 'Experience Crew cannot grant rewards. Please inform your Experience Manager.');
    }
    
    // 2. Record the reward transaction
    try {
        const rewardRef = db.collection('transactions').doc();
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        
        await rewardRef.set({
            type: 'reward',
            bizId,
            bizName: bizDoc.data().name,
            userId: targetUserId,
            description: description,
            timestamp: timestamp,
            status: 'verified',
            grantedBy: userEmail
        });

        // 3. Log to gratitude_bond_records
        await db.collection('gratitude_bond_records').add({
            bizId,
            userId: targetUserId,
            merchantEmail: userEmail,
            action: 'REWARD_GRANTED',
            description: description,
            timestamp: timestamp
        });

        return { success: true, rewardId: rewardRef.id };
    } catch (e) {
        console.error(`ERROR: grantcustomerreward failed for biz ${bizId} to user ${targetUserId}`, e);
        throw new functions.https.HttpsError('internal', 'Failed to grant reward.');
    }
});

exports.ghostcheckin = functions.https.onCall(async (data, context) => {
    try {
        const { bizId, ghostId } = data;
        if (!bizId || !ghostId) throw new functions.https.HttpsError('invalid-argument', 'Missing bizId or ghostId.');

        const bizDoc = await db.collection('businesses').doc(bizId).get();
        if (!bizDoc.exists) throw new functions.https.HttpsError('not-found', 'Business not found.');

        const today = new Date();
        today.setHours(0,0,0,0);

        // Check for existing check-in today
        const existing = await db.collection('transactions')
            .where('userId', '==', ghostId)
            .where('bizId', '==', bizId)
            .where('type', '==', 'checkin')
            .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(today))
            .limit(1)
            .get();

        if (!existing.empty) {
            return { 
                success: false, 
                error: 'ALREADY_CHECKED_IN', 
                message: 'Wow! You are such an enthusiastic supporter. You can support this merchant again tomorrow.' 
            };
        }

        // Create the check-in
        await db.collection('transactions').add({
            type: 'checkin',
            bizId,
            bizName: bizDoc.data().name,
            bizIndustry: bizDoc.data().industry || 'Unknown',
            bizLocation: bizDoc.data().location || 'Unknown',
            userId: ghostId,
            userNickname: 'Anonymous Supporter',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'verified',
            isGhost: true
        });

        return { success: true };
    } catch (e) {
        console.error(`ERROR: ghostcheckin failed for biz ${data.bizId}`, e);
        throw new functions.https.HttpsError('internal', 'Ghost check-in failed.');
    }
});

/**
 * SELF-HEALING: Automated Business Data Audit
 * Runs every day at 1 AM to detect and report data inconsistencies.
 */
exports.automatedbusinessaudit = onSchedule("0 1 * * *", async (event) => {
    console.log("CRON: Starting automated business audit...");
    
    try {
        const bizSnap = await db.collection('businesses').get();
        const report = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            totalBusinesses: bizSnap.size,
            flaggedBusinesses: [],
            summary: {
                missingName: 0,
                missingIndustry: 0,
                missingOwner: 0,
                missingImpactJobs: 0,
                missingAssessments: 0
            }
        };

        bizSnap.forEach(doc => {
            const data = doc.data();
            const issues = [];
            
            if (!data.name) { issues.push('missing_name'); report.summary.missingName++; }
            if (!data.industry) { issues.push('missing_industry'); report.summary.missingIndustry++; }
            if (!data.ownerEmail) { issues.push('missing_owner'); report.summary.missingOwner++; }
            if (data.impactJobs === undefined || data.impactJobs === null) { issues.push('missing_impact_jobs'); report.summary.missingImpactJobs++; }
            if (!data.yearlyAssessments || Object.keys(data.yearlyAssessments).length === 0) { issues.push('missing_assessments'); report.summary.missingAssessments++; }

            if (issues.length > 0) {
                report.flaggedBusinesses.push({
                    id: doc.id,
                    name: data.name || 'Unknown',
                    issues: issues
                });
            }
        });

        await db.collection('system').doc('audit_report').set(report);
        console.log(`CRON: Business audit complete. ${report.flaggedBusinesses.length} issues detected.`);
    } catch (e) {
        console.error("CRON: Business audit failed", e);
    }
});

/**
 * 9. Business Onboarding Application Pool
 * Allows members to apply to list their business.
 */
exports.onboardbusinessapplication = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to apply.');
    }

    const { name, address, phone, email, ownerUid } = data;
    if (!name || !address || !phone) {
        throw new functions.https.HttpsError('invalid-argument', 'Name, address, and phone are required.');
    }

    try {
        const appRef = db.collection('applications').doc();
        await appRef.set({
            name,
            address,
            phone,
            email,
            ownerUid,
            applicantUid: context.auth.uid,
            status: 'pending',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true, id: appRef.id };
    } catch (err) {
        throw new functions.https.HttpsError('internal', err.message);
    }
});

/**
 * 11. Business Onboarding: Collaborative Lifecycle
 */

// A. CS Member picks up an application
exports.assignapplication = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    const userEmail = context.auth.token.email;
    const { applicationId } = data;

    // Verify CS/Admin status
    const maSnap = await db.doc('system/merchant_roles').get();
    const isAuthorized = userEmail === 'jayshong@gmail.com' || maSnap.data()?.emails?.includes(userEmail);
    if (!isAuthorized) throw new functions.https.HttpsError('permission-denied', 'Unauthorized. Must be a Customer Success member.');

    await db.collection('applications').doc(applicationId).update({
        assignedTo: context.auth.uid,
        assignedEmail: userEmail,
        status: 'draft',
        pickedUpAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});

// B. Collaborative Update (Owner or assigned CS can edit)
exports.updateapplication = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    const { applicationId, updates } = data;

    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) throw new functions.https.HttpsError('not-found', 'Application not found.');
    
    const appData = appSnap.data();
    const isOwner = appData.ownerUid === context.auth.uid;
    const isAssignedCS = appData.assignedTo === context.auth.uid;

    if (!isOwner && !isAssignedCS) {
        throw new functions.https.HttpsError('permission-denied', 'Only the owner or assigned CS can edit.');
    }

    // Merge updates into the application's draft state
    await appRef.update({
        ...updates,
        lastEditedBy: context.auth.uid,
        lastEditedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});

// C. Final Publish (Refined from approve)
exports.publishapplication = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    const { applicationId } = data;

    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();
    const appData = appSnap.data();

    if (appData.assignedTo !== context.auth.uid && context.auth.token.email !== 'jayshong@gmail.com') {
        throw new functions.https.HttpsError('permission-denied', 'Only the assigned CS can publish.');
    }

    // Duplicate Check: Registration Number
    if (appData.registrationNumber) {
        const dupSnap = await db.collection('businesses')
            .where('registrationNumber', '==', appData.registrationNumber)
            .limit(1)
            .get();
        
        if (!dupSnap.empty) {
            throw new functions.https.HttpsError('already-exists', 'A business with this Registration Number already exists.');
        }
    }

    const onboardingCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const bizRef = db.collection('businesses').doc();

    await db.runTransaction(async (transaction) => {
        // 1. Sanitize Data Carryover (Housekeeping)
        const sanitizedBizData = {
            name: appData.name,
            registrationNumber: appData.registrationNumber || "",
            founder: appData.founder || "",
            address: appData.address,
            phone: appData.phone,
            email: appData.email,
            ownerUid: appData.ownerUid,
            industry: appData.industry,
            location: appData.location,
            impactJobs: appData.impactJobs,
            yearlyAssessments: appData.yearlyAssessments || {},
            story: appData.story || "",
            purposeStatement: appData.purposeStatement || "",
            googleMapsUrl: appData.googleMapsUrl || "",
            imageUrl: appData.imageUrl || null,
            videoUrl: appData.videoUrl || null,
            icon: appData.icon || "store"
        };

        // 2. Create live business
        transaction.set(bizRef, {
            ...sanitizedBizData,
            id: bizRef.id,
            onboardingCode,
            status: 'live',
            isVerified: true, // CS visit counts as verification
            publishedBy: context.auth.token.email,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Mark app as approved
        transaction.update(appRef, { status: 'approved', businessId: bizRef.id });

        // 4. FOUNDER SELF-REWARD: Add this biz to owner's seasonal recommended list
        const { seasonId } = getSeasonContext();
        const seasonalRef = db.collection('users').doc(appData.ownerUid).collection('seasons').doc(seasonId);
        const sSnap = await transaction.get(seasonalRef);
        
        // Use full seasonal stats for badge evaluation (Fixing scaling bug)
        const seasonalStats = sSnap.exists ? sSnap.data() : { 
            uniqueRecommendedBizIds: {},
            bizVisits: {},
            bizPurchases: {},
            totalCheckins: 0,
            totalPurchases: 0
        };
        
        seasonalStats.uniqueRecommendedBizIds = seasonalStats.uniqueRecommendedBizIds || {};
        seasonalStats.uniqueRecommendedBizIds[bizRef.id] = true;
        
        // Evaluate badges for founder (Seasonal progression)
        const userRef = db.collection('users').doc(appData.ownerUid);
        const uSnap = await transaction.get(userRef);
        const { updatedBadges, tier } = evaluateBadges({ type: 'onboarding' }, seasonalStats, seasonalStats.badges || {});

        transaction.set(seasonalRef, { 
            ...seasonalStats,
            badges: updatedBadges 
        }, { merge: true });

        // Sync latest season tier to root for display and set owner status
        transaction.update(userRef, { currentTier: tier, isOwner: true });
    });

    return { success: true, bizId: bizRef.id, code: onboardingCode };
});

/**
 * 10. Business Recommendation Claim
 * Allows a member to claim they recommended a business by providing the unique code.
 */
exports.claimbusinessrecommendation = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const { onboardingCode } = data;
    if (!onboardingCode) throw new functions.https.HttpsError('invalid-argument', 'Onboarding code required.');

    try {
        // 1. Find the business with this code
        const bizQuery = await db.collection('businesses')
            .where('onboardingCode', '==', onboardingCode)
            .limit(1)
            .get();

        if (bizQuery.empty) {
            throw new functions.https.HttpsError('not-found', 'Invalid onboarding code.');
        }

        const bizDoc = bizQuery.docs[0];
        const bizData = bizDoc.data();

        // 2. Prevent self-recommendation
        if (bizData.ownerUid === context.auth.uid) {
            throw new functions.https.HttpsError('failed-precondition', 'You cannot recommend your own business.');
        }

        // 3. Link referrer and update user stats in a transaction
        const { year, seasonId } = getSeasonContext();
        const seasonalRef = db.collection('users').doc(context.auth.uid).collection('seasons').doc(seasonId);

        await db.runTransaction(async (transaction) => {
            const sSnap = await transaction.get(seasonalRef);
            
            // Use full seasonal stats for evaluation (Housekeeping)
            const seasonalStats = sSnap.exists ? sSnap.data() : { 
                uniqueRecommendedBizIds: {},
                bizVisits: {},
                bizPurchases: {},
                totalCheckins: 0,
                totalPurchases: 0
            };
            
            seasonalStats.uniqueRecommendedBizIds = seasonalStats.uniqueRecommendedBizIds || {};
            if (seasonalStats.uniqueRecommendedBizIds[bizDoc.id]) {
                throw new Error('You have already claimed this recommendation.');
            }

            seasonalStats.uniqueRecommendedBizIds[bizDoc.id] = true;
            
            // Re-evaluate badges for the Ambassador journey (Seasonal progression)
            const userRef = db.collection('users').doc(context.auth.uid);
            
            const { updatedBadges, tier } = evaluateBadges({ type: 'claim' }, seasonalStats, seasonalStats.badges || {});

            transaction.set(seasonalRef, {
                ...seasonalStats,
                badges: updatedBadges
            }, { merge: true });

            // Sync latest season tier to root for display
            transaction.update(userRef, { currentTier: tier });
            
            // Add to the business's list of referrers (Support multiple)
            transaction.update(bizDoc.ref, { 
                referrerUids: admin.firestore.FieldValue.arrayUnion(context.auth.uid) 
            });
        });

        return { success: true, bizName: bizData.name };
    } catch (err) {
        console.error("Claim failed:", err);
        throw new functions.https.HttpsError('internal', err.message);
    }
});

/**
 * Helper: Seasonal Archiver
 */
const runSeasonArchive = async (seasonId) => {
    console.log(`SEASON ARCHIVER: Finalizing season ${seasonId}...`);
    
    // Check lock
    const lockRef = db.collection('system').doc('archival_lock');
    const lockSnap = await lockRef.get();
    if (lockSnap.exists && lockSnap.data().locked) {
        console.log("Archive skipped: Lock active.");
        return;
    }

    try {
        await lockRef.set({ locked: true, startedAt: admin.firestore.FieldValue.serverTimestamp() });

        await db.collection('system').doc('seasons').collection('history').doc(seasonId).set({
            status: 'closed',
            closedAt: admin.firestore.FieldValue.serverTimestamp(),
            archived: true
        }, { merge: true });

        let lastDoc = null;
        let totalArchived = 0;

        while (true) {
            let query = db.collection('users')
                .where('lastActiveSeason', '==', seasonId)
                .limit(400);
            
            if (lastDoc) query = query.startAfter(lastDoc);
            
            const snap = await query.get();
            if (snap.empty) break;

            const batch = db.batch();
            for (const userDoc of snap.docs) {
                const uid = userDoc.id;
                const seasonalRef = db.collection('users').doc(uid).collection('seasons').doc(seasonId);
                const seasonalSnap = await seasonalRef.get();
                
                if (seasonalSnap.exists) {
                    const seasonalData = seasonalSnap.data();
                    const badges = seasonalData.badges || {};
                    const unlockedBadgeCount = Object.keys(badges).length;

                    if (unlockedBadgeCount > 0) {
                        const trophy = {
                            seasonId: seasonId,
                            count: unlockedBadgeCount,
                            tier: userDoc.data().currentTier || 'Blue',
                            archivedAt: new Date().toISOString()
                        };

                        batch.update(userDoc.ref, {
                            achievements: admin.firestore.FieldValue.arrayUnion(trophy),
                            badges: {}
                        });
                        batch.update(seasonalRef, { isArchived: true });
                        totalArchived++;
                    }
                }
            }
            
            await batch.commit();
            lastDoc = snap.docs[snap.docs.length - 1];
        }

        console.log(`SEASON ARCHIVER: Finished. Total archived: ${totalArchived}`);
    } finally {
        await lockRef.set({ locked: false });
    }
};

/**
 * 9. Initiative Attendance Tracking (Phase 5.4)
 * Records participation in physical initiatives via QR scans.
 */
exports.recordinitiativeattendance = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const { initiativeId } = data;
    if (!initiativeId) throw new functions.https.HttpsError('invalid-argument', 'Initiative ID required.');

    const uid = context.auth.uid;
    const today = new Date().toISOString().split('T')[0];
    const { seasonId } = getSeasonContext();

    try {
        const initRef = db.collection('initiatives').doc(initiativeId);
        const userSeasRef = db.collection('users').doc(uid).collection('seasons').doc(seasonId);
        const attendanceRef = userSeasRef.collection('attendance').doc(`${today}_${initiativeId}`);

        // 1. Check for double-attendance today
        const attSnap = await attendanceRef.get();
        if (attSnap.exists) {
            return { success: true, message: 'Attendance already recorded for today.' };
        }

        const initSnap = await initRef.get();
        if (!initSnap.exists) throw new functions.https.HttpsError('not-found', 'Initiative not found.');

        // 2. Atomic Update
        await db.runTransaction(async (transaction) => {
            // Update Initiative Count
            transaction.update(initRef, { 
                totalAttendance: admin.firestore.FieldValue.increment(1),
                lastAttendanceAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Update User Seasonal Stats
            transaction.set(userSeasRef, {
                totalAttendance: admin.firestore.FieldValue.increment(1)
            }, { merge: true });

            // Record this specific attendance instance
            transaction.set(attendanceRef, {
                initiativeId,
                initiativeTitle: initSnap.data().title || 'Unnamed Initiative',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                date: today
            });

            // Update Global Stats (Sharded for high frequency launch events)
            await updateGlobalStat({ 
                initiativeParticipation: 1 
            }, transaction);
        });

        console.log(`Attendance recorded for user ${uid} at initiative ${initiativeId}`);
        return { success: true };
    } catch (err) {
        console.error("Attendance recording failed:", err);
        throw new functions.https.HttpsError('internal', err.message);
    }
});
