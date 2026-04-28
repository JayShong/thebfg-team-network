const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Standard V2 Global Options
setGlobalOptions({ region: 'us-central1' });

/**
 * UTILS: Time & Seasonality
 */
function getSeasonId() {
    const now = new Date();
    return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

/**
 * 0. UNIVERSAL ACCESS PROVISIONING (V2)
 * This trigger is the server-side authority that populates new users.
 * Using onDocumentWritten to provide self-healing for existing unprovisioned docs.
 */
exports.onuserprovisioning = onDocumentWritten('users/{userId}', async (event) => {
    const userData = event.data.after.exists ? event.data.after.data() : null;
    
    // Only provision if it's an un-provisioned document
    if (userData && !userData.isProvisioned) {
        console.log(`AUTH: Provisioning stats for user ${event.params.userId}`);
        
        const provisionedData = {
            created_at: userData.created_at || admin.firestore.FieldValue.serverTimestamp(),
            checkins: admin.firestore.FieldValue.increment(0),
            purchases: admin.firestore.FieldValue.increment(0),
            badges: {},
            isSuperAdmin: userData.isSuperAdmin || false,
            isAuditor: userData.isAuditor || false,
            isCustomerSuccess: userData.isCustomerSuccess || false,
            currentTier: { name: 'Seed', badgeCount: 0 },
            nickname: userData.nickname || 'Ambassador',
            isProvisioned: true,
            provisionedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await event.data.after.ref.set(provisionedData, { merge: true });
        
        // Update global consumer count (only if this is likely the first time)
        if (!event.data.before.exists) {
            const shardId = Math.floor(Math.random() * 10).toString();
            await db.collection('system').doc('stats').collection('shards').doc(shardId)
                .set({ consumers: admin.firestore.FieldValue.increment(1) }, { merge: true });
        }
        return;
    }
});

/**
 * SELF-HEALING: Automated Reconciliation (V2)
 * Aggregates global network impact from the transactions ledger.
 */
exports.reconcilenetworkstats = onSchedule('every 5 minutes', async (event) => {
    try {
        const [uCount, bizSnap] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('businesses').get()
        ]);

        let globalCheckins = 0;
        let globalGhostCheckins = 0;
        let globalPurchases = 0;
        let globalVolume = 0;
        
        bizSnap.forEach(doc => {
            const b = doc.data();
            globalCheckins += (b.checkinsCount || 0);
            globalGhostCheckins += (b.ghostCheckinsCount || 0);
            globalPurchases += (b.purchasesCount || 0);
            globalVolume += (b.purchaseVolume || 0);
        });

        await db.collection('system').doc('stats').set({
            consumers: uCount.data().count,
            businesses: bizSnap.size,
            checkins: globalCheckins,
            ghostCheckins: globalGhostCheckins,
            purchases: globalPurchases,
            purchaseVolume: globalVolume,
            lastAutoReconcile: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`GLOBAL STATS: Reconciled ${bizSnap.size} businesses and ${uCount.data().count} users.`);
    } catch (e) { console.error("Global Stats Reconcile Failed:", e); }
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
        if (userData.isOwner) claims.isOwner = true;
    }
    await admin.auth().setCustomUserClaims(uid, claims);
    return { success: true };
});

/**
 * STATION MANAGEMENT (Onboarding Flow)
 */
exports.assignapplication = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { applicationId } = request.data;
    const uid = request.auth.uid;
    
    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data();
    if (!userData.isCustomerSuccess && !userData.isSuperAdmin) {
        throw new HttpsError('permission-denied', 'Only Network Staff can assign applications.');
    }

    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) throw new HttpsError('not-found', 'Application not found.');
    if (appSnap.data().status === 'approved') throw new HttpsError('failed-precondition', 'Application is already approved.');
    if (appSnap.data().assignedTo) throw new HttpsError('already-exists', 'Application is already assigned.');

    await appRef.update({
        assignedTo: uid,
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'onboarding'
    });
    return { success: true };
});

exports.updateapplication = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { applicationId, updates } = request.data;
    const uid = request.auth.uid;

    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) throw new HttpsError('not-found', 'Application not found.');
    const appData = appSnap.data();

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data();
    
    const isStaff = appData.assignedTo === uid || userData.isSuperAdmin || userData.isCustomerSuccess;
    const isOwner = appData.ownerUid === uid;
    
    if (!isStaff && !isOwner) {
        throw new HttpsError('permission-denied', 'Unauthorized to update this application.');
    }

    await appRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
});

