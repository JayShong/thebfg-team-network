const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Standard V2 Global Options
setGlobalOptions({ region: 'us-central1' });

/**
 * 0. UNIVERSAL ACCESS PROVISIONING (V2)
 * This trigger is the server-side authority that populates new users.
 */
exports.onusercreated = onDocumentCreated('users/{userId}', async (event) => {
    const userData = event.data.data();
    
    // Only provision if it's a fresh, un-provisioned document
    if (userData && !userData.isProvisioned) {
        console.log(`AUTH: Provisioning stats for user ${event.params.userId}`);
        
        const provisionedData = {
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            checkins: 0,
            purchases: 0,
            badges: {},
            isSuperAdmin: false,
            isAuditor: false,
            isCustomerSuccess: false,
            currentTier: { name: 'Seed', badgeCount: 0 },
            isProvisioned: true
        };

        return event.data.ref.set(provisionedData, { merge: true });
    }
    
    // Update global consumer count
    const shardId = Math.floor(Math.random() * 10).toString();
    return db.collection('system').doc('stats').collection('shards').doc(shardId)
        .set({ consumers: admin.firestore.FieldValue.increment(1) }, { merge: true });
});

/**
 * SELF-HEALING: Automated Reconciliation (V2)
 * Aggregates global network impact from the transactions ledger.
 */
exports.reconcilenetworkstats = onSchedule('every 5 minutes', async (event) => {
    try {
        const [uCount, bCount, tCheckins, tPurchases, gCheckins] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('businesses').count().get(),
            db.collection('transactions').where('type', '==', 'checkin').count().get(),
            db.collection('transactions').where('type', '==', 'purchase').count().get(),
            db.collection('transactions').where('type', '==', 'checkin').where('isGhost', '==', true).count().get()
        ]);

        const ghostCheckinsCount = gCheckins.data().count;
        const totalCheckinsCount = tCheckins.data().count;
        const memberCheckinsCount = totalCheckinsCount - ghostCheckinsCount;

        return db.collection('system').doc('stats').set({
            consumers: uCount.data().count,
            businesses: bCount.data().count,
            checkins: memberCheckinsCount,
            purchases: tPurchases.data().count,
            ghostCheckins: ghostCheckinsCount,
            lastAutoReconcile: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (e) { console.error(e); }
});



/**
 * ROLE MANAGEMENT (V2 Callables)
 */
exports.managerole = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { targetEmail, roleType, action } = request.data;
    const cleanEmail = targetEmail.trim().toLowerCase();
    const userSnap = await db.collection('users').where('email', '==', cleanEmail).get();
    if (!userSnap.empty) {
        const uid = userSnap.docs[0].id;
        const flagField = roleType === 'merchant' ? 'isCustomerSuccess' : 'isAuditor';
        await userSnap.docs[0].ref.update({ [flagField]: action === 'assign' });
        const currentClaims = (await admin.auth().getUser(uid)).customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...currentClaims, [flagField]: action === 'assign' });
    }
    return { success: true };
});

exports.syncuserclaims = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const uid = request.auth.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) throw new HttpsError('not-found', 'User profile not found.');
    const userData = userDoc.data();
    const claims = {};
    if (userData.isSuperAdmin) {
        claims.isSuperAdmin = true; claims.isAuditor = true; claims.isCustomerSuccess = true;
    } else {
        if (userData.isAuditor) claims.isAuditor = true;
        if (userData.isCustomerSuccess) claims.isCustomerSuccess = true;
    }
    await admin.auth().setCustomUserClaims(uid, claims);
    return { success: true };
});

exports.deleteuseraccount = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
    const uid = request.auth.uid;
    await db.collection('users').doc(uid).delete();
    await admin.auth().deleteUser(uid);
    return { success: true };
});

/**
 * GUEST FLOW: Ghost Activity Bridges
 */
