import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TUTORIAL_STEPS } from '../utils/badgeLogic';
import firebase from 'firebase/compat/app';
import MilestoneCelebration, { SUPPORT_MILESTONES, PURCHASE_MILESTONES, DISCOVERY_MILESTONES } from '../components/MilestoneCelebration';
import { updateLocalStatsBuffer } from '../utils/impactEngine';

const Scanner = () => {
    const navigate = useNavigate();
    const { currentUser, guestId, addLocalActivity } = useAuth();
    const [scannedBusiness, setScannedBusiness] = useState(null);
    const [scannedInitiative, setScannedInitiative] = useState(null);
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(true);
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isNaughtyWarning, setIsNaughtyWarning] = useState(false);

    // Sentinel State
    const [sentinelState, setSentinelState] = useState({ lockoutUntil: null, lastCheckins: {}, spamAttempts: {} });
    const [lockoutTimer, setLockoutTimer] = useState(0);

    // Milestone State
    const [activeMilestone, setActiveMilestone] = useState(null);

    useEffect(() => {
        // Detect bizId from URL for Native Camera Scans
        const params = new URLSearchParams(window.location.search);
        const bizIdFromUrl = params.get('bizId');
        if (bizIdFromUrl) {
            handleAutoScan(bizIdFromUrl);
        }
    }, []);

    const handleAutoScan = async (bizId) => {
        try {
            const doc = await db.collection('businesses').doc(bizId).get();
            if (doc.exists) {
                setScannedBusiness({ id: doc.id, ...doc.data() });
                setScanning(false);
                // If it's a URL scan, we can potentially auto-submit if we want 
                // but for now let's just show the business and let them click.
            }
        } catch (e) {
            console.error("Auto-scan failed", e);
        }
    };

    useEffect(() => {
        if (!currentUser) return;

        // Globally Flagged Blocking
        if (currentUser.isFlagged) {
            setLockoutTimer(999999); // Indefinite lockout for flagged identities
            setError('You have been naughty. Contact Jason at our Facebook page for help: https://www.facebook.com/groups/thebfg.team');
            setScanning(false);
            return;
        }

        // Sync Sentinel State from Firestore
        const unsub = db.collection('users').doc(currentUser.uid).collection('sentinel').doc('state').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setSentinelState(data);
                if (data.lockoutUntil) {
                    const diff = Math.ceil((data.lockoutUntil.toDate() - new Date()) / 1000);
                    if (diff > 0) setLockoutTimer(diff);
                } else {
                    setLockoutTimer(0);
                }
            }
        });
        return () => unsub();
    }, [currentUser]);

    useEffect(() => {
        if (lockoutTimer > 0) {
            const t = setInterval(() => setLockoutTimer(prev => prev - 1), 1000);
            return () => clearInterval(t);
        }
    }, [lockoutTimer]);

    useEffect(() => {
        let html5QrCode;
        if (scanning && !scannedBusiness && !isSuccess && lockoutTimer <= 0) {
            html5QrCode = new Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCode.start({ facingMode: "environment" }, config, async (decodedText) => {
                handleScan(decodedText, html5QrCode);
            }, (error) => {
                // Ignore standard frame scan failures
            }).catch(e => console.warn("Scanner start error", e));
        }

        return () => {
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(e => console.warn(e));
            }
        };
    }, [scanning, scannedBusiness, scannedInitiative, isSuccess, lockoutTimer]);

    const handleScan = async (decodedText, html5QrCode) => {
        if (html5QrCode) {
            html5QrCode.stop().then(() => setScanning(false)).catch(e => console.warn(e));
        }

        try {
            // 1. Check for Initiative QR
            if (decodedText.includes('/i/')) {
                const initId = decodedText.split('/i/')[1].split('/')[0].split('?')[0];
                const doc = await db.collection('initiatives').doc(initId).get();
                if (doc.exists) {
                    setScannedInitiative({ id: doc.id, ...doc.data() });
                    setError('');
                    setScanning(false);
                    return;
                }
            }

            // 2. Check for Business QR
            let bizId = decodedText.trim();
            if (decodedText.includes('/b/')) {
                bizId = decodedText.split('/b/')[1].split('/')[0];
            }

            const doc = await db.collection('businesses').doc(bizId).get();
            if (doc.exists) {
                setScannedBusiness({ id: doc.id, ...doc.data() });
                setError('');
                setScanning(false);
            } else {
                setError('Invalid ID or QR Code. Record not found.');
                setScanning(true);
            }
        } catch (e) {
            setError('Failed to process data.');
            setScanning(true);
        }
    };


    const updateLocalStats = (type, amount = 0) => {
        const personalSaved = localStorage.getItem('bfg_personal_stats');
        let currentStats = {
            totalCheckins: 0, totalPurchases: 0, totalWaste: 0, totalTrees: 0, totalFamilies: 0,
            uniqueBizIds: {}, uniqueLocations: {}, uniqueIndustries: {},
            lastCheckin: null, attendanceDays: 0
        };

        try {
            if (personalSaved) {
                currentStats = { ...currentStats, ...JSON.parse(personalSaved) };
            }
        } catch (e) {
            console.warn("Scanner: Personal stats cache corrupt, resetting local buffer");
        }

        const pStats = updateLocalStatsBuffer(currentStats, type, scannedBusiness, amount);

        // Milestone Checks (Kept in UI component for state triggers)
        if (scannedBusiness) {
            const isNewBiz = !currentStats.uniqueBizIds[scannedBusiness.id];
            if (isNewBiz) {
                const discoveryCount = Object.keys(pStats.uniqueBizIds).length;
                if (DISCOVERY_MILESTONES.some(m => m.count === discoveryCount)) {
                    setActiveMilestone({ count: discoveryCount, type: 'discovery' });
                }
            }

            if (type === 'checkin') {
                if (SUPPORT_MILESTONES.some(m => m.count === pStats.totalCheckins)) {
                    setActiveMilestone({ count: pStats.totalCheckins, type: 'support' });
                }
            } else if (type === 'purchase') {
                if (PURCHASE_MILESTONES.some(m => m.count === pStats.totalPurchases)) {
                    setActiveMilestone({ count: pStats.totalPurchases, type: 'purchase' });
                }
            }
        }
        localStorage.setItem('bfg_personal_stats', JSON.stringify(pStats));

        // 2. Update Global Stats (Estimated)
        const globalSaved = localStorage.getItem('bfg_global_stats');
        if (globalSaved) {
            try {
                let gStats = JSON.parse(globalSaved);
                if (type === 'checkin') gStats.checkins++;
                if (type === 'purchase') gStats.purchases++;
                localStorage.setItem('bfg_global_stats', JSON.stringify(gStats));
            } catch (e) {}
        }

        // 3. Update Last Checkins for Sentinel (Frontend Spam Prevention)
        if (type === 'checkin' && scannedBusiness) {
            const today = new Date().toISOString().split('T')[0];
            if (!pStats.lastCheckins) pStats.lastCheckins = {};
            pStats.lastCheckins[scannedBusiness.id] = today;
            localStorage.setItem('bfg_personal_stats', JSON.stringify(pStats));
        }
    };

    const submitAttendance = async () => {
        if (!scannedInitiative || isSubmitting) return;
        setIsSubmitting(true);

        const today = new Date().toISOString().split('T')[0];
        const personalSaved = localStorage.getItem('bfg_personal_stats');
        let pStats = personalSaved ? JSON.parse(personalSaved) : { attendanceDays: 0, lastInitiativeAttendance: {} };

        if (pStats.lastInitiativeAttendance?.[scannedInitiative.id] === today) {
            setError("Conviction noted! You have already registered your attendance for this initiative today.");
            setIsSubmitting(false);
            return;
        }

        try {
            const attendanceFn = firebase.functions().httpsCallable('recordinitiativeattendance');
            await attendanceFn({ 
                initiativeId: scannedInitiative.id,
                guestId: !currentUser ? guestId : null 
            });

            // Update Local Stats
            pStats.attendanceDays = (pStats.attendanceDays || 0) + 1;
            pStats.lastInitiativeAttendance = { ...pStats.lastInitiativeAttendance, [scannedInitiative.id]: today };
            localStorage.setItem('bfg_personal_stats', JSON.stringify(pStats));

            setIsSuccess(true);
            setSuccessMsg(`Attendance registered for: ${scannedInitiative.title}. Thank you for mobilising.`);

            addLocalActivity(currentUser?.nickname || currentUser?.name
                ? `🔥 ${currentUser.nickname || currentUser.name} joined the initiative: ${scannedInitiative.title}`
                : `🔥 Someone joined the initiative: ${scannedInitiative.title}`
            );

            setScannedInitiative(null);
        } catch (e) {
            console.error("Attendance error", e);
            setError(e.message || "Could not register attendance. Ensure you are logged in.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitCheckin = async () => {
        if (!scannedBusiness || isSubmitting) return;
        setIsSubmitting(true);

        // 1. Handle Guest Check-in (Anonymous)
        if (!currentUser) {
            // Guest Sentinel Check (Frontend optimization)
            const today = new Date().toISOString().split('T')[0];
            const personalSaved = localStorage.getItem('bfg_personal_stats');
            let pStats = {};
            try { if (personalSaved) pStats = JSON.parse(personalSaved); } catch (e) {}
            
            if (pStats.lastCheckins?.[scannedBusiness.id] === today) {
                setError("Wow! You are such an enthusiastic supporter. You can support this merchant again tomorrow.");
                setScannedBusiness(null);
                setScanning(true);
                setIsSubmitting(false);
                return;
            }

            try {
                const guestCheckin = firebase.functions().httpsCallable('recordguestcheckin');
                const result = await guestCheckin({ bizId: scannedBusiness.id, guestId });

                if (result.data.success) {
                    setIsSuccess(true);
                    setSuccessMsg("Movement Signal Sent! Your anonymous support strengthens the network's momentum.");
                    
                    // Optimistic UI & Feed
                    updateLocalStats('checkin');
                    const bizName = scannedBusiness.name;
                    setScannedBusiness(null);
                    
                    // Inject local activity AFTER success
                    addLocalActivity(`📍 Guest Supporter checked-in at ${bizName}`);

                    const { evaluateBadges } = await import('../utils/badgeLogic');
                    const newBadges = await evaluateBadges(null);
                    if (newBadges && newBadges.length > 0) {
                        setSuccessMsg(prev => `${prev}\n\n🏆 Discovery Noted: You would have unlocked: ${newBadges.join(', ')}! Accept the invitation to claim them.`);
                    }
                } else {
                    setError(result.data.message || "Could not record acknowledgment.");
                    // Check if it's the 'naughty' warning from backend (Strike 2)
                    if (result.data.message?.toLowerCase().includes('naughty')) {
                        setIsNaughtyWarning(true);
                    }
                }
            } catch (e) {
                console.error("Guest checkin error", e);
                const msg = e.message || "";
                setError(msg || "Network Error: Could not log anonymous support.");
                if (msg.toLowerCase().includes('naughty')) {
                    setIsNaughtyWarning(true);
                }
            } finally {
                setIsSubmitting(false);
            }
            return;
        }


        // 2. Handle Member Check-in
        const today = new Date().toISOString().split('T')[0];
        const lastCheckinDate = sentinelState.lastCheckins?.[scannedBusiness.id];

        if (lastCheckinDate === today) {
            const attempts = (sentinelState.spamAttempts?.[scannedBusiness.id] || 0) + 1;

            if (attempts >= 3) {
                const lockoutDate = new Date(Date.now() + 10 * 60 * 1000);
                await db.collection('users').doc(currentUser.uid).collection('sentinel').doc('state').set({
                    lockoutUntil: firebase.firestore.Timestamp.fromDate(lockoutDate),
                    [`spamAttempts.${scannedBusiness.id}`]: 0
                }, { merge: true });
                setError("Security Triggered: Excessive attempts detected. Scanner locked for 10 minutes.");
                setIsNaughtyWarning(false);
                setScannedBusiness(null);
                setScanning(true);
            } else if (attempts === 2) {
                await db.collection('users').doc(currentUser.uid).collection('sentinel').doc('state').set({
                    [`spamAttempts.${scannedBusiness.id}`]: attempts
                }, { merge: true });
                setError("You have been naughty. This is your final signal before a security lockout.");
                setIsNaughtyWarning(true);
            } else {
                await db.collection('users').doc(currentUser.uid).collection('sentinel').doc('state').set({
                    [`spamAttempts.${scannedBusiness.id}`]: attempts
                }, { merge: true });
                setError("Wow! You are such an enthusiastic supporter. You can support this merchant again tomorrow.");
                setIsNaughtyWarning(false);
            }
            setIsSubmitting(false);
            return;
        }

    const resetScanner = () => {
        setError('');
        setIsNaughtyWarning(false);
        setScannedBusiness(null);
        navigate('/'); // Redirect to Home as per updated Sentinel Recovery protocol
    };

        try {
            const batch = db.batch();
            const transactionRef = db.collection('transactions').doc();

            batch.set(transactionRef, {
                type: 'checkin',
                bizId: scannedBusiness.id,
                bizName: scannedBusiness.name,
                bizIndustry: scannedBusiness.industry || 'Unknown',
                bizLocation: scannedBusiness.location || 'Unknown',
                userId: currentUser.uid,
                userNickname: currentUser.nickname || currentUser.name || 'Ambassador',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'verified'
            });

            batch.set(db.collection('users').doc(currentUser.uid).collection('sentinel').doc('state'), {
                [`lastCheckins.${scannedBusiness.id}`]: today,
                [`spamAttempts.${scannedBusiness.id}`]: 0
            }, { merge: true });

            await batch.commit();
            setIsSuccess(true);
            setSuccessMsg("You just chose conviction over convenience. That matters.");
            updateLocalStats('checkin');
            const bizName = scannedBusiness.name;
            setScannedBusiness(null);

            // Inject local activity for instant newsreel feedback AFTER success
            addLocalActivity(currentUser?.nickname || currentUser?.name
                ? `📍 ${currentUser.nickname || currentUser.name} checked-in at ${bizName}`
                : `📍 Guest Supporter checked-in at ${bizName}`
            );

            const { evaluateBadges } = await import('../utils/badgeLogic');
            const newBadges = await evaluateBadges(currentUser);
            if (newBadges && newBadges.length > 0) {
                setSuccessMsg(prev => `${prev}\n\n🏆 New Token of Empathy Unlocked: ${newBadges.join(', ')}! Visit your profile to see it.`);
            }
        } catch (e) {
            console.error(e);
            setError("Network Error: Could not log activity.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const [purchaseForm, setPurchaseForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [receiptId, setReceiptId] = useState('');

    const submitPurchase = async () => {
        // Now allows either currentUser OR guestId (Guest Mode)
        const activeUserId = currentUser?.uid || guestId;
        if (!activeUserId || !amount || !receiptId || isSubmitting) {
            if (!amount) setError("Please enter the amount.");
            else if (!receiptId) setError("Receipt ID / Bill Number is mandatory for verification.");
            return;
        }

        const finalAmount = parseFloat(amount);
        setIsSubmitting(true);

        if (isNaN(finalAmount) || finalAmount <= 0) {
            setError("Please enter a valid amount.");
            setIsSubmitting(false);
            return;
        }

        try {
            const isGuest = !currentUser;

            if (isGuest) {
                const recordGuestPurchase = firebase.functions().httpsCallable('recordguestpurchase');
                const result = await recordGuestPurchase({ 
                    bizId: scannedBusiness.id, 
                    guestId, 
                    amount: finalAmount, 
                    receiptId
                });

                if (result.data.success) {
                    const bizName = scannedBusiness.name;
                    setIsSuccess(true);
                    setSuccessMsg("Your support has been recorded. Thank you for choosing conviction over convenience.");
                    updateLocalStats('purchase', finalAmount);
                    addLocalActivity(`💳 Guest Supporter supported ${bizName}`);

                    const { evaluateBadges } = await import('../utils/badgeLogic');
                    const newBadges = await evaluateBadges(null);
                    if (newBadges && newBadges.length > 0) {
                        setSuccessMsg(prev => `${prev}\n\n🏆 Discovery Noted: You would have unlocked: ${newBadges.join(', ')}! Accept the invitation to claim them.`);
                    }
                } else {
                    setError(result.data.message || "Failed to log purchase.");
                }
            } else {
                await db.collection('transactions').add({
                    type: 'purchase',
                    bizId: scannedBusiness.id,
                    bizName: scannedBusiness.name,
                    bizIndustry: scannedBusiness.industry || 'Unknown',
                    bizLocation: scannedBusiness.location || 'Unknown',
                    userId: activeUserId,
                    userNickname: currentUser.nickname || currentUser.name || 'Ambassador',
                    isGuest: false,
                    amount: finalAmount,
                    receiptId: receiptId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'pending'
                });

                const bizName = scannedBusiness.name;
                setIsSuccess(true);
                setSuccessMsg("Your purchase has been recorded. This is proof that for-good businesses can win.");
                updateLocalStats('purchase', finalAmount);
                addLocalActivity(`💳 ${currentUser.nickname || currentUser.name || 'Ambassador'} supported ${bizName}`);
                
                const { evaluateBadges } = await import('../utils/badgeLogic');
                const newBadges = await evaluateBadges(currentUser);
                if (newBadges && newBadges.length > 0) {
                    setSuccessMsg(prev => `${prev}\n\n🏆 New Token of Empathy Unlocked: ${newBadges.join(', ')}! Visit your profile to see it.`);
                }
            }

            setScannedBusiness(null);
            setPurchaseForm(false);
            setAmount('');
            setReceiptId('');
        } catch (e) {
            console.error(e);
            setError("Failed to log purchase.");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '500px', margin: '0 auto' }}>

            {isSuccess ? (
                <div className="glass-card slide-up flex-center" style={{ textAlign: 'center', padding: '3rem 2rem', marginTop: '2rem' }}>
                    <div className="success-ripple" style={{ fontSize: '4rem', color: 'var(--accent-success)', marginBottom: '1.5rem', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-circle-check success-icon-animated"></i>
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Your Support Is In.</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>
                        {successMsg || "You just chose conviction over convenience. That matters."}
                    </p>

                    {!currentUser && (
                        <div style={{
                            background: 'rgba(255,184,77,0.1)',
                            border: '1px solid rgba(255,184,77,0.3)',
                            padding: '1.5rem',
                            borderRadius: '15px',
                            marginBottom: '2rem',
                            textAlign: 'left'
                        }}>
                            <h4 style={{ color: '#ffb84d', margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                                <i className="fa-solid fa-user-clock"></i> {successMsg.toLowerCase().includes('purchase') || successMsg.toLowerCase().includes('recorded') ? 'Guest Purchase Successful' : 'Guest Check-in Successful'}
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                                Your support was recorded anonymously. Create an identity to make every future support count permanently.
                            </p>
                            <button onClick={() => navigate('/login')} className="btn btn-primary mt-3 feature-gradient" style={{ width: '100%', border: 'none', padding: '0.8rem' }}>
                                Secure My Impact Permanently
                            </button>
                        </div>
                    )}
                    <button onClick={() => { setIsSuccess(false); setSuccessMsg(''); setScanning(true); }} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Scan Another
                    </button>
                </div>
            ) : !scannedBusiness && !scannedInitiative ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '1rem', marginBottom: '1.5rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Scan QR Code</h1>
                        <button
                            onClick={() => { setShowTutorial(true); setTutorialStep(0); }}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-full)',
                                padding: '0.6rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                                color: 'var(--text-primary)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <i className="fa-solid fa-circle-question" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}></i>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px' }}>TUTORIAL</span>
                        </button>
                    </div>

                    <div id="reader" style={{ width: '100%', borderRadius: '20px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', background: '#000', minHeight: '300px' }}></div>

                    <div style={{ width: '100%', marginTop: '2.5rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            <i className="fa-solid fa-camera" style={{ marginRight: '8px' }}></i> Point your camera at the BFG standee. Every scan helps a for-good business be seen.
                        </p>
                    </div>


                    {error && (
                        <div style={{ color: 'var(--accent)', marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(255,87,87,0.1)', borderRadius: '15px', fontSize: '0.9rem', width: '100%', textAlign: 'center', border: '1px solid rgba(255,87,87,0.2)' }}>
                            <div style={{ marginBottom: isNaughtyWarning ? '1rem' : '0' }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i> {error}
                            </div>
                            {isNaughtyWarning && (
                                <button 
                                    onClick={resetScanner}
                                    className="btn btn-naughty"
                                    style={{ 
                                        width: '100%', 
                                        marginTop: '1rem',
                                        padding: '0.8rem',
                                        borderRadius: '10px',
                                        fontWeight: '700',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    I would stop now.
                                </button>
                            )}
                        </div>
                    )}
                </>
            ) : scannedBusiness ? (
                <div className="glass-card slide-up" style={{ width: '100%', marginTop: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff' }}>
                            <i className="fa-solid fa-store"></i>
                        </div>
                        <div>
                            <h3 style={{ margin: 0 }}>{scannedBusiness.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{scannedBusiness.industry} | {scannedBusiness.location}</p>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
                            {scannedBusiness.story?.substring(0, 100)}...
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {purchaseForm ? (
                            <div className="slide-up">
                                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-success)' }}><i className="fa-solid fa-receipt"></i> Log Purchase Details</h4>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Amount (RM)</label>
                                    <input
                                        type="number"
                                        className="input-modern"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        style={{ width: '100%', marginBottom: '1rem' }}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Receipt / Bill ID</label>
                                    <input
                                        type="text"
                                        className="input-modern"
                                        placeholder="e.g. INV-12345"
                                        value={receiptId}
                                        onChange={(e) => setReceiptId(e.target.value)}
                                        style={{ width: '100%', marginBottom: '1.5rem' }}
                                        required
                                    />
                                </div>
                                <button onClick={submitPurchase} disabled={isSubmitting} className="btn btn-success" style={{ width: '100%' }}>
                                    {isSubmitting ? 'Logging Impact...' : 'Confirm & Log Impact'}
                                </button>
                                <button onClick={() => setPurchaseForm(false)} style={{ width: '100%', background: 'none', border: 'none', padding: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <i className="fa-solid fa-arrow-left"></i> Back to selection
                                </button>
                            </div>
                        ) : (
                            <>
                                <button onClick={submitCheckin} disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%' }}>
                                    {isSubmitting ? 'Verifying...' : <><i className="fa-solid fa-check"></i> I See You (Check-In)</>}
                                </button>

                                <button onClick={() => setPurchaseForm(true)} disabled={isSubmitting} className="btn btn-success" style={{ width: '100%' }}>
                                    <i className="fa-solid fa-receipt"></i> I Choose You (Log Purchase)
                                </button>

                                <button onClick={() => { setScannedBusiness(null); setScanning(true); }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', padding: '1rem', borderRadius: '50px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    Not right? Scan again
                                </button>

                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1rem', lineHeight: '1.4' }}>
                                    <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px', color: 'var(--accent-success)' }}></i>
                                    Your activity is recorded as proof — not surveillance. It's evidence that conviction-driven businesses can win.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="glass-card slide-up" style={{ width: '100%', marginTop: '2rem', border: '1px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ width: '60px', height: '60px', background: 'var(--accent-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff' }}>
                            <i className="fa-solid fa-flag"></i>
                        </div>
                        <div>
                            <p style={{ color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Active Initiative</p>
                            <h3 style={{ margin: 0 }}>{scannedInitiative.title}</h3>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: '1.4' }}>
                            {scannedInitiative.narrative || scannedInitiative.description || "Mobilising for a collective for-good impact."}
                        </p>
                    </div>

                    <button onClick={submitAttendance} disabled={isSubmitting} className="btn btn-primary feature-gradient" style={{ width: '100%', border: 'none', padding: '1.2rem' }}>
                        {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-location-dot"></i> Register My Attendance</>}
                    </button>

                    <button onClick={() => { setScannedInitiative(null); setScanning(true); }} style={{ width: '100%', background: 'none', border: 'none', padding: '1rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                        Cancel
                    </button>
                </div>
            )}

            {/* Milestone Celebration Overlay */}
            {activeMilestone && (
                <MilestoneCelebration
                    count={activeMilestone.count}
                    type={activeMilestone.type}
                    onDismiss={() => setActiveMilestone(null)}
                />
            )}

            {/* Tutorial Modal */}
            {showTutorial && (
                <div className="modal flex-center" style={{ display: 'flex', background: 'rgba(0,0,0,0.85)' }}>
                    <div className="modal-content glass-card slide-up" style={{ maxWidth: '400px', border: `1px solid ${TUTORIAL_STEPS[tutorialStep].color}` }}>
                        <div style={{ textAlign: 'right' }}>
                            <button onClick={() => setShowTutorial(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>

                        <div style={{ textAlign: 'center', paddingBottom: '1rem' }}>
                            <div style={{ fontSize: '3rem', color: TUTORIAL_STEPS[tutorialStep].color, marginBottom: '1rem' }}>
                                <i className={`fa-solid ${TUTORIAL_STEPS[tutorialStep].icon}`}></i>
                            </div>
                            <h3 style={{ color: '#ffffff' }}>{TUTORIAL_STEPS[tutorialStep].title}</h3>

                            {TUTORIAL_STEPS[tutorialStep].image && (
                                <div style={{ margin: '1rem 0', borderRadius: '15px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <img
                                        src={TUTORIAL_STEPS[tutorialStep].image}
                                        alt={TUTORIAL_STEPS[tutorialStep].title}
                                        style={{ width: '100%', display: 'block' }}
                                    />
                                </div>
                            )}

                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', margin: '1rem 0' }}>
                                {TUTORIAL_STEPS[tutorialStep].text}
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {TUTORIAL_STEPS.map((_, idx) => (
                                    <div key={idx} style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx === tutorialStep ? TUTORIAL_STEPS[idx].color : 'rgba(255,255,255,0.2)' }}></div>
                                ))}
                            </div>

                            {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                                <button
                                    onClick={() => setTutorialStep(tutorialStep + 1)}
                                    className="btn btn-primary"
                                    style={{ background: TUTORIAL_STEPS[tutorialStep].color, border: 'none', padding: '0.6rem 1.5rem', width: 'auto' }}
                                >
                                    Next <i className="fa-solid fa-arrow-right"></i>
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowTutorial(false)}
                                    className="btn btn-primary"
                                    style={{ padding: '0.6rem 1.5rem', width: 'auto' }}
                                >
                                    Got it!
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Scanner;

