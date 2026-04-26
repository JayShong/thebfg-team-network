import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Premium Security Gate Component
 * Displays a "Warming Up" screen during reloads to ensure the Identity Handshake
 * is solid before revealing the dashboard.
 */
const SecurityGate = ({ children }) => {
    const { loading, isClaimsResolving, currentUser, isGuest } = useAuth();
    const [isGateVisible, setIsGateVisible] = useState(false);
    const [statusMsg, setStatusMsg] = useState('Securing Identity...');

    useEffect(() => {
        // Detect if this is a reload
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav && nav.type === 'reload' && !isGuest) {
            setIsGateVisible(true);
        }
    }, [isGuest]);

    useEffect(() => {
        if (isGateVisible) {
            // Sequence the messages for a premium feel
            const timer1 = setTimeout(() => setStatusMsg('Establishing Secure Conviction...'), 800);
            const timer2 = setTimeout(() => setStatusMsg('Synchronizing Impact Data...'), 1600);
            
            // Release the gate once everything is resolved
            if (!loading && !isClaimsResolving) {
                const timer3 = setTimeout(() => setIsGateVisible(false), 2200);
                return () => {
                    clearTimeout(timer1);
                    clearTimeout(timer2);
                    clearTimeout(timer3);
                };
            }
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, [isGateVisible, loading, isClaimsResolving]);

    if (!isGateVisible) return children;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#0a0a0a',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Animated Logo / Spinner */}
            <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '2rem' }}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: '50%',
                    border: '2px solid rgba(59, 130, 246, 0.1)',
                    borderTop: '2px solid #3b82f6',
                    animation: 'spin 2s linear infinite'
                }}></div>
                <div style={{
                    position: 'absolute',
                    top: '15px', left: '15px', right: '15px', bottom: '15px',
                    borderRadius: '50%',
                    border: '2px solid rgba(16, 185, 129, 0.1)',
                    borderBottom: '2px solid #10b981',
                    animation: 'spin-reverse 1.5s linear infinite'
                }}></div>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <i className="fa-solid fa-shield-halved" style={{ fontSize: '2rem', color: '#3b82f6' }}></i>
                </div>
            </div>

            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '1px' }}>
                THE BFG TEAM
            </h2>
            <p style={{ 
                fontSize: '0.85rem', 
                color: 'rgba(255,255,255,0.5)', 
                fontWeight: '500',
                transition: 'all 0.5s ease'
            }}>
                {statusMsg}
            </p>

            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes spin-reverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
            `}</style>
        </div>
    );
};

export default SecurityGate;
