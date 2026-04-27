import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, functions } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentClaims, setCurrentClaims] = useState({});
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(() => localStorage.getItem('bfg_guest_mode') === 'true');
    const [ghostId, setGhostId] = useState(() => localStorage.getItem('bfg_ghost_id'));
    const [isSyncing, setIsSyncing] = useState(false);
    const [recentActivity, setRecentActivity] = useState([]);
    const [localActivities, setLocalActivities] = useState([]);

    const addLocalActivity = (text) => {
        const newAct = { text, timestamp: new Date(), type: 'local' };
        setLocalActivities(prev => [newAct, ...prev].slice(0, 5));
    };


    const syncRoles = async () => {
        setIsSyncing(true);
        try {
            const syncFn = functions.httpsCallable('syncuserclaims');
            await syncFn();
            const tokenResult = await auth.currentUser.getIdTokenResult(true);
            setCurrentClaims(tokenResult.claims);
            setCurrentUser(prev => ({
                ...(prev || {}),
                isSuperAdmin: !!tokenResult.claims.isSuperAdmin,
                isAuditor: !!tokenResult.claims.isAuditor || !!tokenResult.claims.isSuperAdmin,
                isCustomerSuccess: !!tokenResult.claims.isCustomerSuccess || !!tokenResult.claims.isSuperAdmin
            }));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setIsSyncing(false);
        }
    };

    const login = (email, password) => {
        return auth.signInWithEmailAndPassword(email, password);
    };

    const signup = (email, password) => {
        return auth.createUserWithEmailAndPassword(email, password);
    };

    const joinMovement = async (email, password) => {
        try {
            return await login(email, password);
        } catch (err) {
            try {
                return await signup(email, password);
            } catch (createErr) {
                if (createErr.code === 'auth/email-already-in-use') {
                    throw new Error("Invalid credentials. Please check your password.");
                }
                throw createErr;
            }
        }
    };

    useEffect(() => {
        let unsubscribeDoc = null;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            setLoading(true);
            
            if (user) {
                setIsGuest(false);
                localStorage.removeItem('bfg_guest_mode');

                // Identity Handshake: Reclaim anonymous history
                const storedGhostId = localStorage.getItem('bfg_ghost_id');
                if (storedGhostId && !window._bfg_claiming) {
                    window._bfg_claiming = true;
                    console.log("🤝 AUTH: Reclaiming anonymous history for:", storedGhostId);
                    
                    functions.httpsCallable('claimghostactivity')({ ghostId: storedGhostId })
                        .then((result) => {
                            if (result.data?.success) {
                                setGhostId(null);
                                localStorage.removeItem('bfg_personal_stats');
                                localStorage.removeItem('bfg_ghost_id');
                                console.log("🤝 AUTH: Handshake success. Guest cache purged.");
                            } else {
                                console.warn("Handshake backend error:", result.data?.message);
                            }
                        })
                        .catch(err => {
                            console.warn("Handshake failed:", err);
                        })
                        .finally(() => {
                            window._bfg_claiming = false;
                        });
                }


                try {
                    const tokenResult = await user.getIdTokenResult();
                    setCurrentClaims(tokenResult.claims);
                    
                    // INSTANT REVEAL: Set basic user info so the app can render immediately
                    setCurrentUser({ 
                        uid: user.uid, 
                        email: user.email, 
                        isProvisioned: false,
                        isSuperAdmin: !!tokenResult.claims.isSuperAdmin,
                        isAuditor: !!tokenResult.claims.isAuditor || !!tokenResult.claims.isSuperAdmin,
                        isCustomerSuccess: !!tokenResult.claims.isCustomerSuccess || !!tokenResult.claims.isSuperAdmin
                    });
                    setLoading(false);
                    
                    const docRef = db.collection('users').doc(user.uid);
                    
                    // HANDSHAKE: Ensure a document exists to trigger server-side provisioning
                    const docSnap = await docRef.get();
                    if (!docSnap.exists) {
                        console.log("🤝 AUTH: Initiating server-side provisioning handshake...");
                        await docRef.set({
                            email: user.email,
                            isProvisioned: false,
                            created_at: new Date().toISOString()
                        });
                    }

                    // RECEIPT: Listen for the provisioned profile from the server
                    if (unsubscribeDoc) unsubscribeDoc();
                    unsubscribeDoc = docRef.onSnapshot(doc => {
                        if (doc.exists && doc.data().isProvisioned) {
                            const userData = doc.data();
                            
                            // SYNC: Update local storage scorecard with latest server data
                            if (userData.checkins !== undefined || userData.purchases !== undefined) {
                                const currentLocal = localStorage.getItem('bfg_personal_stats');
                                let pStats = {};
                                try { if (currentLocal) pStats = JSON.parse(currentLocal); } catch (e) {}

                                const syncedStats = {
                                    ...pStats,
                                    totalCheckins: userData.checkins || 0,
                                    totalPurchases: userData.purchases || 0,
                                    // Note: Environmental impact fields (wasteKg, trees) aren't always in user doc, 
                                    // but we preserve existing local ones if they aren't provided.
                                    lastRefreshed: new Date().toISOString()
                                };
                                localStorage.setItem('bfg_personal_stats', JSON.stringify(syncedStats));
                            }

                            setCurrentUser(prev => ({ 
                                ...prev,
                                ...userData,
                                isProvisioned: true,
                                isSuperAdmin: !!tokenResult.claims.isSuperAdmin,
                                isAuditor: !!tokenResult.claims.isAuditor || !!tokenResult.claims.isSuperAdmin,
                                isCustomerSuccess: !!tokenResult.claims.isCustomerSuccess || !!tokenResult.claims.isSuperAdmin
                            }));
                        } else {
                            console.log("⏳ AUTH: Waiting for server-side provisioning...");
                        }
                    });

                } catch (err) {
                    setLoading(false);
                }
            } else {
                const guestMode = localStorage.getItem('bfg_guest_mode') === 'true';
                setIsGuest(guestMode);
                
                if (guestMode && !localStorage.getItem('bfg_ghost_id')) {
                    const newId = `GHOST_${window.crypto.randomUUID()}`;
                    setGhostId(newId);
                    localStorage.setItem('bfg_ghost_id', newId);
                }

                setCurrentUser(null);
                setCurrentClaims({});
                setLoading(false);
            }
        });

        // Newsreel Pulse Subscription
        const unsubscribePulse = db.collection('public_activity')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                setRecentActivity(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }, err => console.warn("Pulse stream failed:", err));

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
            unsubscribePulse();
        };

    }, []);

    const logout = () => {
        setIsGuest(false);
        localStorage.removeItem('bfg_guest_mode');
        // bfg_ghost_id and bfg_personal_stats are preserved for future claiming
        setCurrentUser(null);
        setCurrentClaims({});
        return auth.signOut();
    };

    const continueAsGuest = () => {
        setIsGuest(true);
        localStorage.setItem('bfg_guest_mode', 'true');
        if (!localStorage.getItem('bfg_ghost_id')) {
            const newId = `GHOST_${window.crypto.randomUUID()}`;
            setGhostId(newId);
            localStorage.setItem('bfg_ghost_id', newId);
        }
    };


    const sendPasswordReset = (email) => {
        return auth.sendPasswordResetEmail(email);
    };

    const value = {
        currentUser,
        currentClaims,
        loading,
        isGuest,
        isSyncing,
        syncRoles,
        joinMovement,
        login,
        signup,
        logout,
        continueAsGuest,
        sendPasswordReset,
        setLoading,
        ghostId,
        recentActivity,
        localActivities,
        addLocalActivity,
        pendingApprovalCount: 0
    };


    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
