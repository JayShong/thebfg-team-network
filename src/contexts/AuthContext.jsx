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
            // Pull activities
            const snapshot = await db.collection('transactions')
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
            console.error("Failed to pull recent activity:", e);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setIsGuest(false);
                localStorage.removeItem('bfg_guest_mode');
                // Fetch full profile from DB
                const userDoc = await db.collection('users').doc(user.uid).get();
                // Hardcoded Root Admin Fallback
                const ROOT_ADMIN_EMAIL = 'jayshong@gmail.com';
                
                let profile = {
                    uid: user.uid,
                    email: user.email,
                    isSuperAdmin: user.email === ROOT_ADMIN_EMAIL,
                    isAuditor: user.email === ROOT_ADMIN_EMAIL,
                    purchases: 0,
                    checkins: 0,
                    ...userDoc.data() // Merge existing data
                };

                // Merge real roles from FireStore System roles config (overrides primary)
                try {
                    const rolesDoc = await db.collection('system').doc('roles').get();
                    if (rolesDoc.exists) {
                        const rolesData = rolesDoc.data();
                        // isAdmin array contains emails of users who can manage businesses
                        if (rolesData.isAdmin?.includes(user.email)) {
                            profile.isAdmin = true;
                            // For simplicity, we treat admins as superAdmins for UI access
                            profile.isSuperAdmin = profile.isSuperAdmin || true;
                        }
                        // isAuditor array contains emails of users who can manage impact data
                        if (rolesData.isAuditor?.includes(user.email)) {
                            profile.isAuditor = true;
                        }
                    }
                } catch(e) {
                    console.warn("Dynamic roles unavailable, using static fallback.");
                }

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

    const updateProfile = async (data) => {
        if (!currentUser) return;
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
