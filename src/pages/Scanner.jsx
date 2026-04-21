import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TUTORIAL_STEPS } from '../utils/badgeLogic';
import firebase from 'firebase/compat/app';

const Scanner = () => {
    const { currentUser } = useAuth();
    const [scannedBusiness, setScannedBusiness] = useState(null);
    const [manualId, setManualId] = useState('');
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(true);
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    
    useEffect(() => {
        let html5QrCode;
        if (scanning && !scannedBusiness && !isSuccess) {
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
    }, [scanning, scannedBusiness, isSuccess]);

    const handleScan = async (decodedText, html5QrCode) => {
        if (html5QrCode) {
            html5QrCode.stop().then(() => setScanning(false)).catch(e => console.warn(e));
        }

        try {
            let bizId = decodedText.trim();
            // Handle legacy URL formats
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

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualId) handleScan(manualId);
    };

    const submitCheckin = async () => {
        if (!currentUser) return;

        try {
            await db.collection('transactions').add({
                type: 'checkin',
                bizId: scannedBusiness.id,
                userId: currentUser.uid,
                userNickname: currentUser.name || 'Anonymous',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Reconcile standard business stats
            let newCount = (scannedBusiness.checkinsCount || 0) + 1;
            await db.collection('businesses').doc(scannedBusiness.id).set({ checkinsCount: newCount }, {merge:true});

            setIsSuccess(true);
            setScannedBusiness(null);
        } catch(e) {
            console.error(e);
            alert("Network Error: Could not log check-in.");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
            
            {isSuccess ? (
                <div className="glass-card slide-up flex-center" style={{ textAlign: 'center', padding: '3rem 2rem', marginTop: '2rem' }}>
                    <div style={{ fontSize: '4rem', color: 'var(--accent-success)', marginBottom: '1.5rem' }}>
                        <i className="fa-solid fa-circle-check"></i>
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Success!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Your activity has been securely recorded. Thank you for supporting the Empathy Economy.
                    </p>
                    <button onClick={() => { setIsSuccess(false); setScanning(true); setManualId(''); }} className="nav-btn active" style={{ background: 'var(--primary)', width: '100%', justifyContent: 'center' }}>
                        Scan Another
                    </button>
                </div>
            ) : !scannedBusiness ? (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ color: 'var(--primary)', margin: 0 }}>Scanner</h2>
                        <button 
                            onClick={() => { setShowTutorial(true); setTutorialStep(0); }} 
                            className="nav-btn" 
                            style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}
                        >
                            <i className="fa-solid fa-circle-question"></i> Tutorial
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
                        <button onClick={submitCheckin} className="nav-btn active" style={{ width: '100%', justifyContent: 'center', background: 'var(--primary)' }}>
                            <i className="fa-solid fa-check"></i> Found Them (Check-In)
                        </button>
                        
                        <button onClick={() => { setScannedBusiness(null); setScanning(true); }} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', padding: '1rem', borderRadius: '50px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                            Not right? Scan again
                        </button>
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
                                    className="nav-btn active" 
                                    style={{ background: TUTORIAL_STEPS[tutorialStep].color, border: 'none', padding: '0.5rem 1.5rem' }}
                                >
                                    Next <i className="fa-solid fa-arrow-right"></i>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setShowTutorial(false)} 
                                    className="nav-btn active" 
                                    style={{ background: 'var(--primary)', border: 'none', padding: '0.5rem 1.5rem' }}
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
