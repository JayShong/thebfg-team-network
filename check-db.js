
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCounts() {
  const users = await db.collection('users').get();
  const businesses = await db.collection('businesses').get();
  const transactions = await db.collection('transactions').get();
  
  console.log('Users count:', users.size);
  console.log('Businesses count:', businesses.size);
  console.log('Transactions count:', transactions.size);

  users.forEach(doc => {
      console.log('User:', doc.id, doc.data().email);
  });
}

checkCounts().catch(console.error);