exports.onboardbusinessapplication = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const existingApp = await db.collection('applications').where('email', '==', request.auth.token.email).limit(1).get();
    if (!existingApp.empty) {
        throw new HttpsError('already-exists', 'You already have an active or pending application.');
    }

    const data = request.data;
    const uid = request.auth.uid;
    
    const appRef = await db.collection('applications').add({
        name: data.name,
        founder: data.founder || '',
        phone: data.phone,
        email: data.email.toLowerCase(),
        registrationNumber: data.registrationNumber || '',
        industry: data.industry || '',
        location: data.location || '',
        googleMapsUrl: data.googleMapsUrl || '',
        address: data.address || '',
        purposeStatement: data.purposeStatement || '',
        story: data.story || '',
        ownerUid: uid,
        status: 'draft',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, applicationId: appRef.id };
});

exports.publishapplication = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { applicationId } = request.data;
    const uid = request.auth.uid;

    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data();
    if (!userData.isCustomerSuccess && !userData.isSuperAdmin) {
        throw new HttpsError('permission-denied', 'Only Network Staff can publish applications.');
    }

    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) throw new HttpsError('not-found', 'Application not found.');
    const appData = appSnap.data();

    const bizId = applicationId;
    const onboardingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const batch = db.batch();

    batch.set(db.collection('businesses').doc(bizId), {
        name: appData.name,
        industry: appData.industry,
        location: appData.location,
        ownerEmail: appData.email.toLowerCase(),
        registrationNumber: appData.registrationNumber || '',
        founder: appData.founder || '',
        address: appData.address || '',
        phone: appData.phone || '',
        story: appData.story || '',
        purposeStatement: appData.purposeStatement || '',
        googleMapsUrl: appData.googleMapsUrl || '',
        onboardingCode: onboardingCode,
        status: 'active',
        isVerified: false,
        checkinsCount: 0,
        purchasesCount: 0,
        purchaseVolume: 0,
        ghostCheckinsCount: 0,
        ghostPurchasesCount: 0,
        stewardship: { managers: [], crew: [] },
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        publishedBy: uid
    });

    batch.update(appRef, {
        status: 'approved',
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        bizId: bizId
    });

    const ownerSnap = await db.collection('users').where('email', '==', appData.email.toLowerCase()).get();
    if (!ownerSnap.empty) {
        const ownerUid = ownerSnap.docs[0].id;
        batch.update(ownerSnap.docs[0].ref, { isOwner: true });
        const currentClaims = (await admin.auth().getUser(ownerUid)).customClaims || {};
        await admin.auth().setCustomUserClaims(ownerUid, { ...currentClaims, isOwner: true });
    }

    await batch.commit();
    return { success: true, bizId };
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

/**
 * INTERNAL HELPER: Sync Merchant Projection
 * Ensures that the merchant's local transaction queue matches the Master Ledger.
 */
