const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const functions = require('firebase-functions');
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Set global options to use us-central1 (or your preferred region)
setGlobalOptions({ region: 'us-central1' });

/**
 * Helper to update the global stats document
 */
async function updateGlobalStat(field, amount) {
    const statsRef = db.collection('system').doc('stats');
    return statsRef.set({
        [field]: admin.firestore.FieldValue.increment(amount)
    }, { merge: true });
}

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

const { BADGES_CONFIG, evaluateTier } = require('./badgeEngine');

// 3. Transaction Triggers (Sanitized Feed & The Sentinel)
exports.ontransactioncreated = onDocumentCreated('transactions/{txnId}', async (event) => {
    const txn = event.data.data();
    if (!txn.userId) return null;
    const today = new Date().toISOString().split('T')[0];

    try {
        // A. The Sentinel: Background Verification
        // Check for 1-per-day limit violation for this business
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
            await db.collection('users').doc(txn.userId).update({ 
                isFlagged: true,
                flagReason: `Daily limit bypass at ${txn.bizName || txn.bizId}`
            });
            // Mark transaction as suspect
            await event.data.ref.update({ status: 'flagged_by_sentinel' });
            return null;
        }

        // B. Create Sanitized Public Activity for Newsreel
        const uName = (txn.userNickname || txn.userName || 'Explorer').substring(0, 15);
        const bName = (txn.bizName || 'Business').substring(0, 20);
        
        await db.collection('public_activity').add({
            text: txn.type === 'purchase' 
                ? `💳 ${uName} supported ${bName}` 
                : `📍 ${uName} checked-in at ${bName}`,
            type: 'activity',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // C. Trigger Global Impact Aggregation
        return runImpactAggregation();
    } catch (e) {
        console.error("Sentinel processing failed:", e);
        return null;
    }
});

exports.ontransactiondeleted = onDocumentDeleted('transactions/{txnId}', async (event) => {
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
    return runImpactAggregation();
});

async function runImpactAggregation() {
    console.log('Running Global Impact Aggregation...');
    const bizSnap = await db.collection('businesses').get();
    const transSnap = await db.collection('transactions').where('type', '==', 'purchase').get();

    let totalWaste = 0;
    let totalTrees = 0;
    let totalFamilies = 0;
    let totalVolume = 0;

    // 1. Calculate Global Purchase Volume and proportions
    const bizPurchases = {};
    transSnap.forEach(doc => {
        const t = doc.data();
        if (t.status === 'verified' || t.status === 'approved') {
            const amount = parseFloat(t.amount) || 0;
            totalVolume += amount;
            bizPurchases[t.bizId] = (bizPurchases[t.bizId] || 0) + amount;
        }
    });

    // 2. Aggregate Impact based on business assessments
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

    // 3. Update Global Stats
    return db.collection('system').doc('stats').set({
        totalWaste: Math.round(totalWaste),
        totalTrees: Math.round(totalTrees),
        totalFamilies: totalFamilies,
        purchaseVolume: totalVolume
    }, { merge: true });
}

// 6. GDPR Deletion Safeguard (Callable)
exports.deleteuseraccount = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    const uid = context.auth.uid;
    const userEmail = context.auth.token.email;

    console.log(`Starting GDPR deletion for user: ${uid}`);

    try {
        // 1. Anonymize Transactions (De-linking)
        const transSnap = await db.collection('transactions').where('userId', '==', uid).get();
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

        // 4. Commit Firestore changes
        await batch.commit();

        // 5. Delete from Firebase Authentication (Admin SDK)
        await admin.auth().deleteUser(uid);

        console.log(`GDPR deletion successful for: ${uid}`);
        return { success: true };
    } catch (error) {
        console.error('GDPR deletion failed:', error);
        throw new functions.https.HttpsError('internal', 'Deletion process failed. Please contact support.');
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
