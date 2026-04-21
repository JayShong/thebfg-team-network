import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

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
export default firebase;
