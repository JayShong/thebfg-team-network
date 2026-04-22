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

// 3. Transaction Triggers (Check-ins & Purchases + Badge Engine)
exports.ontransactioncreated = onDocumentCreated('transactions/{txnId}', async (event) => {
    const txn = event.data.data();
    const userId = txn.userId;
    if (!userId) return null;

    const statsUpdates = {};
    
    // A. Update Global Stats
    if (txn.type === 'checkin') {
        statsUpdates.checkins = admin.firestore.FieldValue.increment(1);
    } else if (txn.type === 'purchase') {
        statsUpdates.purchases = admin.firestore.FieldValue.increment(1);
        const amount = parseFloat(txn.amount) || 0;
        if (amount > 0) {
            statsUpdates.purchaseVolume = admin.firestore.FieldValue.increment(amount);
        }
    }

    if (Object.keys(statsUpdates).length > 0) {
        await db.collection('system').doc('stats').set(statsUpdates, { merge: true });
    }

    // B. Badge & Tier Engine Evaluation
    try {
        const userRef = db.collection('users').doc(userId);
        const [userDoc, transSnap] = await Promise.all([
            userRef.get(),
            db.collection('transactions').where('userId', '==', userId).get()
        ]);

        if (!userDoc.exists) return null;

        const userData = userDoc.data();
        const logs = transSnap.docs.map(doc => doc.data());
        const currentBadges = userData.badges || {};
        const newlyUnlocked = [];

        // Check each badge condition
        BADGES_CONFIG.forEach(badge => {
            if (!currentBadges[badge.id] && badge.condition(userData, logs)) {
                currentBadges[badge.id] = {
                    unlocked: true,
                    date: new Date().toISOString(),
                    title: badge.title
                };
                newlyUnlocked.push(badge);
            }
        });

        if (newlyUnlocked.length > 0) {
            const newTier = evaluateTier(currentBadges);
            const userUpdates = { badges: currentBadges };
            
            if (newTier !== userData.tier) {
                userUpdates.tier = newTier;
                // Add tier upgrade announcement
                await db.collection('announcements').add({
                    message: `Incredible! You have ascended to the ${newTier} Tier. Your commitment to the empathy economy is recognized.`,
                    type: 'success',
                    status: 'active',
                    targetEmail: userData.email,
                    createdAt: new Date().toISOString()
                });
            }

            await userRef.update(userUpdates);

            // Notify for each new badge
            for (const badge of newlyUnlocked) {
                await db.collection('announcements').add({
                    message: `Badge Unlocked: "${badge.title}"! You earned this for being a ${badge.category} contributor to the network.`,
                    type: 'badge',
                    status: 'active',
                    targetEmail: userData.email,
                    createdAt: new Date().toISOString()
                });
            }
        }
    } catch (e) {
        console.error("Badge Engine Error:", e);
    }

    return null;
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

// 4. Role Management Safeguard (Callable)
exports.managerole = functions.https.onCall(async (data, context) => {
    // 1. Verify Requester is Admin
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required.');
    
    const adminSnap = await db.collection('system').doc('roles').get();
    const adminEmails = adminSnap.data()?.isAdmin || [];
    const rootAdmin = 'jayshong@gmail.com';
    
    if (context.auth.token.email !== rootAdmin && !adminEmails.includes(context.auth.token.email)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can manage roles.');
    }

    const { targetEmail, roleField, action } = data;
    const cleanEmail = targetEmail.trim().toLowerCase();

    // 2. Safeguard: Verify User Exists
    const userSnap = await db.collection('users').where('email', '==', cleanEmail).get();
    if (userSnap.empty) {
        throw new functions.https.HttpsError('not-found', `No registered user found with email ${cleanEmail}.`);
    }

    // 3. Update Roles
    const currentList = adminSnap.data()?.[roleField] || [];
    let updatedList;

    if (action === 'assign') {
        if (currentList.includes(cleanEmail)) return { message: 'Already assigned.' };
        updatedList = [...currentList, cleanEmail];
    } else {
        updatedList = currentList.filter(e => e !== cleanEmail);
    }

    await db.collection('system').doc('roles').update({ [roleField]: updatedList });
    
    // 4. Log Action
    await db.collection('system').doc('audit_trail').collection('logs').add({
        action: `${action}_role`,
        target: cleanEmail,
        role: roleField,
        performedBy: context.auth.token.email,
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
