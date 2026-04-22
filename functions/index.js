const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
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
