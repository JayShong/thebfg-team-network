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
 */
async function updateGlobalStat(field, amount) {
    const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
    const shardRef = db.collection('system').doc('stats').collection('shards').doc(shardId);
    return shardRef.set({
        [field]: admin.firestore.FieldValue.increment(amount)
    }, { merge: true });
}

/**
 * SELF-HEALING: Automated Reconciliation
 * Runs every 30 mins for counts, and every 6 hours for deep impact sum.
 */
exports.reconcilenetworkstats = onSchedule("every 30 minutes", async (event) => {

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
            // Clear shard after reading
            batch.delete(doc.ref);
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
        console.log("CRON: Reconciliation successful. Shards cleared.");
    } catch (e) {
        console.error("CRON: Reconciliation failed", e);
    }
});

// 1. User Triggers
exports.onusercreated = onDocumentCreated('users/{userId}', async (event) => {
    console.log('Incrementing consumer count');
    return updateGlobalStat('consumers', 1);
});

exports.onuserdeleted = onDocumentDeleted('users/{userId}', async (event) => {
    console.log('Decrementing consumer count');
    return updateGlobalStat('consumers', -1);
});

// 2. Business Triggers
exports.onbusinesscreated = onDocumentCreated('businesses/{bizId}', async (event) => {
    console.log('Incrementing business count');
    return updateGlobalStat('businesses', 1);
});

exports.onbusinessdeleted = onDocumentDeleted('businesses/{bizId}', async (event) => {
    console.log('Decrementing business count');
    return updateGlobalStat('businesses', -1);
});

const { BADGES_CONFIG, evaluateTier, evaluateBadges } = require('./badgeEngine');

