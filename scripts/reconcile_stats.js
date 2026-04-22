const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function reconcileStats() {
    console.log("Reconciling System Stats...");
    
    // 1. Count Businesses
    const bizSnap = await db.collection('businesses').get();
    const bizCount = bizSnap.size;
    
    // 2. Count Users
    const userSnap = await db.collection('users').get();
    const userCount = userSnap.size;
    
    // 3. Aggregate Transactions
    const transSnap = await db.collection('transactions').get();
    let checkins = 0;
    let purchases = 0;
    let volume = 0;
    
    transSnap.forEach(doc => {
        const data = doc.data();
        if (data.type === 'checkin') checkins++;
        if (data.type === 'purchase') {
            purchases++;
            volume += (data.amount || 0);
        }
    });

    const stats = {
        consumers: userCount,
        businesses: bizCount,
        checkins: checkins,
        purchases: purchases,
        purchaseVolume: volume,
        gdpPenetration: "0.01%", // Initial baseline
        lastReconciled: new Date().toISOString()
    };

    await db.collection('system').doc('stats').set(stats, { merge: true });
    
    console.log("Stats Updated:", stats);
}

reconcileStats().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