exports.ghostcheckin = onCall(async (request) => {
    const { bizId, ghostId } = request.data;
    if (!bizId || !ghostId) throw new HttpsError('invalid-argument', 'bizId and ghostId are required.');

    const today = new Date().toISOString().split('T')[0];
    const sessionRef = db.collection('ghost_sessions').doc(ghostId);
    const sessionSnap = await sessionRef.get();

    // 1. GHOST SENTINEL: Anti-Spam Check
    if (sessionSnap.exists) {
        const sessionData = sessionSnap.data();
        if (sessionData.lastCheckins && sessionData.lastCheckins[bizId] === today) {
            throw new HttpsError('resource-exhausted', 'Wow! You are such an enthusiastic supporter. You can support this merchant again tomorrow.');
        }
    }

    const bizDoc = await db.collection('businesses').doc(bizId).get();
    if (!bizDoc.exists) throw new HttpsError('not-found', 'Business not found.');
    const bizData = bizDoc.data();

    const batch = db.batch();
    const txnRef = db.collection('transactions').doc();
    
    batch.set(txnRef, {
        type: 'checkin',
        bizId,
        bizName: bizData.name,
        bizIndustry: bizData.industry || 'Unknown',
        bizLocation: bizData.location || 'Unknown',
        userId: ghostId,
        userNickname: 'Guest Supporter',
        isGhost: true,
        status: 'verified',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. High-Performance Sharded Counter for Business
    const shardId = Math.floor(Math.random() * 10).toString();
    const bizShardRef = db.collection('businesses').doc(bizId).collection('shards').doc(shardId);
    batch.set(bizShardRef, {
        checkinsCount: admin.firestore.FieldValue.increment(1),
        ghostCheckinsCount: admin.firestore.FieldValue.increment(1)
    }, { merge: true });

    // 3. Gratitude Bond & DISCOVERY STATS (For Badge Sync)
    const ghostRef = db.collection('users').doc(ghostId);
    batch.set(ghostRef.collection('gratitude_bonds').doc(bizId), {
        bizId,
        bizName: bizData.name,
        totalCheckins: admin.firestore.FieldValue.increment(1),
        lastVisit: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Update ephemeral session for sentinel tracking
    batch.set(sessionRef, {
        lastCheckins: { [bizId]: today },
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Track Discovery Stats on the virtual user doc for badge evaluation
    // Note: The pulseengine_broadcast trigger will handle the primary counter increment.
    if (bizData.industry) {
        // We still initialize the doc here for the virtual ghost user
        batch.set(ghostRef, { lastActivity: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    await batch.commit();
    return { success: true, message: 'Ghost Check-in recorded.' };
});

exports.ghostpurchase = onCall(async (request) => {
    const { bizId, ghostId, amount, receiptId } = request.data;
    if (!bizId || !ghostId || !amount || !receiptId) throw new HttpsError('invalid-argument', 'Missing required fields.');
    
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) throw new HttpsError('invalid-argument', 'Invalid amount.');

    const today = new Date().toISOString().split('T')[0];
    const sessionRef = db.collection('ghost_sessions').doc(ghostId);

    const bizDoc = await db.collection('businesses').doc(bizId).get();
    if (!bizDoc.exists) throw new HttpsError('not-found', 'Business not found.');
    const bizData = bizDoc.data();

    const batch = db.batch();
    const txnRef = db.collection('transactions').doc();

    batch.set(txnRef, {
        type: 'purchase',
        bizId,
        bizName: bizData.name,
        bizIndustry: bizData.industry || 'Unknown',
        bizLocation: bizData.location || 'Unknown',
        userId: ghostId,
        userNickname: 'Guest Supporter',
        isGhost: true,
        amount: finalAmount,
        receiptId,
        status: 'pending',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // High-Performance Sharded Counter for Business
    const shardId = Math.floor(Math.random() * 10).toString();
    const bizShardRef = db.collection('businesses').doc(bizId).collection('shards').doc(shardId);
    batch.set(bizShardRef, {
        purchasesCount: admin.firestore.FieldValue.increment(1),
        ghostPurchasesCount: admin.firestore.FieldValue.increment(1),
        purchaseVolume: admin.firestore.FieldValue.increment(finalAmount)
    }, { merge: true });

    const ghostRef = db.collection('users').doc(ghostId);
    batch.set(ghostRef.collection('gratitude_bonds').doc(bizId), {
        bizId,
        bizName: bizData.name,
        totalPurchases: admin.firestore.FieldValue.increment(1),
        lastVisit: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Update ephemeral session for sentinel tracking (Purchases don't have a daily limit but we track activity)
    batch.set(sessionRef, {
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();
    return { success: true, message: 'Ghost Purchase recorded.' };
});

/**
 * PULSE ENGINE: Automated Broadcasting, Stats Rebalancing & Discovery Tracking
 * This trigger is the central authority for all economic signals.
 * It handles newsreel broadcasting, user counter increments, and discovery stats.
 */
exports.pulseengine_broadcast = onDocumentCreated('transactions/{txnId}', async (event) => {
    const txn = event.data.data();
    if (!txn) return;

    const bizName = txn.bizName || 'a business';
    const nickname = txn.isGhost ? 'A guest' : (txn.userNickname || 'Someone');
    const userId = txn.userId;
    const type = txn.type;
    const industry = txn.bizIndustry;
    const bizId = txn.bizId;

    // 1. NEWSREEL BROADCAST
    let pulseText = '';
    if (type === 'checkin') {
        pulseText = `📍 ${nickname} checked-in at ${bizName}`;
    } else if (type === 'purchase') {
        pulseText = `💳 ${nickname} supported ${bizName}`;
    }

    const broadcastPromise = pulseText ? db.collection('public_activity').add({
        text: pulseText,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: type
    }) : Promise.resolve();

    // 2. USER PROFILE HYDRATION (Discovery Stats & Counters)
    // This solves the "Badge Level" problem by centralizing discovery metrics.
    const userUpdatePromise = (userId && industry && bizId) ? (async () => {
        const userRef = db.collection('users').doc(userId);
        const subCat = type === 'checkin' ? 'seen' : 'valued';
        const discoveryField = `sectorMetrics.${industry}.${subCat}.${bizId}`;
        const counterField = type === 'checkin' ? 'checkins' : 'purchases';

        await userRef.set({
            [discoveryField]: true,
            [counterField]: admin.firestore.FieldValue.increment(1),
            lastActivity: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    })() : Promise.resolve();

    return Promise.all([broadcastPromise, userUpdatePromise]);
});

exports.pulseengine_cleanup = onSchedule('every 1 hours', async (event) => {
    const snapshot = await db.collection('public_activity')
        .orderBy('timestamp', 'desc')
        .offset(50)
        .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
});

exports.claimghostactivity = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
    const { ghostId } = request.data;
    const uid = request.auth.uid;

    if (!ghostId) throw new HttpsError('invalid-argument', 'ghostId is required.');

    // 1. Retrieve all ghost transactions & gratitude bonds
    const [txnSnap, bondSnap] = await Promise.all([
        db.collection('transactions').where('userId', '==', ghostId).get(),
        db.collection('users').doc(ghostId).collection('gratitude_bonds').get()
    ]);

    if (txnSnap.empty && bondSnap.empty) return { success: true, count: 0 };

    const batch = db.batch();
    let checkins = 0;
    let purchases = 0;
    const bizStatsMigration = {}; // bizId -> { ghostCheckins, ghostPurchases }

    // Migrate Transactions
    txnSnap.forEach(doc => {
        const data = doc.data();
        batch.update(doc.ref, {
            userId: uid,
            isGhost: false,
            userNickname: 'Explorer'
        });

        if (!bizStatsMigration[data.bizId]) {
            bizStatsMigration[data.bizId] = { ghostCheckins: 0, ghostPurchases: 0 };
        }

        if (data.type === 'checkin') {
            checkins++;
            bizStatsMigration[data.bizId].ghostCheckins++;
        }
        if (data.type === 'purchase') {
            purchases++;
            bizStatsMigration[data.bizId].ghostPurchases++;
        }
    });

    // Update Business Stats (Decrement Ghost counters)
    Object.entries(bizStatsMigration).forEach(([bizId, stats]) => {
        // We decrement from shard 0 to ensure consistency (total remains correct)
        const bizShardRef = db.collection('businesses').doc(bizId).collection('shards').doc('0');
        batch.set(bizShardRef, {
            ghostCheckinsCount: admin.firestore.FieldValue.increment(-stats.ghostCheckins),
            ghostPurchasesCount: admin.firestore.FieldValue.increment(-stats.ghostPurchases)
        }, { merge: true });
    });

    // Migrate Gratitude Bonds
    bondSnap.forEach(doc => {
        const data = doc.data();
        const memberBondRef = db.collection('users').doc(uid).collection('gratitude_bonds').doc(doc.id);
        batch.set(memberBondRef, data, { merge: true });
        batch.delete(doc.ref); // Cleanup ghost bond
    });

    // 2. Update user profile stats
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
        checkins: admin.firestore.FieldValue.increment(checkins),
        purchases: admin.firestore.FieldValue.increment(purchases)
    }, { merge: true });

    await batch.commit();
    return { success: true, count: txnSnap.size };
});