async function syncMerchantProjection(bizId, txnId, txnData, batch = null) {
    const projectionRef = db.collection('businesses').doc(bizId).collection('transactions').doc(txnId);
    
    // BUILD DYNAMIC PAYLOAD: Only include fields that are actually present to avoid partial update drift
    const payload = {
        id: txnId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (txnData.type) payload.type = txnData.type;
    if (txnData.userId) payload.userId = txnData.userId;
    if (txnData.userNickname) payload.userNickname = txnData.userNickname;
    if (txnData.isGhost !== undefined) payload.isGhost = !!txnData.isGhost;
    if (txnData.status) payload.status = txnData.status;
    if (txnData.timestamp) payload.timestamp = txnData.timestamp;
    if (txnData.amount !== undefined) payload.amount = txnData.amount;
    if (txnData.receiptId !== undefined) payload.receiptId = txnData.receiptId;
    if (txnData.verifiedAt) payload.verifiedAt = txnData.verifiedAt;

    if (batch) {
        batch.set(projectionRef, payload, { merge: true });
    } else {
        await projectionRef.set(payload, { merge: true });
    }
}

exports.recordghostcheckin = onCall(async (request) => {
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
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. High-Performance Sharded Counter for Business
    // ARCHITECTURAL PIVOT: Ghost counters are now reconciled by the hourly healer.

    await batch.commit();

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

exports.recordghostpurchase = onCall(async (request) => {
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
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
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

    // ARCHITECTURAL PIVOT: Merchant Projections are now pulled on-demand.

    await batch.commit();
    return { success: true, message: 'Ghost Purchase recorded.' };
});

exports.claimbusinessrecommendation = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { onboardingCode } = request.data;
    const uid = request.auth.uid;
    
    const bizSnap = await db.collection('businesses').where('onboardingCode', '==', onboardingCode).get();
    if (bizSnap.empty) throw new HttpsError('not-found', 'Invalid or expired onboarding code.');
    
    const biz = bizSnap.docs[0];
    const bizData = biz.data();
    const userRef = db.collection('users').doc(uid);
    
    // Anti-Spam: Check if already claimed
    const claimDoc = await userRef.collection('claimed_codes').doc(biz.id).get();
    if (claimDoc.exists) throw new HttpsError('already-exists', 'You have already claimed this recommendation.');
    
    const batch = db.batch();
    batch.set(userRef.collection('claimed_codes').doc(biz.id), {
        code: onboardingCode,
        bizName: bizData.name,
        claimedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch.update(userRef, {
        onboardedCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await batch.commit();
    return { success: true, bizName: bizData.name };
});

exports.recordinitiativeattendance = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { initiativeId } = request.data;
    const uid = request.auth.uid;
    
    const initRef = db.collection('initiatives').doc(initiativeId);
    const initSnap = await initRef.get();
    if (!initSnap.exists) throw new HttpsError('not-found', 'Initiative not found.');
    
    const batch = db.batch();
    batch.update(initRef, {
        attendanceCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch.set(initRef.collection('attendees').doc(uid), {
        attendedAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: uid
    });

    // 2. MASTER LEDGER ENTRY (For Newsreel & Healing)
    const txnRef = db.collection('transactions').doc();
    batch.set(txnRef, {
        type: 'attendance',
        initiativeId,
        initiativeTitle: initSnap.data().title || 'Unknown Initiative',
        userId: uid,
        userNickname: (await db.collection('users').doc(uid).get()).data()?.nickname || 'Ambassador',
        status: 'verified',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await batch.commit();
    return { success: true };
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
    const nickname = txn.isGhost ? 'Guest Supporter' : (txn.userNickname || 'Someone');
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
    } else if (type === 'attendance') {
        const initiativeTitle = txn.initiativeTitle || 'an initiative';
        pulseText = `🔥 ${nickname} joined the initiative: ${initiativeTitle}`;
    }

    const broadcastPromise = pulseText ? db.collection('network_pulse').add({
        text: pulseText,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: type
    }) : Promise.resolve();

    // ARCHITECTURAL PIVOT: We no longer perform instant projection writes or shard increments here.
    // The Merchant Projection is now updated via 'syncmerchantledger' (On-Demand).
    // The User Bonds and Business Shards are updated via 'healplatformdata' (Scheduled Batch).

    return broadcastPromise;
});

/**
 * PULSE ENGINE: Rewards Broadcast
 * Decoupled trigger that populates the newsreel when a reward is granted.
 */
exports.pulseengine_rewards_broadcast = onDocumentCreated('rewards/{rewardId}', async (event) => {
    const reward = event.data.data();
    if (!reward) return;

    return db.collection('network_pulse').add({
        text: `🎁 ${reward.bizName || 'A business'} recognized a loyal supporter!`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'reward'
    });
});

exports.pulseengine_cleanup = onSchedule('every 1 hours', async (event) => {
    const snapshot = await db.collection('network_pulse')
        .orderBy('timestamp', 'desc')
        .offset(50)
        .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
});

exports.verifypurchase = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { txnId, bizId } = request.data;
    const email = request.auth.token.email;

    const bizDoc = await db.collection('businesses').doc(bizId).get();
    if (!bizDoc.exists) throw new HttpsError('not-found', 'Business not found.');
    const bizData = bizDoc.data();

    if (bizData.ownerEmail !== email && !bizData.stewardship?.managers?.includes(email) && !bizData.stewardship?.crew?.includes(email)) {
        throw new HttpsError('permission-denied', 'Only authorized staff can verify purchases.');
    }

    const txnRef = db.collection('transactions').doc(txnId);
    const txnSnap = await txnRef.get();
    if (!txnSnap.exists) throw new HttpsError('not-found', 'Transaction not found.');
    const txnData = txnSnap.get();

    if (txnData.status === 'verified') return { success: true, message: 'Already verified.' };

    const batch = db.batch();

    // 1. The Master Ledger update
    batch.update(txnRef, { 
        status: 'verified', 
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedBy: request.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. The Merchant Projection update (Optional but good for instant verification feedback)
    await syncMerchantProjection(bizId, txnId, {
        status: 'verified',
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    }, batch);

    // ARCHITECTURAL PIVOT: We no longer update the Customer Bond here.
    // The Healer will reconcile the verified status into the Bond counters during its next run.
    // This prevents double-counting if pulseengine_broadcast or local stats are in flight.

    await batch.commit();
    return { success: true };
});

/**
 * RECONCILE BUSINESS INTELLIGENCE (Scheduled)
 * Calculates aggregate stats for each business and updates the projection.
 */
exports.reconcilebusinessintelligence = onSchedule('every 1 hours', async (event) => {
    const bizSnap = await db.collection('businesses').get();
    const batch = db.batch();

    for (const bizDoc of bizSnap.docs) {
        const bizId = bizDoc.id;
        
        // Calculate Unique Visitors & Loyal Supporters
        // Unique Visitors: Anyone with at least 1 check-in/purchase
        // Loyal Supporters: Anyone with > 3 check-ins OR > 1 purchase
        const bondsSnap = await db.collectionGroup('gratitude_bonds')
            .where('bizId', '==', bizId)
            .get();

        let loyalSupporters = 0;
        bondsSnap.forEach(doc => {
            const d = doc.data();
            if ((d.totalCheckins || 0) > 3 || (d.totalPurchases || 0) > 1) {
                loyalSupporters++;
            }
        });

        const uniqueVisitors = bondsSnap.size;

        const intelligenceRef = db.collection('businesses').doc(bizId).collection('intelligence').doc('latest');
        batch.set(intelligenceRef, {
            uniqueVisitors: uniqueVisitors,
            loyalSupporters: loyalSupporters,
            totalCheckins: bizDoc.data().checkinsCount || 0,
            totalPurchases: bizDoc.data().purchasesCount || 0,
            communityImpact: bizDoc.data().purchaseVolume || 0,
            lastCalculated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    return batch.commit();
});


/**
 * MERCHANT INTELLIGENCE (Handshake Flow)
 */
exports.creategratitudebond = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { targetUserId, bizId } = request.data;
    const uid = request.auth.uid;

    const bizRef = db.collection('businesses').doc(bizId);
    const bizSnap = await bizRef.get();
    if (!bizSnap.exists) throw new HttpsError('not-found', 'Business not found.');
    const bizData = bizSnap.data();

    const email = request.auth.token.email;
    const isOwner = bizData.ownerEmail === email;
    const isManager = bizData.stewardship?.managers?.includes(email);
    const isCrew = bizData.stewardship?.crew?.includes(email);

    if (!isOwner && !isManager && !isCrew) {
        throw new HttpsError('permission-denied', 'Only Business Staff can establish bonds.');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const bondId = `${uid}_${targetUserId}`;
    await db.collection('gratitude_bond_transfer').doc(bondId).set({
        bizId,
        userId: targetUserId,
        stewardId: uid,
        stewardEmail: email,
        type: 'handshake_scan',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
    });

    return { success: true };
});

exports.getcustomerintelligence = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { targetUserId, bizId } = request.data;
    const email = request.auth.token.email;

    const now = new Date();
    const bondSnap = await db.collection('gratitude_bond_transfer')
        .where('bizId', '==', bizId)
        .where('userId', '==', targetUserId)
        .where('expiresAt', '>', now)
        .limit(1)
        .get();

    if (bondSnap.empty) {
        throw new HttpsError('permission-denied', 'No active Gratitude Bond found. Please scan the customer card again.');
    }

    const bizDoc = await db.collection('businesses').doc(bizId).get();
    const bizData = bizDoc.data();
    let role = 'crew';
    if (bizData.ownerEmail === email) role = 'founder';
    else if (bizData.stewardship?.managers?.includes(email)) role = 'manager';

    const userDoc = await db.collection('users').doc(targetUserId).get();
    const userData = userDoc.exists ? userDoc.data() : { nickname: 'Guest Supporter' };

    // PIVOT: Read from the User's Projection (Symmetric Sincerity)
    const bondRef = db.collection('users').doc(targetUserId).collection('gratitude_bonds').doc(bizId);
    const bondDataSnap = await bondRef.get();
    const stats = bondDataSnap.exists ? bondDataSnap.data() : { totalCheckins: 0, totalPurchases: 0, totalSpend: 0 };
    
    // Fetch recent engagements from the Merchant's Projection
    const recentTxns = await db.collection('businesses').doc(bizId).collection('transactions')
        .where('userId', '==', targetUserId)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

    const engagements = recentTxns.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            type: d.type,
            amount: d.amount,
            timestamp: d.timestamp?.toDate()?.toISOString(),
            status: d.status,
            receiptId: d.receiptId
        };
    });

    return {
        nickname: userData.nickname || 'Ambassador',
        role: role,
        stats: {
            checkins: stats.totalCheckins || 0,
            purchases: stats.totalPurchases || 0,
            totalSpend: stats.totalSpend || 0
        },
        engagements
    };
});

exports.grantcustomerreward = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { targetUserId, bizId, description } = request.data;
    const email = request.auth.token.email;

    const bizDoc = await db.collection('businesses').doc(bizId).get();
    const bizData = bizDoc.data();
    if (bizData.ownerEmail !== email && !bizData.stewardship?.managers?.includes(email)) {
        throw new HttpsError('permission-denied', 'Only Founders and Managers can grant rewards.');
    }

    await db.collection('rewards').add({
        bizId,
        bizName: bizData.name,
        userId: targetUserId,
        stewardEmail: email,
        description,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'granted'
    });

    // ARCHITECTURAL PIVOT: network_pulse is now handled by the 'pulseengine_rewards_broadcast' trigger.
    // This enforces the 1-Write-Function rule for the Newsreel.

    return { success: true };
});

exports.acceptinvitationtojoinnetwork = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
    const { ghostId } = request.data;
    const uid = request.auth.uid;

    if (!ghostId) throw new HttpsError('invalid-argument', 'ghostId is required.');

    // 1. Retrieve all ghost transactions & gratitude bonds
    const [txnSnap, bondSnap, userSnap] = await Promise.all([
        db.collection('transactions').where('userId', '==', ghostId).get(),
        db.collection('users').doc(ghostId).collection('gratitude_bonds').get(),
        db.collection('users').doc(uid).get()
    ]);

    const userNickname = userSnap.exists ? (userSnap.data().nickname || 'Ambassador') : 'Ambassador';

    if (txnSnap.empty && bondSnap.empty) return { success: true, count: 0 };

    const batch = db.batch();
    let checkins = 0;
    let purchases = 0;
    const bizStatsMigration = {}; // bizId -> { ghostCheckins, ghostPurchases }

    // Migrate Transactions
    txnSnap.forEach(doc => {
        const data = doc.data();
        if (data.type === 'checkin') checkins++;
        else if (data.type === 'purchase') purchases++;

        // Update Ledger
        batch.update(doc.ref, {
            userId: uid,
            isGhost: false,
            userNickname: userNickname,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
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
        purchases: admin.firestore.FieldValue.increment(purchases),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();

    // 3. CLEANUP ORPHANED GHOST DATA
    try {
        const cleanupBatch = db.batch();
        cleanupBatch.delete(db.collection('ghost_sessions').doc(ghostId));
        cleanupBatch.delete(db.collection('users').doc(ghostId));
        await cleanupBatch.commit();
    } catch (err) {
        console.warn("Cleanup of ghost data failed:", err);
    }

    return { success: true, count: txnSnap.size };
});

/**
 * PLATFORM HEALER: Defensive Reconciliation
 * Periodically scans for recently updated transactions and ensures all projections
 * (Merchant Queues & User Gratitude Bonds) are synchronized with the Master Ledger.
 */
exports.healplatformdata = onSchedule('every 1 hours', async (event) => {
    const oneHourAgo = new Date(Date.now() - 65 * 60 * 1000);
    const recentTxns = await db.collection('transactions')
        .where('updatedAt', '>', admin.firestore.Timestamp.fromDate(oneHourAgo))
        .limit(400) // Safety limit for memory/execution time
        .get();

    if (recentTxns.empty) return;

    let batch = db.batch();
    let batchCount = 0;
    const bondHealingTasks = []; // { userId, bizId }

    for (const doc of recentTxns.docs) {
        const txn = doc.data();
        if (txn.bizId) {
            await syncMerchantProjection(txn.bizId, doc.id, txn, batch);
            batchCount++;
            if (txn.userId) bondHealingTasks.push({ userId: txn.userId, bizId: txn.bizId });
        }
    }

    // 2. Heal User Gratitude Bonds & Discovery Stats
    const uniqueBonds = Array.from(new Set(bondHealingTasks.map(t => `${t.userId}_${t.bizId}`)))
        .map(id => {
            const [userId, bizId] = id.split('_');
            return { userId, bizId };
        });

    const bondPromises = uniqueBonds.map(async (bond) => {
        const bondTxns = await db.collection('transactions')
            .where('userId', '==', bond.userId)
            .where('bizId', '==', bond.bizId)
            .get();

        const bizDoc = await db.collection('businesses').doc(bond.bizId).get();
        const bizData = bizDoc.data();

        let pendingPurchases = 0;
        let verifiedPurchases = 0;
        let pendingSpend = 0;
        let verifiedSpend = 0;
        let totalCheckins = 0;
        let lastVisit = null;

        bondTxns.forEach(bDoc => {
            const d = bDoc.data();
            // IMPORTANT: Only count active transactions. Ignore 'rejected', 'cancelled', etc.
            if (d.status !== 'verified' && d.status !== 'pending') return;

            const ts = d.timestamp?.toDate ? d.timestamp.toDate() : null;
            if (!lastVisit || (ts && ts > lastVisit)) lastVisit = ts;

            if (d.type === 'checkin') {
                totalCheckins++;
            } else if (d.type === 'purchase') {
                if (d.status === 'verified') {
                    verifiedPurchases++;
                    verifiedSpend += (d.amount || 0);
                } else {
                    pendingPurchases++;
                    pendingSpend += (d.amount || 0);
                }
            }
        });

        return { 
            bond, 
            pendingPurchases, 
            verifiedPurchases, 
            pendingSpend, 
            verifiedSpend, 
            totalCheckins, 
            lastVisit,
            industry: bizData?.industry || 'Unknown'
        };
    });

    const bondResults = await Promise.all(bondPromises);
    
    const affectedUserIds = new Set(bondHealingTasks.map(t => t.userId));
    const affectedBizIds = new Set(bondHealingTasks.map(t => t.bizId));

    // 1.5 Heal Business Stats
    for (const bizId of affectedBizIds) {
        const bizTxns = await db.collection('transactions').where('bizId', '==', bizId).get();
        let checkins = 0;
        let ghostCheckins = 0;
        let purchases = 0;
        let ghostPurchases = 0;
        let volume = 0;

        bizTxns.forEach(doc => {
            const d = doc.data();
            if (d.status !== 'verified' && d.status !== 'pending') return;
            
            if (d.type === 'checkin') {
                checkins++;
                if (d.isGhost) ghostCheckins++;
            } else if (d.type === 'purchase') {
                purchases++;
                if (d.isGhost) ghostPurchases++;
                volume += (d.amount || 0);
            }
        });

        const bizRef = db.collection('businesses').doc(bizId);
        batch.set(bizRef, {
            checkinsCount: checkins,
            ghostCheckinsCount: ghostCheckins,
            purchasesCount: purchases,
            ghostPurchasesCount: ghostPurchases,
            purchaseVolume: volume,
            healedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        batchCount++;
        if (batchCount >= 450) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    }

    for (const res of bondResults) {
        if (res.lastVisit) {
            const bondRef = db.collection('users').doc(res.bond.userId).collection('gratitude_bonds').doc(res.bond.bizId);
            batch.set(bondRef, {
                pendingPurchases: res.pendingPurchases,
                verifiedPurchases: res.verifiedPurchases,
                pendingSpend: res.pendingSpend,
                verifiedSpend: res.verifiedSpend,
                totalCheckins: res.totalCheckins,
                totalPurchases: res.pendingPurchases + res.verifiedPurchases,
                totalSpend: res.pendingSpend + res.verifiedSpend,
                lastVisit: admin.firestore.Timestamp.fromDate(res.lastVisit),
                healedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            batchCount++;
            if (batchCount >= 450) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }
    }

    // 3. Final User Profile Reconciliation (Recalculate TOTALS from ALL bonds)
    const seasonId = getSeasonId();
    for (const uid of affectedUserIds) {
        const allBonds = await db.collection('users').doc(uid).collection('gratitude_bonds').get();
        
        let totalCheckins = 0;
        let totalPurchases = 0;
        let sectorMetrics = {};

        allBonds.forEach(doc => {
            const b = doc.data();
            totalCheckins += (b.totalCheckins || 0);
            totalPurchases += (b.totalPurchases || 0);

            // Rebuild Sector Metrics if industry data exists
            // We'll need the healer to have industry context or just preserve existing if not known
            // For now, we trust the bond has industry or we skip sector healing here
        });

        const userRef = db.collection('users').doc(uid);
        batch.set(userRef, {
            checkins: totalCheckins,
            purchases: totalPurchases,
            healedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const seasonRef = userRef.collection('seasons').doc(seasonId);
        batch.set(seasonRef, {
            totalCheckins: totalCheckins,
            totalPurchases: totalPurchases,
            lastSynced: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        batchCount += 2;
        if (batchCount >= 450) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) await batch.commit();
    console.log(`HEALER: Reconciled ${recentTxns.size} transactions, ${uniqueBonds.length} bonds, and ${affectedBizIds.size} businesses.`);
});

/**
 * MERCHANT QUEUE: On-Demand Synchronization
 * Allows merchants to manually pull the latest transactions from the Master Ledger
 * if the real-time background sync is lagging or hasn't yet processed.
 */
exports.syncmerchantledger = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { bizId } = request.data;
    const email = request.auth.token.email;

    const bizDoc = await db.collection('businesses').doc(bizId).get();
    if (!bizDoc.exists) throw new HttpsError('not-found', 'Business not found.');
    const bizData = bizDoc.data();

    // Security Guard: Only Owners and Managers can force sync
    if (bizData.ownerEmail !== email && !bizData.stewardship?.managers?.includes(email)) {
        throw new HttpsError('permission-denied', 'Unauthorized.');
    }

    const txns = await db.collection('transactions')
        .where('bizId', '==', bizId)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

    if (txns.empty) return { success: true, count: 0 };

    let batch = db.batch();
    let count = 0;
    for (const doc of txns.docs) {
        await syncMerchantProjection(bizId, doc.id, doc.data(), batch);
        count++;
        if (count % 450 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }

    await batch.commit();
    return { success: true, count: txns.size };
});

/**
 * CREW MANAGEMENT: Assigning Staff Roles
 * Allows owners to add or remove managers and crew members.
 */
exports.managecrew = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { bizId, targetEmail, role, action } = request.data;
    const callerEmail = request.auth.token.email.toLowerCase();
    const cleanTargetEmail = targetEmail.trim().toLowerCase();

    const bizRef = db.collection('businesses').doc(bizId);
    const bizDoc = await bizRef.get();
    if (!bizDoc.exists) throw new HttpsError('not-found', 'Business not found.');
    
    const bizData = bizDoc.data();
    
    // Security: Only Owner, SuperAdmin, or CustomerSuccess
    const isOwner = bizData.ownerEmail === callerEmail;
    const isPrivileged = request.auth.token.isSuperAdmin || request.auth.token.isCustomerSuccess;

    if (!isOwner && !isPrivileged) {
        throw new HttpsError('permission-denied', 'Only the owner or platform staff can manage the crew.');
    }

    if (action === 'add') {
        const field = role === 'manager' ? 'stewardship.managers' : 'stewardship.crew';
        const otherField = role === 'manager' ? 'stewardship.crew' : 'stewardship.managers';
        
        // Atomically move from one role to another if they exist
        await bizRef.update({
            [field]: admin.firestore.FieldValue.arrayUnion(cleanTargetEmail),
            [otherField]: admin.firestore.FieldValue.arrayRemove(cleanTargetEmail)
        });
    } else if (action === 'remove') {
        const field = role === 'manager' ? 'stewardship.managers' : 'stewardship.crew';
        await bizRef.update({
            [field]: admin.firestore.FieldValue.arrayRemove(cleanTargetEmail)
        });
    }

    return { success: true };
});
