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
 * UTILS: Sharded Global Counters
 */
async function incrementGlobalStats(updates) {
    const shardId = Math.floor(Math.random() * 10).toString();
    const shardRef = db.collection('system').doc('stats').collection('shards').doc(shardId);
    
    const incrementPayload = {};
    for (const [key, value] of Object.entries(updates)) {
        incrementPayload[key] = admin.firestore.FieldValue.increment(value);
    }
    
    await shardRef.set(incrementPayload, { merge: true });
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
            attendanceDays: admin.firestore.FieldValue.increment(0),
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
 * SELF-HEALING: Nightly Aggregator & Shard Reconciler (V2)
 * Reconciles global network impact and resets shards to the authoritative truth.
 */
exports.reconcilenetworkstats = onSchedule('0 3 * * *', async (event) => {
    try {
        console.log("RECONCILE: Starting nightly truth-reset...");
        const [uCount, bizSnap, initSnap] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('businesses').get(),
            db.collection('initiatives').get()
        ]);

        let globalCheckins = 0;
        let globalGuestCheckins = 0;
        let globalPurchases = 0;
        let globalVolume = 0;
        let globalAttendance = 0;
        
        bizSnap.forEach(doc => {
            const b = doc.data();
            globalCheckins += (b.checkinsCount || 0);
            globalGuestCheckins += (b.guestCheckinsCount || 0);
            globalPurchases += (b.purchasesCount || 0);
            globalVolume += (b.purchaseVolume || 0);
        });

        initSnap.forEach(doc => {
            const i = doc.data();
            globalAttendance += (i.attendanceCount || 0);
        });

        // 1. Update the Main Stats Document
        const finalStats = {
            consumers: uCount.data().count,
            businesses: bizSnap.size,
            checkins: globalCheckins,
            guestCheckins: globalGuestCheckins,
            purchases: globalPurchases,
            purchaseVolume: globalVolume,
            totalAttendance: globalAttendance,
            lastAutoReconcile: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('system').doc('stats').set(finalStats, { merge: true });

        // 2. RESET SHARDS: To avoid double-counting, we clear the shards
        // and set the authoritative total into the shards if necessary, 
        // but typically we just clear them and let the next scans increment.
        const shardsSnap = await db.collection('system').doc('stats').collection('shards').get();
        const batch = db.batch();
        shardsSnap.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`GLOBAL STATS: Healed ${bizSnap.size} businesses and ${uCount.data().count} users. Shards reset.`);
    } catch (e) { console.error("Global Stats Reconcile Failed:", e); }
});

/**
 * DASHBOARD SYNC: Lightweight Shard Aggregator
 * Runs frequently to sum shards into the main stats doc for the Home Dashboard.
 */
