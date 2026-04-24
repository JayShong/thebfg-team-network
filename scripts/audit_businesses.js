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
    
    let issues = [];
    let verifiedCount = 0;
    
    bizSnap.forEach(doc => {
        const data = doc.id ? doc.data() : {};
        const bizIssues = [];
        
        if (!data.name) bizIssues.push('Missing Name');
        if (!data.industry) bizIssues.push('Missing Industry');
        if (!data.ownerEmail) bizIssues.push('Missing Owner Email');
        if (data.impactJobs === undefined || data.impactJobs === null) bizIssues.push('Missing Impact Jobs');
        if (!data.yearlyAssessments || Object.keys(data.yearlyAssessments).length === 0) bizIssues.push('Missing Yearly Assessments');
        
        if (data.isVerified) verifiedCount++;

        if (bizIssues.length > 0) {
            issues.push({ id: doc.id, name: data.name || 'UNKNOWN', issues: bizIssues });
        }

        console.log(`- ID: ${doc.id}`);
        console.log(`  Name: ${data.name || 'MISSING'}`);
        console.log(`  Status: ${data.status || 'ACTIVE (DEFAULT)'}`);
        console.log(`  Verified: ${data.isVerified || 'FALSE'}`);
        console.log(`  Issues: ${bizIssues.length > 0 ? bizIssues.join(', ') : 'NONE'}`);
        console.log("----------------------------");
    });

    console.log("\n--- AUDIT SUMMARY ---");
    console.log(`Total Businesses: ${bizSnap.size}`);
    console.log(`Verified: ${verifiedCount}`);
    console.log(`Businesses with Issues: ${issues.length}`);
    
    if (issues.length > 0) {
        console.log("\nActionable Fixes Required:");
        issues.forEach(i => {
            console.log(`[ ] ${i.name} (${i.id}): ${i.issues.join(', ')}`);
        });
    } else {
        console.log("All businesses have complete core data structures.");
    }
}

auditBusinesses().then(() => process.exit(0)).catch(err => {
    console.error("Audit failed:", err);
    process.exit(1);
});
