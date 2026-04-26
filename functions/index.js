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
 */
exports.reconcilenetworkstats = onSchedule('every 5 minutes', async (event) => {
    try {
        const [uCount, bCount] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('businesses').count().get()
        ]);
        return db.collection('system').doc('stats').set({
            consumers: uCount.data().count,
            businesses: bCount.data().count,
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
