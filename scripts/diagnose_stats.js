const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function diagnose() {
    console.log("--- SYSTEM STATS ---");
    const statsDoc = await db.collection('system').doc('stats').get();
    if (statsDoc.exists) {
        console.log("Global Stats Found:", statsDoc.data());
    } else {
        console.log("CRITICAL: system/stats document is MISSING from Firestore.");
    }

    console.log("\n--- COLLECTION COUNTS ---");
    const userCount = await db.collection('users').count().get();
    const bizCount = await db.collection('businesses').count().get();
    const transCount = await db.collection('transactions').count().get();
    console.log(`Users: ${userCount.data().count}`);
    console.log(`Businesses: ${bizCount.data().count}`);
    console.log(`Transactions: ${transCount.data().count}`);

    console.log("\n--- USER SUMMARY (Jay Shong) ---");
    // Searching for user by email to get UID
    const userSnap = await db.collection('users').where('email', '==', 'jayshong@gmail.com').get();
    if (!userSnap.empty) {
        const userId = userSnap.docs[0].id;
        console.log(`User ID: ${userId}`);
        const summaryDoc = await db.collection('users').doc(userId).collection('counters').doc('summary').get();
        if (summaryDoc.exists) {
            console.log("User Summary Found:", summaryDoc.data());
        } else {
            console.log("User Summary document is MISSING.");
        }
    } else {
        console.log("User 'jayshong@gmail.com' not found.");
    }
}

diagnose().then(() => process.exit(0));
