import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from "html5-qrcode";
import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';

const CustomerScannerModal = ({ bizId, onBondCreated, onClose }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        });

        scanner.render((decodedText) => {
            handleScan(decodedText, scanner);
        }, (err) => {
            // Silence common errors
        });

        return () => {
            scanner.clear().catch(e => console.error("Scanner clear failed", e));
        };
    }, []);

    const handleScan = async (uid, scanner) => {
        if (isProcessing) return;
        setIsProcessing(true);
        scanner.pause();
        
        try {
            const createBond = firebase.functions().httpsCallable('creategratitudebond');
            await createBond({ targetUserId: uid, bizId });
            onBondCreated(uid);
        } catch (err) {
            setError(err.message);
            scanner.resume();
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', border: '1px solid rgba(255,184,77,0.4)' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Scan Customer Card</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Establish a Gratitude Bond to reveal insights.</p>
                </div>

                <div id="reader" style={{ borderRadius: '15px', overflow: 'hidden', background: '#000' }}></div>

                {isProcessing && (
                    <div style={{ marginTop: '1.5rem', color: '#ffb84d' }}>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Establishing Bond...
                    </div>
                )}

                {error && (
                    <div style={{ marginTop: '1rem', color: '#ff4d4d', fontSize: '0.85rem' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i> {error}
                    </div>
                )}

                <button 
                    onClick={onClose} 
                    className="btn btn-secondary mt-4" 
                    style={{ width: '100%', borderRadius: 'var(--radius-full)' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default CustomerScannerModal;
