import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import firebase from 'firebase/compat/app';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(localStorage.getItem('bfg_guest_mode') === 'true');
    const [recentActivity, setRecentActivity] = useState([]);
    const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

    const fetchPendingAudits = async (user) => {
        const activeUser = user || currentUser;
        if (!activeUser || (!activeUser.isSuperAdmin && !activeUser.isAuditor)) {
            setPendingApprovalCount(0);
            return;
        }

        try {
            const snapshot = await db.collection('audit_logs')
                .where('status', '==', 'PENDING_APPROVAL')
                .get();
            
            let count = 0;
            snapshot.forEach(doc => {
                const log = doc.data();
                if (activeUser.isSuperAdmin) {
                    count++;
                } else if (log.supervisorEmails?.includes(activeUser.email)) {
                    count++;
                }
            });
            setPendingApprovalCount(count);
        } catch (e) {
            console.error("Failed to pull pending audits:", e);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            // Pull sanitized public activities for newsreel
            const snapshot = await db.collection('public_activity')
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
            
            const activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRecentActivity(activities);

            // Also pull pending audits for supervisors
            await fetchPendingAudits();
        } catch (e) {
            console.error("Failed to pull newsreel activity:", e);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setIsGuest(false);
                localStorage.removeItem('bfg_guest_mode');
                // Fetch full profile from DB
                let userDoc = await db.collection('users').doc(user.uid).get();
                
                // AUTO-PROVISIONING: If user exists in Auth but not in Firestore (e.g. legacy or failed signup)
                // we create a default profile now to ensure they are counted in the Network Impact.
                if (!userDoc.exists) {
                    console.log("Auto-provisioning profile for:", user.email);
                    const defaultProfile = {
                        email: user.email,
                        name: user.email.split('@')[0], // Fallback nickname
                        purchases: 0,
                        checkins: 0,
                        purchaseVolume: 0,
                        created_at: new Date().toISOString()
                    };
                    await db.collection('users').doc(user.uid).set(defaultProfile);
                    userDoc = await db.collection('users').doc(user.uid).get();
                }

                // Hardcoded Root Admin Fallback
                const ROOT_ADMIN_EMAIL = 'jayshong@gmail.com';
                
                let profile = {
                    uid: user.uid,
                    email: user.email,
                    isSuperAdmin: user.email === ROOT_ADMIN_EMAIL,
                    isAuditor: user.email === ROOT_ADMIN_EMAIL || userDoc.data()?.isAuditor,
                    isMerchantAssistant: user.email === ROOT_ADMIN_EMAIL || userDoc.data()?.isMerchantAssistant,
                    purchases: 0,
                    checkins: 0,
                    ...userDoc.data()
                };

                // Admin/Merchant Assistant UI Access
                // Removed: isSuperAdmin leak for Merchant Assistants. 
                // Each portal is now strictly partitioned by specific role flags.

                setCurrentUser(profile);
                fetchRecentActivity(); // This now calls fetchPendingAudits as well
                fetchPendingAudits(profile);
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Note: Pending audits are now pull-only per user request to reduce costs

    const login = async (email, password) => {
        await auth.signInWithEmailAndPassword(email, password);
    };

    const signup = async (email, password) => {
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        const batch = db.batch();
        const userRef = db.collection('users').doc(credential.user.uid);
        const statsRef = db.collection('system').doc('stats');

        batch.set(userRef, {
            email: email,
            name: email.split('@')[0], // Extract nickname
            purchases: 0,
            checkins: 0,
            purchaseVolume: 0,
            created_at: new Date().toISOString()
        });

        batch.update(statsRef, {
            consumers: firebase.firestore.FieldValue.increment(1)
        });

        await batch.commit();
    };

    const continueAsGuest = () => {
        setIsGuest(true);
        localStorage.setItem('bfg_guest_mode', 'true');
    };

    const logout = () => {
        setIsGuest(false);
        localStorage.removeItem('bfg_guest_mode');
        return auth.signOut();
    };

    const sendPasswordReset = (email) => {
        return auth.sendPasswordResetEmail(email);
    };

    const mockLogin = () => {
        const mockProfile = {
            uid: 'MOCK_OWNER_ID',
            email: 'jayshong@gmail.com', // Recognized as root admin and owner
            name: 'Merchant Partner (Mock)',
            isSuperAdmin: true,
            isAuditor: true,
            isMerchantAssistant: true,
            purchases: 12,
            checkins: 42,
            purchaseVolume: 1250.50,
            nickname: 'Merchant Partner (Mock)'
        };
        setCurrentUser(mockProfile);
        setIsGuest(false);
    };

    const updateProfile = async (data) => {
        if (!currentUser || currentUser.uid === 'MOCK_OWNER_ID') {
            setCurrentUser(prev => ({ ...prev, ...data }));
            return;
        }
        await db.collection('users').doc(currentUser.uid).update(data);
        setCurrentUser(prev => ({ ...prev, ...data }));
    };

    const value = {
        currentUser,
        isGuest,
        recentActivity,
        pendingApprovalCount,
        fetchRecentActivity,
        login,
        mockLogin,
        signup,
        continueAsGuest,
        logout,
        sendPasswordReset,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
