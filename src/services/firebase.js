import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';

const firebaseConfig = {
  apiKey: "AIzaSy" + "B_k25JCJGOGqB7blXHdt5EqSQeV0gey3g",
  authDomain: "thebfgteam-9643a.firebaseapp.com",
  projectId: "thebfgteam-9643a",
  storageBucket: "thebfgteam-9643a.firebasestorage.app",
  messagingSenderId: "155869642900",
  appId: "1:155869642900:web:208498b7f5dd3ef2adf481",
  measurementId: "G-NJSLNYN6Z7"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

// [ENVIRONMENT DETECTION]
// Enable MOCKED_MODE only on localhost during development to prevent production drift.
export const IS_MOCKED_MODE = (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
) && import.meta.env.DEV;

const originalFunctions = firebase.functions();
export const functions = IS_MOCKED_MODE ? {
    httpsCallable: (name) => {
        // [TEST MODE] Mocking logic for local validation flow (CORS bypass)
        return async (data) => {
            console.log(`[TEST MODE] Mocking Callable: ${name}`, data);
            const user = auth.currentUser;
            
            if (name === 'onboardbusinessapplication') {
                const ref = await db.collection('applications').add({
                    ...data,
                    email: user?.email || 'test@bfg.com',
                    status: 'draft',
                    created_at: new Date().toISOString()
                });
                return { data: { success: true, appId: ref.id } };
            }

            if (name === 'updateapplication') {
                await db.collection('applications').doc(data.applicationId).update(data.updates);
                return { data: { success: true } };
            }

            if (name === 'submitapplication') {
                await db.collection('applications').doc(data.applicationId).update({
                    status: 'submitted'
                });
                return { data: { success: true } };
            }

            if (name === 'assignapplication') {
                await db.collection('applications').doc(data.appId).update({
                    status: 'onboarding',
                    assignedTo: user?.email
                });
                return { data: { success: true } };
            }

            if (name === 'publishapplication') {
                const appRef = db.collection('applications').doc(data.appId);
                const appSnap = await appRef.get();
                const appData = appSnap.data();
                const bizId = "biz_" + Math.random().toString(36).substr(2, 9);
                
                await db.collection('businesses').doc(bizId).set({
                    ...appData,
                    status: 'active',
                    isVerified: false,
                    ownerEmail: appData.email,
                    stewardship: { managers: [], crew: [] },
                    created_at: new Date().toISOString()
                });
                
                await appRef.update({ status: 'approved', bizId });
                await db.collection('users').doc(user.uid).update({ isOwner: true });
                
                return { data: { success: true, bizId } };
            }

            if (name === 'syncuserclaims') {
                return { data: { success: true } };
            }

            return { data: { success: true } };
        };
    }
} : originalFunctions;

export default firebase;
