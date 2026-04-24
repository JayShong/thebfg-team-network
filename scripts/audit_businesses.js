const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function auditBusinesses() {
    console.log("--- BUSINESS COLLECTION AUDIT ---");
    const bizSnap = await db.collection('businesses').get();
    console.log(`Total Documents: ${bizSnap.size}`);
    
    bizSnap.forEach(doc => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  Name: ${data.name || 'MISSING'}`);
        console.log(`  Industry: ${data.industry || 'MISSING'}`);
        console.log(`  Owner: ${data.ownerEmail || 'MISSING'}`);
        console.log(`  Status: ${data.status || 'ACTIVE (DEFAULT)'}`);
        console.log(`  Verified: ${data.isVerified || 'FALSE'}`);
        console.log("----------------------------");
    });
}

auditBusinesses().then(() => process.exit(0));