exports.aggregateglobalshards = onSchedule('every 5 minutes', async (event) => {
    try {
        const shardsSnap = await db.collection('system').doc('stats').collection('shards').get();
        const totals = {
            checkins: 0, guestCheckins: 0, purchases: 0, 
            purchaseVolume: 0, totalAttendance: 0, consumers: 0
        };

        shardsSnap.forEach(doc => {
            const d = doc.data();
            for (const key in totals) {
                totals[key] += (d[key] || 0);
            }
        });

        // Add to existing authoritative numbers if they exist, or just use shard total
        // For simplicity in this architecture, system/stats stores the Authoritative Base 
        // and the shards store the Delta.
        const statsDoc = await db.collection('system').doc('stats').get();
        const base = statsDoc.exists ? statsDoc.data() : {};

        await db.collection('system').doc('stats').set({
            checkins: (base.checkins || 0) + totals.checkins,
            guestCheckins: (base.guestCheckins || 0) + totals.guestCheckins,
            purchases: (base.purchases || 0) + totals.purchases,
            purchaseVolume: (base.purchaseVolume || 0) + totals.purchaseVolume,
            totalAttendance: (base.totalAttendance || 0) + totals.totalAttendance,
            consumers: (base.consumers || 0) + totals.consumers,
            lastShardSync: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

    } catch (e) { console.error("Shard Aggregation Failed:", e); }
});

/**
 * PULSE ENGINE: Sharded Ingestion Trigger
 * Automatically maps transaction types to global and business-specific shards.
 * This is the central ingestion point for all economic momentum.
 */
exports.ontransactioncreated = onDocumentCreated('transactions/{txnId}', async (event) => {
    const txn = event.data.data();
    if (!txn) return;

    const batch = db.batch();

    // 1. GLOBAL NETWORK MOMENTUM (SHARDED)
    const globalShardId = Math.floor(Math.random() * 10).toString();
    const globalShardRef = db.collection('system').doc('stats').collection('shards').doc(globalShardId);

    const globalIncs = {};
    if (txn.type === 'checkin') {
        globalIncs.checkins = admin.firestore.FieldValue.increment(1);
        if (txn.isGuest) globalIncs.guestCheckins = admin.firestore.FieldValue.increment(1);
    } else if (txn.type === 'purchase') {
        globalIncs.purchases = admin.firestore.FieldValue.increment(1);
        if (txn.amount) globalIncs.purchaseVolume = admin.firestore.FieldValue.increment(txn.amount);
    } else if (txn.type === 'attendance') {
        globalIncs.totalAttendance = admin.firestore.FieldValue.increment(1);
    }

    if (Object.keys(globalIncs).length > 0) {
        batch.set(globalShardRef, globalIncs, { merge: true });
    }

    // 2. BUSINESS-SPECIFIC MOMENTUM (SHARDED)
    if (txn.bizId) {
        const bizShardId = Math.floor(Math.random() * 10).toString();
        const bizShardRef = db.collection('businesses').doc(txn.bizId).collection('shards').doc(bizShardId);
        
        const bizIncs = {};
        if (txn.type === 'checkin') {
            bizIncs.checkinsCount = admin.firestore.FieldValue.increment(1);
            if (txn.isGuest) bizIncs.guestCheckinsCount = admin.firestore.FieldValue.increment(1);
        } else if (txn.type === 'purchase') {
            bizIncs.purchasesCount = admin.firestore.FieldValue.increment(1);
            if (txn.isGuest) bizIncs.guestPurchasesCount = admin.firestore.FieldValue.increment(1);
            if (txn.amount) bizIncs.purchaseVolume = admin.firestore.FieldValue.increment(txn.amount);
        }

        if (Object.keys(bizIncs).length > 0) {
            batch.set(bizShardRef, bizIncs, { merge: true });
        }
    }

    // 3. NEWSREEL BROADCAST (Pulse Engine Hook)
    // Note: pulseengine_broadcast is a separate trigger on transactions/{txnId}
    // but we ensure this one runs for shard integrity.
    
    await batch.commit();
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
        guestCheckinsCount: 0,
        guestPurchasesCount: 0,
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

/**
 * APPLICATION MANAGEMENT: Deletion
 * Allows owners to discard drafts or staff to remove stale applications.
 */
exports.deleteapplication = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
    const { applicationId } = request.data;
    const email = request.auth.token.email;

    const appRef = db.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();
    
    if (!appSnap.exists) throw new HttpsError('not-found', 'Application not found.');
    
    const appData = appSnap.data();
    
    // Security: Only owner or CustomerSuccess staff
    const isOwner = appData.email === email;
    const isStaff = request.auth.token.isCustomerSuccess || request.auth.token.isSuperAdmin;
    
    if (!isOwner && !isStaff) {
        throw new HttpsError('permission-denied', 'Unauthorized to delete this application.');
    }
    
    // Safety check: Cannot delete approved applications (already published to businesses)
    if (appData.status === 'approved') {
        throw new HttpsError('failed-precondition', 'Cannot delete an approved application.');
    }

    await appRef.delete();
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
 * GUEST FLOW: Guest Activity Bridges
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
    if (txnData.isGuest !== undefined) payload.isGuest = !!txnData.isGuest;
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

exports.recordguestcheckin = onCall(async (request) => {
    const { bizId, guestId } = request.data;
    if (!bizId || !guestId) throw new HttpsError('invalid-argument', 'bizId and guestId are required.');

    const today = new Date().toISOString().split('T')[0];
    const sessionRef = db.collection('guest_sessions').doc(guestId);
    const sessionSnap = await sessionRef.get();

    // 1. GUEST SENTINEL: Anti-Spam Check & 3-Strikes Lockout
    if (sessionSnap.exists) {
        const sessionData = sessionSnap.data();
        
        // A. Check Global Lockout
        if (sessionData.lockoutUntil) {
            const lockoutDate = sessionData.lockoutUntil.toDate();
            if (new Date() < lockoutDate) {
                throw new HttpsError('permission-denied', 'Security Triggered: Excessive attempts detected. Scanner locked for 10 minutes.');
            }
        }

        // B. Check Per-Business Spam
        if (sessionData.lastCheckins && sessionData.lastCheckins[bizId] === today) {
            const attempts = (sessionData.spamAttempts?.[bizId] || 0) + 1;

            if (attempts >= 3) {
                const lockoutDate = new Date(Date.now() + 10 * 60 * 1000);
                await sessionRef.set({
                    lockoutUntil: admin.firestore.Timestamp.fromDate(lockoutDate),
                    [`spamAttempts.${bizId}`]: 0
                }, { merge: true });
                throw new HttpsError('permission-denied', 'Security Triggered: Excessive attempts detected. Scanner locked for 10 minutes.');
            } else if (attempts === 2) {
                await sessionRef.set({
                    [`spamAttempts.${bizId}`]: attempts
                }, { merge: true });
                throw new HttpsError('failed-precondition', 'You have been naughty. This is your final signal before a security lockout.');
            } else {
                await sessionRef.set({
                    [`spamAttempts.${bizId}`]: attempts
                }, { merge: true });
                throw new HttpsError('resource-exhausted', 'Wow! You are such an enthusiastic supporter. You can support this merchant again tomorrow.');
            }
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
        userId: guestId,
        userNickname: 'Guest Supporter',
        isGuest: true,
        status: 'verified',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. High-Performance Sharded Counter for Business
    // ARCHITECTURAL PIVOT: Guest counters are now reconciled by the hourly healer.

    await batch.commit();

    // 3. Gratitude Bond & DISCOVERY STATS (For Badge Sync)
    const guestRef = db.collection('users').doc(guestId);
    batch.set(guestRef.collection('gratitude_bonds').doc(bizId), {
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
        // We still initialize the doc here for the virtual guest user
        batch.set(guestRef, { lastActivity: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    await batch.commit();
    return { success: true, message: 'Guest Check-in recorded.' };
});

// MOVED AND CONSOLIDATED recordinitiativeattendance TO REMOVE DUPLICATION
/**
 * INITIATIVE MANAGEMENT: Attendance Recording
 * Securely logs attendance for verified members or anonymous guests.
 * Triggers the Pulse Engine for Newsreel broadcasting.
 */
exports.recordinitiativeattendance = onCall(async (request) => {
    const { initiativeId } = request.data;
    const uid = request.auth?.uid || request.data.guestId;
    if (!initiativeId || !uid) throw new HttpsError('invalid-argument', 'Missing initiativeId or identity.');

    const initiativeRef = db.collection('initiatives').doc(initiativeId);
    const initiativeSnap = await initiativeRef.get();
    if (!initiativeSnap.exists) throw new HttpsError('not-found', 'Initiative not found.');
    const initData = initiativeSnap.data();

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // 1. Increment Initiative Count
    batch.update(initiativeRef, {
        attendanceCount: admin.firestore.FieldValue.increment(1),
        updatedAt: timestamp
    });

    // 2. Create Audit Record
    const attendeeRef = initiativeRef.collection('attendees').doc(`${uid}_${Date.now()}`);
    batch.set(attendeeRef, {
        userId: uid,
        timestamp: timestamp
    });

    // 3. Update User Seasonal Stats (Attendance Days) - Only if profile exists
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        const seasonId = getSeasonId();
        const seasonRef = db.collection('users').doc(uid).collection('seasons').doc(seasonId);
        batch.set(seasonRef, {
            attendanceDays: admin.firestore.FieldValue.increment(1),
            lastSynced: timestamp
        }, { merge: true });
    }

    // 4. Record Transaction for Master Ledger (Unified for Pulse Engine)
    const txnRef = db.collection('transactions').doc();
    batch.set(txnRef, {
        type: 'attendance',
        bizId: initiativeId,
        bizName: initData.title || 'Unknown Initiative', // Pulse Engine expects bizName or initiativeTitle
        initiativeTitle: initData.title || 'Unknown Initiative', // Double-mapped for legacy pulse engines
        userId: uid,
        userNickname: request.auth?.token?.nickname || 'Guest Supporter',
        isGuest: !request.auth,
        status: 'verified',
        timestamp: timestamp,
        updatedAt: timestamp
    });

    await batch.commit();
    return { success: true, message: 'Attendance registered.' };
});

exports.recordguestpurchase = onCall(async (request) => {
    const { bizId, guestId, amount, receiptId } = request.data;
    if (!bizId || !guestId || !amount || !receiptId) throw new HttpsError('invalid-argument', 'Missing required fields.');
    
    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) throw new HttpsError('invalid-argument', 'Invalid amount.');

    const today = new Date().toISOString().split('T')[0];
    const sessionRef = db.collection('guest_sessions').doc(guestId);
    const sessionSnap = await sessionRef.get();

    // GUEST SENTINEL: Check Global Lockout
    if (sessionSnap.exists) {
        const sessionData = sessionSnap.data();
        if (sessionData.lockoutUntil) {
            const lockoutDate = sessionData.lockoutUntil.toDate();
            if (new Date() < lockoutDate) {
                throw new HttpsError('permission-denied', 'Security Triggered: Excessive attempts detected. Scanner locked for 10 minutes.');
            }
        }
    }

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
        userId: guestId,
        userNickname: 'Guest Supporter',
        isGuest: true,
        amount: finalAmount,
        receiptId,
        status: 'pending',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // ARCHITECTURAL PIVOT: Business Shards are now handled by the Pulse Engine trigger (ontransactioncreated).
    // This ensures O(1) performance for the callable and prevents double-counting.

    const guestRef = db.collection('users').doc(guestId);
    batch.set(guestRef.collection('gratitude_bonds').doc(bizId), {
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
    return { success: true, message: 'Guest Purchase recorded.' };
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

// Duplicate recordinitiativeattendance removed to prevent guest-flow blocking.

/**
 * PULSE ENGINE: Automated Broadcasting, Stats Rebalancing & Discovery Tracking
 * This trigger is the central authority for all economic signals.
 * It handles newsreel broadcasting, user counter increments, and discovery stats.
 */
exports.pulseengine_broadcast = onDocumentCreated('transactions/{txnId}', async (event) => {
    const txn = event.data.data();
    if (!txn) return;

    const bizName = txn.bizName || 'a business';
    const nickname = txn.isGuest ? 'Guest Supporter' : (txn.userNickname || 'Someone');
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
    const { guestId } = request.data;
    const uid = request.auth.uid;

    if (!guestId) throw new HttpsError('invalid-argument', 'guestId is required.');

    // 1. Retrieve all guest transactions & gratitude bonds
    const [txnSnap, bondSnap, userSnap] = await Promise.all([
        db.collection('transactions').where('userId', '==', guestId).get(),
        db.collection('users').doc(guestId).collection('gratitude_bonds').get(),
        db.collection('users').doc(uid).get()
    ]);

    const userNickname = userSnap.exists ? (userSnap.data().nickname || 'Ambassador') : 'Ambassador';

    if (txnSnap.empty && bondSnap.empty) return { success: true, count: 0 };

    const batch = db.batch();
    let checkins = 0;
    let purchases = 0;
    const bizStatsMigration = {}; // bizId -> { guestCheckins, guestPurchases }

    // Migrate Transactions
    txnSnap.forEach(doc => {
        const data = doc.data();
        if (data.type === 'checkin') checkins++;
        else if (data.type === 'purchase') purchases++;

        // Update Ledger
        batch.update(doc.ref, {
            userId: uid,
            isGuest: false,
            userNickname: userNickname,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    // Migrate Gratitude Bonds
    bondSnap.forEach(doc => {
        const data = doc.data();
        const memberBondRef = db.collection('users').doc(uid).collection('gratitude_bonds').doc(doc.id);
        batch.set(memberBondRef, data, { merge: true });
        batch.delete(doc.ref); // Cleanup guest bond
    });

    // 2. Update user profile stats
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, {
        checkins: admin.firestore.FieldValue.increment(checkins),
        purchases: admin.firestore.FieldValue.increment(purchases),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();

    // 3. CLEANUP ORPHANED GUEST DATA
    try {
        const cleanupBatch = db.batch();
        cleanupBatch.delete(db.collection('guest_sessions').doc(guestId));
        cleanupBatch.delete(db.collection('users').doc(guestId));
        console.log("RECONCILE: Reconcile complete. Stats updated.");
    } catch (err) {
        console.error("RECONCILE: Reconciliation failed:", err);
    }
});

/**
 * INTELLIGENCE: Daily Demographic Aggregator (V2)
 * Compiles anonymized network percentages for Gender, Geography, and Age.
 * Enforces a 5% Privacy Floor per category.
 */
exports.aggregatenetworkdemographics = onSchedule('0 3 * * *', async (event) => {
    try {
        console.log("INTELLIGENCE: Starting demographic aggregation...");
        const usersSnap = await db.collection('users').get();
        const total = usersSnap.size;
        
        if (total === 0) return;

        const counts = {
            gender: { Male: 0, Female: 0, Private: 0 },
            location: {},
            age: { "18-25": 0, "26-35": 0, "36-45": 0, "46-60": 0, "60+": 0, "Private": 0 }
        };

        const now = new Date();

        usersSnap.forEach(doc => {
            const u = doc.data();
            
            // 1. Gender
            if (u.gender) counts.gender[u.gender] = (counts.gender[u.gender] || 0) + 1;
            else counts.gender.Private++;

            // 2. Location (City/District)
            const loc = u.city || 'Private';
            counts.location[loc] = (counts.location[loc] || 0) + 1;

            // 3. Age
            if (u.dob) {
                const birthDate = new Date(u.dob);
                let age = now.getFullYear() - birthDate.getFullYear();
                const m = now.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;

                if (age < 18) return; // Exclude minors per policy
                if (age <= 25) counts.age["18-25"]++;
                else if (age <= 35) counts.age["26-35"]++;
                else if (age <= 45) counts.age["36-45"]++;
                else if (age <= 60) counts.age["46-60"]++;
                else counts.age["60+"]++;
            } else {
                counts.age.Private++;
            }
        });

        // Calculate Percentages with 5% Floor
        const calculatePercentages = (categoryCounts) => {
            const res = {};
            let otherTotal = 0;
            
            for (const [key, count] of Object.entries(categoryCounts)) {
                const pct = (count / total) * 100;
                if (pct < 5 && key !== 'Private') {
                    otherTotal += count;
                } else {
                    res[key] = Number(pct.toFixed(1));
                }
            }
            
            if (otherTotal > 0) {
                res["Other"] = Number(((otherTotal / total) * 100).toFixed(1));
            }
            return res;
        };

        const demographics = {
            gender: calculatePercentages(counts.gender),
            location: calculatePercentages(counts.location),
            age: calculatePercentages(counts.age),
            totalAmbassadors: total,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('system').doc('demographics').set(demographics);
        console.log("INTELLIGENCE: Demographic aggregation complete.");
    } catch (err) {
        console.error("INTELLIGENCE: Aggregation failed:", err);
    }
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
        let guestCheckins = 0;
        let purchases = 0;
        let guestPurchases = 0;
        let volume = 0;

        bizTxns.forEach(doc => {
            const d = doc.data();
            if (d.status !== 'verified' && d.status !== 'pending') return;
            
            if (d.type === 'checkin') {
                checkins++;
                if (d.isGuest) guestCheckins++;
            } else if (d.type === 'purchase') {
                purchases++;
                if (d.isGuest) guestPurchases++;
                volume += (d.amount || 0);
            }
        });

        const bizRef = db.collection('businesses').doc(bizId);
        batch.set(bizRef, {
            checkinsCount: checkins,
            guestCheckinsCount: guestCheckins,
            purchasesCount: purchases,
            guestPurchasesCount: guestPurchases,
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

/**
 * THE HEALER: Nightly Authoritative Reconciliation (3 AM)
 * Resets all global and business shards to 0 and calculates absolute truth from the Master Ledger.
 */
exports.reconcilenetworkstats = onSchedule("0 3 * * *", async (event) => {
    console.log("HEALER: Starting 3 AM Authoritative Calibration...");
    
    // 1. Calculate Absolute Truth from Ledger
    const txnSnap = await db.collection('transactions').get();
    let global = { checkins: 0, guestCheckins: 0, purchases: 0, purchaseVolume: 0, totalAttendance: 0 };
    const bizStats = {};

    txnSnap.forEach(doc => {
        const t = doc.data();
        // Global
        if (t.type === 'checkin') {
            global.checkins++;
            if (t.isGuest) global.guestCheckins++;
        } else if (t.type === 'purchase') {
            global.purchases++;
            if (t.amount) global.purchaseVolume += t.amount;
        } else if (t.type === 'attendance') {
            global.totalAttendance++;
        }

        // Business Specific
        if (t.bizId) {
            if (!bizStats[t.bizId]) bizStats[t.bizId] = { checkinsCount: 0, guestCheckinsCount: 0, purchasesCount: 0, guestPurchasesCount: 0, purchaseVolume: 0 };
            const b = bizStats[t.bizId];
            if (t.type === 'checkin') {
                b.checkinsCount++;
                if (t.isGuest) b.guestCheckinsCount++;
            } else if (t.type === 'purchase') {
                b.purchasesCount++;
                if (t.isGuest) b.guestPurchasesCount++;
                if (t.amount) b.purchaseVolume += t.amount;
            }
        }
    });

    // 2. Update Global Root & Reset Shards
    const statsRef = db.collection('system').doc('stats');
    await statsRef.set({
        ...global,
        consumers: (await db.collection('users').get()).size,
        businesses: (await db.collection('businesses').get()).size,
        lastHealed: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const globalShards = await statsRef.collection('shards').get();
    let batch = db.batch();
    globalShards.forEach(s => batch.delete(s.ref));
    await batch.commit();

    // 3. Update Business Roots & Reset Shards
    for (const bizId in bizStats) {
        const bRef = db.collection('businesses').doc(bizId);
        await bRef.update({
            "impact_metrics.checkinsCount": bizStats[bizId].checkinsCount,
            "impact_metrics.guestCheckinsCount": bizStats[bizId].guestCheckinsCount,
            "impact_metrics.purchasesCount": bizStats[bizId].purchasesCount,
            "impact_metrics.guestPurchasesCount": bizStats[bizId].guestPurchasesCount,
            "impact_metrics.purchaseVolume": bizStats[bizId].purchaseVolume,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const bizShards = await bRef.collection('shards').get();
        const bBatch = db.batch();
        bizShards.forEach(s => bBatch.delete(s.ref));
        await bBatch.commit();
    }

    // 4. Update Initiative Roots (Nightly Reconciliation)
    const initSnap = await db.collection('initiatives').get();
    for (const initDoc of initSnap.docs) {
        const attendeesSnap = await initDoc.ref.collection('attendees').get();
        await initDoc.ref.update({
            attendanceCount: attendeesSnap.size,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    console.log("HEALER: Network reconciled. Shards reset.");
    return null;
});

/**
 * INTELLIGENCE: Daily Demographic Aggregator (V2)
 * Compiles anonymized network percentages for Gender, Geography, and Age.
 * Enforces a 5% Privacy Floor per category.
 */
exports.aggregatenetworkdemographics = onSchedule('0 3 * * *', async (event) => {
    try {
        const admin = require("firebase-admin");
        const db = admin.firestore();
        console.log("INTELLIGENCE: Starting demographic aggregation...");
        const usersSnap = await db.collection('users').get();
        const total = usersSnap.size;
        
        if (total === 0) return null;

        const counts = {
            gender: { Male: 0, Female: 0, Private: 0 },
            location: {},
            age: { "18-25": 0, "26-35": 0, "36-45": 0, "46-60": 0, "60+": 0, "Private": 0 }
        };

        const now = new Date();

        usersSnap.forEach(doc => {
            const u = doc.data();
            
            // 1. Gender
            if (u.gender) counts.gender[u.gender] = (counts.gender[u.gender] || 0) + 1;
            else counts.gender.Private++;

            // 2. Location (City/District)
            const loc = u.city || 'Private';
            counts.location[loc] = (counts.location[loc] || 0) + 1;

            // 3. Age
            if (u.dob) {
                const birthDate = new Date(u.dob);
                let age = now.getFullYear() - birthDate.getFullYear();
                const m = now.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;

                if (age < 18) return; // Exclude minors per policy
                if (age <= 25) counts.age["18-25"]++;
                else if (age <= 35) counts.age["26-35"]++;
                else if (age <= 45) counts.age["36-45"]++;
                else if (age <= 60) counts.age["46-60"]++;
                else counts.age["60+"]++;
            } else {
                counts.age.Private++;
            }
        });

        // Calculate Percentages with 5% Floor
        const calculatePercentages = (categoryCounts) => {
            const res = {};
            let otherTotal = 0;
            
            for (const [key, count] of Object.entries(categoryCounts)) {
                const pct = (count / total) * 100;
                if (pct < 5 && key !== 'Private') {
                    otherTotal += count;
                } else {
                    res[key] = Number(pct.toFixed(1));
                }
            }
            
            if (otherTotal > 0) {
                res["Other"] = Number(((otherTotal / total) * 100).toFixed(1));
            }
            return res;
        };

        const demographics = {
            gender: calculatePercentages(counts.gender),
            location: calculatePercentages(counts.location),
            age: calculatePercentages(counts.age),
            totalAmbassadors: total,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('system').doc('demographics').set(demographics);
        console.log("INTELLIGENCE: Demographic aggregation complete.");
        return null;
    } catch (err) {
        console.error("INTELLIGENCE: Aggregation failed:", err);
        return null;
    }
});

