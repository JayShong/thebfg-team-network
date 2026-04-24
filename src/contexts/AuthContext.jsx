import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import firebase from 'firebase/compat/app';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(localStorage.getItem('bfg_guest_mode') === 'true');
    const [ghostId, setGhostId] = useState(() => {
        let gid = localStorage.getItem('bfg_ghost_id');
        if (!gid) {
            gid = 'ghost_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('bfg_ghost_id', gid);
        }
        return gid;
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [localActivities, setLocalActivities] = useState([]);
    const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

    const fetchPendingAudits = async (user) => {
        const activeUser = user || currentUser;
        if (!activeUser || (!activeUser.isSuperAdmin && !activeUser.isAuditor)) {
            setPendingApprovalCount(0);
            return;
        }

        try {
            let query = db.collection('audit_logs').where('status', '==', 'PENDING_APPROVAL');
            
            // If not superadmin, we can only count audits assigned to us
            // Note: Cloud Functions count() is very fast
            if (!activeUser.isSuperAdmin) {
                query = query.where('supervisorEmail', '==', activeUser.email);
            }


            const snapshot = await query.get();
            setPendingApprovalCount(snapshot.size);
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

    const addLocalActivity = (text) => {
        setLocalActivities(prev => [{
            id: `local-${Date.now()}`,
            text,
            type: 'activity',
            timestamp: new Date()
        }, ...prev].slice(0, 5)); // Keep only last 5 local activities
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
                    isCustomerSuccess: user.email === ROOT_ADMIN_EMAIL || userDoc.data()?.isCustomerSuccess,
                    purchases: 0,
                    checkins: 0,
                    ...userDoc.data()
                };

                // Admin/Merchant Assistant UI Access
                // Removed: isSuperAdmin leak for Merchant Assistants. 
                // Each portal is now strictly partitioned by specific role flags.

                // 4. SYNC STATS: Populate localStorage from pre-calculated Firestore summary
                try {
                    const summaryDoc = await db.collection('users')
                        .doc(user.uid)
                        .collection('counters')
                        .doc('summary')
                        .get();

                    if (summaryDoc.exists) {
                        const s = summaryDoc.data();
                        const pStats = {
                            totalCheckins: s.totalCheckins || 0,
                            totalPurchases: s.totalPurchases || 0,
                            totalWaste: s.totalWaste || 0,
                            totalTrees: s.totalTrees || 0,
                            totalFamilies: s.totalFamilies || 0,
                            uniqueBizIds: s.uniqueBizIds || {},
                            uniqueLocations: s.uniqueLocations || {},
                            uniqueIndustries: s.uniqueIndustries || {},
                            lastSynced: new Date().toISOString()
                        };
                        localStorage.setItem('bfg_personal_stats', JSON.stringify(pStats));
                        console.log("AUTH: Stats synced from Firestore summary.");
                    }
                } catch (e) {
                    console.error("AUTH: Stats sync failed", e);
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

    const getStewardshipLevel = (biz) => {
        if (!currentUser || !biz) return null;
        const email = currentUser.email;
        if (biz.ownerEmail === email || (biz.stewardship?.founders || []).includes(email)) return 'founder';
        if ((biz.stewardship?.managers || []).includes(email)) return 'manager';
        if ((biz.stewardship?.crew || []).includes(email)) return 'crew';
        if (currentUser.isCustomerSuccess || currentUser.isSuperAdmin) return 'support';
        return null;
    };

    const updateProfile = async (data) => {
        if (!currentUser) return;
        await db.collection('users').doc(currentUser.uid).update(data);
        setCurrentUser(prev => ({ ...prev, ...data }));
    };

    const value = {
        currentUser,
        isGuest,
        ghostId,
        recentActivity,
        localActivities,
        addLocalActivity,
        pendingApprovalCount,
        fetchRecentActivity,
        login,
        signup,
        getStewardshipLevel,
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
