import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import firebase from 'firebase/compat/app';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isClaimsResolving, setIsClaimsResolving] = useState(true);
    const [isGuest, setIsGuest] = useState(localStorage.getItem('bfg_guest_mode') === 'true');
    const [ghostId, setGhostId] = useState(() => {
        let gid = localStorage.getItem('bfg_ghost_id');
        if (!gid) {
            gid = 'ghost_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('bfg_ghost_id', gid);
        }
        return gid;
    });
    const [localActivities, setLocalActivities] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

    // Safety: Force resolution/loading if it hangs (e.g. 3rd party cookie block, network issues)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("⚠️ AUTH: Initialization timeout. Forcing loading to false.");
                setLoading(false);
            }
            if (isClaimsResolving) {
                console.warn("⚠️ AUTH: Claims resolution timeout. Forcing resolution to false.");
                setIsClaimsResolving(false);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading, isClaimsResolving]);

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

                // 1. BOOTSTRAP GATE (Deterministic Security resolution)
                const BOOTSTRAP_TARGET = 'jayshong@gmail.com';
                let currentClaims = {};
                
                const activateMasterKey = async (targetUser, retryCount = 0) => {
                    try {
                        const { functions } = await import('../services/firebase');
                        const bootstrapFunc = functions.httpsCallable('bootstraprootadmin');
                        
                        // Use exponential backoff for retries
                        if (retryCount > 0) {
                            await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1500));
                        } else {
                            await new Promise(r => setTimeout(r, 1000)); // Increased base delay
                        }
                        
                        // FORCE TOKEN REFRESH before calling
                        // This ensures the Functions SDK has a fresh, valid token in its context
                        console.log(`🔐 AUTH: Refreshing identity token (Attempt ${retryCount + 1})...`);
                        await targetUser.getIdToken(true);
                        
                        await bootstrapFunc();
                        const refreshedToken = await targetUser.getIdTokenResult(true);
                        const claims = refreshedToken.claims;
                        
                        if (claims.isSuperAdmin) {
                            console.log("🔐 AUTH: Master Key successfully installed.");
                            // Update the current user state with new claims
                            setCurrentUser(prev => prev ? {
                                ...prev,
                                isSuperAdmin: true,
                                isAuditor: true,
                                isCustomerSuccess: true
                            } : null);
                        }
                    } catch (err) {
                        console.error(`❌ AUTH: Master Key activation attempt ${retryCount + 1} failed:`, err.message);
                        // Final attempt failed - Force logout to clear stale session
                        if (retryCount >= 2) {
                            console.error("🚨 AUTH: Master Key activation critically failed. Purging stale session...");
                            alert("Security Session Expired. Please log in again to activate the Master Key.");
                            auth.signOut();
                        } else {
                            activateMasterKey(targetUser, retryCount + 1);
                        }
                    }
                };

                // 1. BOOTSTRAP GATE (Deterministic Security resolution)
                try {
                    setIsClaimsResolving(true);
                    let tokenResult = await user.getIdTokenResult();
                    currentClaims = tokenResult.claims;

                    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';
                    
                    if (user.email === BOOTSTRAP_TARGET && !currentClaims.isSuperAdmin && !isLoginPage) {
                        console.warn("🔐 AUTH: Root Admin detected. Initiating background Master Key activation...");
                        activateMasterKey(user);
                    } else if (currentClaims.isSuperAdmin) {
                        console.log("🛡️ AUTH: Secure Master Key confirmed.");
                    }
                } catch (e) {
                    console.error("⚠️ AUTH: Claims check failed", e);
                } finally {
                    setIsClaimsResolving(false);
                }

                // 2. Fetch profile from DB (Proceed immediately, it will re-fetch or catch up)
                let userDoc;
                try {
                    userDoc = await db.collection('users').doc(user.uid).get();
                } catch (e) {
                    console.error("❌ AUTH: Firestore profile read failed. Permissions insufficient?", e);
                    userDoc = { exists: false, data: () => ({}) };
                }
                
                // AUTO-PROVISIONING
                if (!userDoc.exists && !isClaimsResolving) {
                    console.log("Auto-provisioning profile for:", user.email);
                    try {
                        const defaultProfile = {
                            email: user.email,
                            name: user.email.split('@')[0],
                            purchases: 0,
                            checkins: 0,
                            purchaseVolume: 0,
                            created_at: new Date().toISOString()
                        };
                        await db.collection('users').doc(user.uid).set(defaultProfile);
                        userDoc = await db.collection('users').doc(user.uid).get();
                    } catch (err) {
                        console.warn("Provisioning failed - likely security rules catch-up");
                    }
                }

                // 3. SECURE ROLE RESOLUTION
                let profile = {
                    uid: user.uid,
                    email: user.email,
                    purchases: 0,
                    checkins: 0,
                    ...userDoc.data()
                };

                // Use Claims as the Primary Source of Truth for roles
                profile.isSuperAdmin = !!currentClaims.isSuperAdmin;
                profile.isAuditor = !!currentClaims.isAuditor || !!currentClaims.isSuperAdmin;
                profile.isCustomerSuccess = !!currentClaims.isCustomerSuccess || !!currentClaims.isSuperAdmin;

                let finalProfile = {
                    ...profile
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

                setCurrentUser(finalProfile);
                
                // Only trigger secondary data fetches if we aren't currently resolving claims
                if (user.email === BOOTSTRAP_TARGET && !currentClaims.isSuperAdmin) {
                    console.log("⏳ AUTH: Delaying activity sync until Master Key is ready...");
                } else {
                    fetchRecentActivity(); 
                    fetchPendingAudits(finalProfile);
                }
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
        isClaimsResolving,
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