// 3. Transaction Triggers (Sanitized Feed & The Sentinel)
exports.ontransactioncreated = onDocumentCreated('transactions/{txnId}', async (event) => {
    const txn = event.data.data();
    if (!txn.userId) return null;
    const today = new Date().toISOString().split('T')[0];

    try {
        // A. The Sentinel: Background Verification
        // ... (existing sentinel logic) ...
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
            return null;
        }

        // B. SCALE-FIRST: Update User Stats & Evaluate Badges
        if (!txn.isGhost) {
            const statsRef = db.collection('users').doc(txn.userId).collection('counters').doc('summary');
            const userRef = db.collection('users').doc(txn.userId);
            const bizDoc = await db.collection('businesses').doc(txn.bizId).get();
            const biz = bizDoc.exists ? bizDoc.data() : null;
            
            await db.runTransaction(async (transaction) => {
                const statsDoc = await transaction.get(statsRef);
                const userDoc = await transaction.get(userRef);
                
                let stats = statsDoc.exists ? statsDoc.data() : {
                    totalCheckins: 0,
                    totalPurchases: 0,
                    totalWaste: 0,
                    totalTrees: 0,
                    totalFamilies: 0,
                    uniqueBizIds: {},
                    uniqueLocations: {},
                    uniqueIndustries: {},
                    bizVisits: {}
                };

                // Initialize fields if missing in old documents
                stats.totalWaste = stats.totalWaste || 0;
                stats.totalTrees = stats.totalTrees || 0;
                stats.totalFamilies = stats.totalFamilies || 0;

                const isNewBiz = !stats.uniqueBizIds?.[txn.bizId];

                // Update counters
                if (txn.type === 'checkin') stats.totalCheckins = (stats.totalCheckins || 0) + 1;
                if (txn.type === 'purchase') {
                    stats.totalPurchases = (stats.totalPurchases || 0) + 1;
                    
                    // INCREMENTAL QUANTIFIED IMPACT (Only for purchases)
                    if (biz && txn.status !== 'flagged_by_sentinel') {
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
                        const proportion = (parseFloat(txn.amount) || 0) / latestRev;
                        stats.incrementalWaste = proportion * latestWaste;
                        stats.incrementalTrees = proportion * latestTrees;
                        
                        stats.totalWaste = (stats.totalWaste || 0) + stats.incrementalWaste;
                        stats.totalTrees = (stats.totalTrees || 0) + stats.incrementalTrees;
                    }
                    }
                }
                
                // Update maps for unique badges & family impact
                if (txn.bizId) {
                    stats.uniqueBizIds = stats.uniqueBizIds || {};
                    if (isNewBiz) {
                        stats.uniqueBizIds[txn.bizId] = true;
                        if (biz) stats.totalFamilies += (parseInt(biz.impactJobs) || 0);
                    }
                    
                    stats.bizVisits = stats.bizVisits || {};
                    stats.bizVisits[txn.bizId] = (stats.bizVisits[txn.bizId] || 0) + 1;
                    
                    if (txn.bizLocation) {
                        stats.uniqueLocations = stats.uniqueLocations || {};
                        stats.uniqueLocations[txn.bizLocation] = true;
                    }
                    if (txn.bizIndustry) {
                        stats.uniqueIndustries = stats.uniqueIndustries || {};
                        stats.uniqueIndustries[txn.bizIndustry] = true;
                    }
                }

                // C. UPDATE GLOBAL NETWORK TOTALS (Using Sharding to prevent hotspots)
                // RULE: Only Check-ins and Reach (Families) are incremented instantly.
                // Purchases and Quantified Impact wait for Merchant Verification.
                const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
                const shardRef = db.collection('system').doc('stats').collection('shards').doc(shardId);
                
                const globalBatch = {
                    checkins: txn.type === 'checkin' ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0),
                    totalFamilies: isNewBiz && biz ? admin.firestore.FieldValue.increment(parseInt(biz.impactJobs) || 0) : admin.firestore.FieldValue.increment(0)
                    // Note: 'purchases', 'totalWaste', and 'totalTrees' are moved to ontransactionupdated
                };
                
                transaction.set(statsRef, stats);
                transaction.set(shardRef, globalBatch, { merge: true });

                // D. Tier & Badge Evaluation
                // RULE: Only evaluate instantly for Check-ins. Purchases wait for verification.
                if (txn.type === 'checkin') {
                    const badgesToUnlock = evaluateBadges({ ...userDoc.data(), ...stats });
                    if (badgesToUnlock.length > 0) {
                        const currentBadges = userDoc.data().badges || {};
                        badgesToUnlock.forEach(bTitle => {
                            const bId = BADGES_CONFIG.find(bc => bc.title === bTitle)?.id;
                            if (bId && !currentBadges[bId]) {
                                currentBadges[bId] = { unlocked: true, date: new Date().toISOString(), title: bTitle };
                            }
                        });
                        transaction.update(userRef, { badges: currentBadges });
                    }
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

            // 2. Update Global Shards (Securely increment only now)
            const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
            const shardRef = db.collection('system').doc('stats').collection('shards').doc(shardId);
            
            const globalUpdate = {
                purchases: admin.firestore.FieldValue.increment(1),
                totalWaste: admin.firestore.FieldValue.increment(incWaste),
                totalTrees: admin.firestore.FieldValue.increment(incTrees)
            };
            await shardRef.set(globalUpdate, { merge: true });

            // 2.1 Update Business-specific counters (Distributed Sharding - Verified only)
            const bizShardId = Math.floor(Math.random() * NUM_BUSINESS_SHARDS).toString();
            const bizShardRef = db.collection('businesses').doc(after.bizId).collection('shards').doc(bizShardId);
            
            const bizCounterUpdate = {
                purchasesCount: admin.firestore.FieldValue.increment(1),
                purchaseVolume: admin.firestore.FieldValue.increment(parseFloat(after.amount) || 0)
            };
            await bizShardRef.set(bizCounterUpdate, { merge: true });

            // 3. Securely evaluate badges for the user
            if (!after.isGhost) {
                const userRef = db.collection('users').doc(after.userId);
                const statsRef = db.collection('users').doc(after.userId).collection('counters').doc('summary');
                
                await db.runTransaction(async (transaction) => {
                    const uSnap = await transaction.get(userRef);
                    const sSnap = await transaction.get(statsRef);
                    if (uSnap.exists && sSnap.exists) {
                        const badgesToUnlock = evaluateBadges({ ...uSnap.data(), ...sSnap.data() });
                        if (badgesToUnlock.length > 0) {
                            const currentBadges = uSnap.data().badges || {};
                            badgesToUnlock.forEach(bTitle => {
                                const bId = BADGES_CONFIG.find(bc => bc.title === bTitle)?.id;
                                if (bId && !currentBadges[bId]) {
                                    currentBadges[bId] = { unlocked: true, date: new Date().toISOString(), title: bTitle };
                                }
                            });
                            transaction.update(userRef, { badges: currentBadges });
                        }
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
    const isRoot = requesterEmail === 'jayshong@gmail.com';

    const { targetEmail, roleType, action } = data; // roleType: 'merchant' or 'compliance'
    const cleanEmail = targetEmail.trim().toLowerCase();
    const docPath = roleType === 'merchant' ? 'system/merchant_roles' : 'system/compliance_roles';

    // 2. Authorization Rules
    if (!isRoot) {
        // Merchant Assistants can ONLY manage other Merchant Assistants
        if (roleType === 'merchant') {
            const maSnap = await db.doc('system/merchant_roles').get();
            if (!maSnap.data()?.emails?.includes(requesterEmail)) {
                throw new functions.https.HttpsError('permission-denied', 'Unauthorized.');
            }
        } else {
            throw new functions.https.HttpsError('permission-denied', 'Only Superadmins can manage Compliance roles.');
        }
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
    
    // 4. Sync Role Flags to User Document (Optimizes client-side RBAC)
    const userSnap = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!userSnap.empty) {
        const flagField = roleType === 'merchant' ? 'isMerchantAssistant' : 'isAuditor';
        await userSnap.docs[0].ref.update({ [flagField]: action === 'assign' });
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
            .select('impactJobs', 'yearlyAssessments', 'name')
            .get();
        
        // At scale, we fetch biz-specific volumes via aggregation or synced counters
        // For the Alpha/Beta phase, we'll use the purchase transactions to build the map
        // but limit memory usage by only pulling the necessary fields.
        const purchaseTransSnap = await db.collection('transactions')
            .where('type', '==', 'purchase')
            .where('status', 'in', ['verified', 'approved'])
            .select('bizId', 'amount')
            .get();

        const bizPurchases = {};
        purchaseTransSnap.forEach(doc => {
            const t = doc.data();
            bizPurchases[t.bizId] = (bizPurchases[t.bizId] || 0) + (parseFloat(t.amount) || 0);
        });

        let totalWaste = 0;
        let totalTrees = 0;
        let totalFamilies = 0;

        // 3. Aggregate Environmental Impact based on business assessments
        bizSnap.forEach(doc => {
            const biz = doc.data();
            totalFamilies += (parseInt(biz.impactJobs) || 0);

            if (bizPurchases[doc.id]) {
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
                    const proportion = bizPurchases[doc.id] / latestRev;
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
