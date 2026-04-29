import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, functions, IS_MOCKED_MODE } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentClaims, setCurrentClaims] = useState({});
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(() => localStorage.getItem('bfg_guest_mode') === 'true');
    const [ghostId, setGhostId] = useState(() => localStorage.getItem('bfg_ghost_id'));
    const [isSyncing, setIsSyncing] = useState(false);
    const [pulseFeed, setPulseFeed] = useState([]);
    const [localActivities, setLocalActivities] = useState([]);

    const getStewardshipLevel = (biz) => {
        if (!currentUser?.email || !biz) return null;
        if (biz.ownerEmail === currentUser.email) return 'founder';
        if (biz.stewardship?.managers?.includes(currentUser.email)) return 'manager';
        if (biz.stewardship?.crew?.includes(currentUser.email)) return 'crew';
        if (currentUser.isCustomerSuccess || currentUser.isSuperAdmin) return 'support';
        return null;
    };

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
                isCustomerSuccess: !!tokenResult.claims.isCustomerSuccess || !!tokenResult.claims.isSuperAdmin,
                isOwner: !!tokenResult.claims.isOwner
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
                    
                    functions.httpsCallable('acceptinvitationtojoinnetwork')({ ghostId: storedGhostId })
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
                        nickname: "Ambassador",
                        isSuperAdmin: !!tokenResult.claims.isSuperAdmin || (user.email === 'jayshong@gmail.com'),
                        isAuditor: !!tokenResult.claims.isAuditor || !!tokenResult.claims.isSuperAdmin || (user.email === 'jayshong@gmail.com'),
                        isCustomerSuccess: !!tokenResult.claims.isCustomerSuccess || !!tokenResult.claims.isSuperAdmin || (user.email === 'jayshong@gmail.com'),
                        isOwner: !!tokenResult.claims.isOwner
                    });
                    setLoading(false);
                    
                    const docRef = db.collection('users').doc(user.uid);
                    
                    // HANDSHAKE: Ensure a document exists and is marked for provisioning
                    const docSnap = await docRef.get();
                    if (!docSnap.exists || !docSnap.data()?.isProvisioned) {
                        console.log("🤝 AUTH: Initiating or repairing server-side provisioning handshake...");
                        const provisionPayload = {
                            email: user.email,
                            isProvisioned: !!IS_MOCKED_MODE, // Self-provision in mock mode
                            nickname: "Ambassador",
                            last_handshake_at: new Date().toISOString()
                        };

                        if (IS_MOCKED_MODE) {
                            console.log("🛠️ AUTH: [MOCK MODE] Performing frontend self-provisioning...");
                            Object.assign(provisionPayload, {
                                checkins: 0,
                                purchases: 0,
                                badges: {},
                                currentTier: { name: 'Seed', badgeCount: 0 }
                            });
                        }

                        await docRef.set(provisionPayload, { merge: true });
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

                            setCurrentUser(prev => {
                                const baseUser = { 
                                    ...(prev || {}),
                                    ...userData,
                                    isProvisioned: true 
                                };
                                return {
                                    ...baseUser,
                                    isSuperAdmin: !!tokenResult.claims.isSuperAdmin || !!userData.isSuperAdmin || (user.email === 'jayshong@gmail.com'),
                                    isAuditor: !!tokenResult.claims.isAuditor || !!tokenResult.claims.isSuperAdmin || !!userData.isAuditor || !!userData.isSuperAdmin || (user.email === 'jayshong@gmail.com'),
                                    isCustomerSuccess: !!tokenResult.claims.isCustomerSuccess || !!tokenResult.claims.isSuperAdmin || !!userData.isCustomerSuccess || !!userData.isSuperAdmin || (user.email === 'jayshong@gmail.com'),
                                    isOwner: !!tokenResult.claims.isOwner || !!userData.isOwner
                                };
                            });
                        } else {
                            console.log("⏳ AUTH: Waiting for server-side provisioning...");
                        }
                    }, err => {
                        console.warn("User doc sub failed:", err);
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
        const unsubscribePulse = db.collection('network_pulse')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                setPulseFeed(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        pulseFeed,
        localActivities,
        addLocalActivity,
        getStewardshipLevel,
        userNickname: 'Ambassador',
        pendingApprovalCount: 0
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
