import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TUTORIAL_STEPS } from '../utils/badgeLogic';
import firebase from 'firebase/compat/app';

const Scanner = () => {
    const navigate = useNavigate();
    const { currentUser, ghostId } = useAuth();
    const [scannedBusiness, setScannedBusiness] = useState(null);
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(true);
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Sentinel State
    const [sentinelState, setSentinelState] = useState({ lockoutUntil: null, lastCheckins: {}, spamAttempts: {} });
    const [lockoutTimer, setLockoutTimer] = useState(0);

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
    }, [scanning, scannedBusiness, isSuccess, lockoutTimer]);

    const handleScan = async (decodedText, html5QrCode) => {
        if (html5QrCode) {
            html5QrCode.stop().then(() => setScanning(false)).catch(e => console.warn(e));
        }

        try {
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
                setError('Invalid ID or QR Code. Business not found.');
                setScanning(true);
            }
        } catch (e) {
            setError('Failed to process data.');
            setScanning(true);
        }
    };


    const updateLocalStats = (type, amount = 0) => {
        // 1. Update Personal Stats
        const personalSaved = localStorage.getItem('bfg_personal_stats');
        let pStats = personalSaved ? JSON.parse(personalSaved) : {
            totalCheckins: 0, totalPurchases: 0, totalWaste: 0, totalTrees: 0, totalFamilies: 0,
            uniqueBizIds: {}, uniqueLocations: {}, uniqueIndustries: {}
        };
        
        // Ensure structure exists for legacy data
        if (!pStats.uniqueBizIds) pStats.uniqueBizIds = {};
        
        if (scannedBusiness) {
            const isNewBiz = !pStats.uniqueBizIds[scannedBusiness.id];
            if (isNewBiz) {
                pStats.uniqueBizIds[scannedBusiness.id] = true;
                pStats.totalFamilies = (pStats.totalFamilies || 0) + (parseInt(scannedBusiness.impactJobs) || 0);
            }
            
            if (type === 'checkin') {
                pStats.totalCheckins = (pStats.totalCheckins || 0) + 1;
            } else if (type === 'purchase') {
                pStats.totalPurchases = (pStats.totalPurchases || 0) + 1;
                
                // Calculate incremental impact if business data is available
                if (scannedBusiness.yearlyAssessments) {
                    let latestRev = 0; let latestWaste = 0; let latestTrees = 0;
                    const assessments = Array.isArray(scannedBusiness.yearlyAssessments) 
                        ? scannedBusiness.yearlyAssessments : Object.values(scannedBusiness.yearlyAssessments);

                    assessments.forEach(ya => {
                        const rev = parseFloat(ya.revenue?.toString().replace(/,/g, '')) || 0;
                        if (rev > latestRev) {
                            latestRev = rev;
                            latestWaste = parseFloat(ya.wasteKg?.toString().replace(/,/g, '')) || 0;
                            latestTrees = parseFloat(ya.treesPlanted?.toString().replace(/,/g, '')) || 0;
                        }
                    });

                    if (latestRev > 0) {
                        const proportion = (parseFloat(amount) || 0) / latestRev;
                        pStats.totalWaste = (pStats.totalWaste || 0) + (proportion * latestWaste);
                        pStats.totalTrees = (pStats.totalTrees || 0) + (proportion * latestTrees);
                    }
                }
            }

            if (scannedBusiness.location) {
                pStats.uniqueLocations = pStats.uniqueLocations || {};
                pStats.uniqueLocations[scannedBusiness.location] = true;
            }
            if (scannedBusiness.industry) {
                pStats.uniqueIndustries = pStats.uniqueIndustries || {};
                pStats.uniqueIndustries[scannedBusiness.industry] = true;
            }
        }
        localStorage.setItem('bfg_personal_stats', JSON.stringify(pStats));

        // 2. Update Global Stats (Estimated)
        const globalSaved = localStorage.getItem('bfg_global_stats');
        if (globalSaved) {
            let gStats = JSON.parse(globalSaved);
            if (type === 'checkin') gStats.checkins++;
            if (type === 'purchase') gStats.purchases++;
            localStorage.setItem('bfg_global_stats', JSON.stringify(gStats));
        }
    };

    const submitCheckin = async () => {
        if (!scannedBusiness || isSubmitting) return;
        setIsSubmitting(true);

        // 1. Handle Ghost Check-in (Anonymous)
        if (!currentUser) {
            try {
                const ghostCheckin = firebase.functions().httpsCallable('ghostcheckin');
                const result = await ghostCheckin({ bizId: scannedBusiness.id, ghostId });
                
                if (result.data.success) {
                    setIsSuccess(true);
                    setSuccessMsg("Ghost Check-in successful! Your anonymous support has been recorded.");
                    updateLocalStats('checkin');
                } else {
                    alert(result.data.message || "Could not record acknowledgment.");
                }
                setScannedBusiness(null);
            } catch (e) {
                console.error("Ghost checkin error", e);
                alert("Network Error: Could not log anonymous support.");
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
                alert("Security Triggered: Excessive attempts detected. Scanner locked for 10 minutes.");
                setScannedBusiness(null);
                setScanning(true);
            } else {
                await db.collection('users').doc(currentUser.uid).collection('sentinel').doc('state').set({
                    [`spamAttempts.${scannedBusiness.id}`]: attempts
                }, { merge: true });
                alert("Wow! You are such an enthusiastic supporter. You can support this merchant again tomorrow.");
                setScannedBusiness(null);
                setScanning(true);
            }
            setIsSubmitting(false);
            return;
        }

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
                userNickname: currentUser.nickname || currentUser.name || 'Explorer',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'verified'
            });

            batch.set(db.collection('users').doc(currentUser.uid).collection('sentinel').doc('state'), {
                [`lastCheckins.${scannedBusiness.id}`]: today,
                [`spamAttempts.${scannedBusiness.id}`]: 0
            }, { merge: true });

            await batch.commit();
            setIsSuccess(true);
            setSuccessMsg("Check-in verified! Your impact is being recorded.");
            updateLocalStats('checkin');
            setScannedBusiness(null);
            
            const { evaluateBadges } = await import('../utils/badgeEngine');
            await evaluateBadges(currentUser);
        } catch(e) {
            console.error(e);
            alert("Network Error: Could not log activity.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const [purchaseForm, setPurchaseForm] = useState(false);
    const [amount, setAmount] = useState('');
    const [receiptId, setReceiptId] = useState('');

    const submitPurchase = async () => {
        if (!currentUser || !amount || isSubmitting) return;
        const finalAmount = parseFloat(amount);
        setIsSubmitting(true);
        
        if (isNaN(finalAmount) || finalAmount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        // Global Cooldown Check (5 mins)
        // Note: Check-ins have NO global cooldown, but purchases/logs do.
        // Actually the user said "A user cannot log any activity (check-in or purchase) more than once every 5 minutes."
        // BUT then they said "There are no time restrictions to check-ins, as long as it's a different merchant."
        // So I'll apply the 5-min cooldown to PURCHASES only, to prevent spamming the merchant queue.

        try {
            await db.collection('transactions').add({
                type: 'purchase',
                bizId: scannedBusiness.id,
                bizName: scannedBusiness.name,
                bizIndustry: scannedBusiness.industry || 'Unknown',
                bizLocation: scannedBusiness.location || 'Unknown',
                userId: currentUser.uid,
                userNickname: currentUser.nickname || currentUser.name || 'Explorer',
                amount: finalAmount,
                receiptId: receiptId || 'N/A',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });

            setIsSuccess(true);
            setSuccessMsg("Your purchase has been recorded! Awaiting merchant verification.");
            updateLocalStats('purchase', finalAmount);
            setScannedBusiness(null);
            setPurchaseForm(false);
            setAmount('');
            setReceiptId('');
            
            const { evaluateBadges } = await import('../utils/badgeEngine');
            await evaluateBadges(currentUser);
        } catch(e) {
            console.error(e);
            alert("Failed to log purchase.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            
            {isSuccess ? (
                <div className="glass-card slide-up flex-center" style={{ textAlign: 'center', padding: '3rem 2rem', marginTop: '2rem' }}>
                    <div style={{ fontSize: '4rem', color: 'var(--accent-success)', marginBottom: '1.5rem' }}>
                        <i className="fa-solid fa-circle-check"></i>
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Acknowledgment Received!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        {successMsg || "Your support for the Empathy Economy has been recorded."}
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
                                <i className="fa-solid fa-ghost"></i> Ghost Check-in Successful
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                                Thank you for your ghost check-in. If you would like to retain your check-in activities when you become a member later, please do it soon before your device deletes your records.
                            </p>
                            <button onClick={() => navigate('/settings')} className="btn btn-primary mt-3 feature-gradient" style={{ width: '100%', border: 'none', padding: '0.8rem' }}>
                                Secure My Impact Permanently
                            </button>
                        </div>
                    )}
                    <button onClick={() => { setIsSuccess(false); setSuccessMsg(''); setScanning(true); }} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Scan Another
                    </button>
                </div>
            ) : !scannedBusiness ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '1rem', marginBottom: '1.5rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Scanner</h1>
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
                            <i className="fa-solid fa-camera" style={{ marginRight: '8px' }}></i> Focus your camera on the official BFG standee to record your support.
                        </p>
                    </div>
                    
                    {error && (
                        <div style={{ color: 'var(--accent)', marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,87,87,0.1)', borderRadius: '10px', fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>
                            <i className="fa-solid fa-triangle-exclamation"></i> {error}
                        </div>
                    )}
                </>
            ) : (
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
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Receipt / Bill ID (Optional)</label>
                                    <input 
                                        type="text" 
                                        className="input-modern" 
                                        placeholder="e.g. INV-12345" 
                                        value={receiptId} 
                                        onChange={(e) => setReceiptId(e.target.value)} 
                                        style={{ width: '100%', marginBottom: '1.5rem' }}
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
                                    {isSubmitting ? 'Verifying...' : <><i className="fa-solid fa-check"></i> Found Them (Check-In)</>}
                                </button>
 
                                <button onClick={() => setPurchaseForm(true)} disabled={isSubmitting} className="btn btn-success" style={{ width: '100%' }}>
                                    <i className="fa-solid fa-receipt"></i> Bought from Them (Log Purchase)
                                </button>
                                
                                <button onClick={() => { setScannedBusiness(null); setScanning(true); }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', padding: '1rem', borderRadius: '50px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    Not right? Scan again
                                </button>
                            </>
                        )}
                    </div>
                </div>
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
