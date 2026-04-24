const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function reconcileStats() {
    console.log("--- STARTING COST-EFFICIENT RECONCILIATION ---");
    
    try {
        // 1. Efficiently count collections using aggregations (1 read per 1000 items)
        const [userCountSnap, bizCountSnap, checkinAgg, purchaseAgg] = await Promise.all([
            db.collection('users').count().get(),
            db.collection('businesses').count().get(),
            db.collection('transactions').where('type', '==', 'checkin').count().get(),
            db.collection('transactions').where('type', '==', 'purchase').where('status', 'in', ['verified', 'approved'])
                .aggregate({
                    totalVolume: admin.firestore.AggregateField.sum('amount'),
                    totalCount: admin.firestore.AggregateField.count()
                }).get()
        ]);

        const userCount = userCountSnap.data().count;
        const bizCount = bizCountSnap.data().count;
        const checkins = checkinAgg.data().count;
        const purchases = purchaseAgg.data().totalCount;
        const volume = purchaseAgg.data().totalVolume || 0;

        // 2. Fetch Business Data for Impact Proportions (Requires fetching docs to see formulas)
        // Note: For very large networks, this would be moved to a background sync or incremental update.
        const bizSnap = await db.collection('businesses').select('impactJobs', 'yearlyAssessments').get();
        let totalFamilies = 0;
        
        bizSnap.forEach(doc => {
            const biz = doc.data();
            totalFamilies += (parseInt(biz.impactJobs) || 0);
        });

        const stats = {
            consumers: userCount,
            businesses: bizCount,
            checkins: checkins,
            purchases: purchases,
            purchaseVolume: volume,
            totalFamilies: totalFamilies,
            gdpPenetration: "0.01%", // Initial baseline, to be calculated dynamically if needed
            lastReconciled: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('system').doc('stats').set(stats, { merge: true });
        
        console.log("Stats Updated Successfully:", stats);
    } catch (error) {
        console.error("Reconciliation failed:", error);
    }
}

reconcileStats().then(() => process.exit(0)).catch(e => { 
    console.error(e); 
    process.exit(1); 
});
