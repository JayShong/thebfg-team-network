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
    const [currentClaims, setCurrentClaims] = useState({});

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


                // 1. IDENTITY GATE (Force fresh token and resolve claims)
                let resolvedClaims = {};
                try {
                    setIsClaimsResolving(true);
                    
                    // SOFT REFRESH: Forces browser to get a fresh token from the server
                    // This prevents 401 errors from stale background sessions.
                    await user.getIdToken(true); 
                    
                    const tokenResult = await user.getIdTokenResult();
                    resolvedClaims = tokenResult.claims;
                    setCurrentClaims(resolvedClaims);
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

                const userData = userDoc.exists ? userDoc.data() : {};
                const profile = { 
                    uid: user.uid, 
                    email: user.email, 
                    ...userData 
                };

                // 3. SECURE ROLE RESOLUTION (Merged Intent)
                // We trust Firestore as the Source of Intent, but Auth Claims as the Source of Truth.
                // Merging them in the UI ensures the portals appear immediately while claims sync.
                const isSuperAdmin = !!resolvedClaims.isSuperAdmin || !!profile.isSuperAdmin;
                const isAuditor = !!resolvedClaims.isAuditor || !!resolvedClaims.isSuperAdmin || !!profile.isAuditor;
                const isCustomerSuccess = !!resolvedClaims.isCustomerSuccess || !!resolvedClaims.isSuperAdmin || !!profile.isCustomerSuccess;

                profile.isSuperAdmin = isSuperAdmin;
                profile.isAuditor = isAuditor;
                profile.isCustomerSuccess = isCustomerSuccess;

                // 4. SECURITY INTEGRITY CHECK: Detect if Auth Claims are lagging behind Firestore Intent
                const needsSync = (!!profile.isSuperAdmin && !resolvedClaims.isSuperAdmin) ||
                                  (!!profile.isAuditor && !resolvedClaims.isAuditor) ||
                                  (!!profile.isCustomerSuccess && !resolvedClaims.isCustomerSuccess);

                if (needsSync) {
                    console.error("🔐 AUTH: Security Token Mismatch. Session invalidated for safety.");
                    alert("Your security session has expired or requires re-validation. For your protection, please log in again.");
                    auth.signOut();
                    setCurrentUser(null);
                    setLoading(false);
                    return;
                }

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

                // 4. STEWARDSHIP DETECTION (Quota-Friendly Cache)
                // We cache the stewardship status directly in the user document to avoid 
                // expensive multi-collection queries on every load.
                
                if (userData.stewardshipSyncedAt) {
                    // Use cached intent from Firestore profile
                    profile.isOwner = !!userData.isOwner;
                    profile.isManager = !!userData.isManager;
                    profile.isCrew = !!userData.isCrew;
                    profile.isBusinessStaff = !!userData.isBusinessStaff;
                } else {
                    // Missing cache: Perform one-time discovery and save back to profile
                    try {
                        console.log("🛠️ AUTH: Discovering stewardship roles for first-time sync...");
                        const [ownedSnap, managedSnap, crewSnap] = await Promise.all([
                            db.collection('businesses').where('ownerEmail', '==', user.email).limit(1).get(),
                            db.collection('businesses').where('stewardship.managers', 'array-contains', user.email).limit(1).get(),
                            db.collection('businesses').where('stewardship.crew', 'array-contains', user.email).limit(1).get()
                        ]);
                        
                        profile.isOwner = !ownedSnap.empty;
                        profile.isManager = !managedSnap.empty;
                        profile.isCrew = !crewSnap.empty;
                        profile.isBusinessStaff = profile.isOwner || profile.isManager || profile.isCrew;

                        // Persist to user document for zero-read loads next time
                        db.collection('users').doc(user.uid).set({
                            isOwner: profile.isOwner,
                            isManager: profile.isManager,
                            isCrew: profile.isCrew,
                            isBusinessStaff: profile.isBusinessStaff,
                            stewardshipSyncedAt: new Date().toISOString()
                        }, { merge: true });
                    } catch (e) {
                        console.warn("AUTH: Stewardship discovery deferred", e);
                        profile.isBusinessStaff = false;
                    }
                }

                setCurrentUser(profile);
                
                // Fetch secondary data
                fetchRecentActivity(); 
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
