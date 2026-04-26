import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, functions } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentClaims, setCurrentClaims] = useState({});
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

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
                setCurrentUser(null);
                setCurrentClaims({});
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    const logout = () => {
        setIsGuest(false);
        localStorage.removeItem('bfg_guest_mode');
        setCurrentUser(null);
        setCurrentClaims({});
        return auth.signOut();
    };

    const continueAsGuest = () => {
        setIsGuest(true);
        localStorage.setItem('bfg_guest_mode', 'true');
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
        recentActivity: [],
        localActivities: [],
        pendingApprovalCount: 0
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
