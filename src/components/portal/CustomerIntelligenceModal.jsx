import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';

const CustomerIntelligenceDrawer = ({ userId, bizId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rewardText, setRewardText] = useState('');
    const [isGranting, setIsGranting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // Cleanup scroll lock on unmount
    useEffect(() => {
        if (userId) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const getIntelligence = firebase.functions().httpsCallable('getcustomerintelligence');
                const result = await getIntelligence({ targetUserId: userId, bizId });
                setData(result.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, bizId]);

    const handleGrantReward = async (e) => {
        e.preventDefault();
        if (!rewardText.trim()) return;
        setIsGranting(true);
        setStatusMessage({ text: "Granting reward...", type: 'info' });
        try {
            const grantReward = firebase.functions().httpsCallable('grantcustomerreward');
            await grantReward({ targetUserId: userId, bizId, description: rewardText });
            setStatusMessage({ text: "Gratitude Bond strengthened! Reward granted.", type: 'success' });
            setRewardText('');
            // Refresh data
            const getIntelligence = firebase.functions().httpsCallable('getcustomerintelligence');
            const result = await getIntelligence({ targetUserId: userId, bizId });
            setData(result.data);
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            setStatusMessage({ text: "Failed to grant reward: " + err.message, type: 'error' });
        } finally {
            setIsGranting(false);
        }
    };

    if (!userId) return null;

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="intelligence-drawer glass-card slide-up" onClick={e => e.stopPropagation()} style={{ borderTop: '1px solid rgba(255,184,77,0.3)' }}>
                <div className="drawer-handle" onClick={onClose}></div>
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <div className="modal-body" style={{ padding: '0 1.5rem 2rem' }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center' }}>
                            <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: '#ffb84d' }}></i>
                            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Retrieving Loyalty Profile...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <i className="fa-solid fa-triangle-exclamation fa-2x" style={{ color: 'var(--accent)' }}></i>
                            <p style={{ marginTop: '1rem' }}>{error}</p>
                        </div>
                    ) : (
                        <div className="insight-content">
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #ffb84d, #ef6c00)', 
                                    width: '70px', 
                                    height: '70px', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    margin: '0 auto 1rem', 
                                    boxShadow: '0 8px 20px rgba(239,108,0,0.3)',
                                    border: '3px solid rgba(255,255,255,0.1)'
                                }}>
                                    <i className="fa-solid fa-user-check" style={{ color: '#fff', fontSize: '2rem' }}></i>
                                </div>
                                <h2 className="insight-title" style={{ margin: 0 }}>{data.nickname}</h2>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '5px' }}>
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: '800', 
                                        textTransform: 'uppercase', 
                                        color: '#ffb84d', 
                                        background: 'rgba(255,184,77,0.1)', 
                                        padding: '3px 10px', 
                                        borderRadius: 'var(--radius-full)',
                                        border: '1px solid rgba(255,184,77,0.2)'
                                    }}>
                                        {data.tier?.name || 'Explorer'} Tier
                                    </span>
                                </div>
                            </div>

                            <div className="loyalty-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>{data.stats.checkins}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Visits</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffb84d' }}>{data.stats.purchases}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Purchases</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(76, 175, 80, 0.05)', borderRadius: '12px', border: '1px solid rgba(76, 175, 80, 0.1)' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-success)' }}>RM {data.stats.totalSpend.toFixed(0)}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Force</div>
                                </div>
                            </div>

                            <div className="insight-highlight" style={{ background: 'rgba(255,184,77,0.05)', border: '1px solid rgba(255,184,77,0.1)', marginBottom: '1.5rem' }}>
                                <h4 style={{ color: '#ffb84d', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Engagement History</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {data.engagements.slice(0, 3).map(e => (
                                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <i className={`fa-solid ${e.type === 'purchase' ? 'fa-cart-shopping' : 'fa-location-dot'}`} style={{ color: e.type === 'purchase' ? '#ffb84d' : 'var(--accent-primary)', opacity: 0.8 }}></i>
                                                <span>{e.type === 'purchase' ? `Purchase (RM ${parseFloat(e.amount).toFixed(2)})` : 'Check-in'}</span>
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(e.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                    {data.engagements.length === 0 && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No recent history found.</p>}
                                </div>
                            </div>

                            {/* Recognition / Reward Portal */}
                            {data.role !== 'crew' && (
                                <div style={{ marginTop: '1rem' }}>
                                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Strengthen Gratitude Bond</h4>
                                    <form onSubmit={handleGrantReward} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <textarea 
                                            className="input-modern" 
                                            rows="2" 
                                            value={rewardText} 
                                            onChange={(e) => setRewardText(e.target.value)}
                                            placeholder="Enter a recognition gift (e.g. 10% Loyalty Bonus, Free Drink...)" 
                                            style={{ width: '100%', fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)' }}
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={isGranting || !rewardText.trim()}
                                            className="btn btn-primary feature-gradient" 
                                            style={{ width: '100%', height: '50px', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: '700' }}
                                        >
                                            {isGranting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Grant Network Reward'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Internal Drawer Toast */}
                {statusMessage && (
                    <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', right: '1.5rem', zIndex: 5000 }} className="slide-up">
                        <div className="glass-card" style={{ 
                            padding: '0.8rem 1.2rem', 
                            background: statusMessage.type === 'error' ? 'rgba(255,50,50,0.2)' : 'rgba(34,197,94,0.2)',
                            border: `1px solid ${statusMessage.type === 'error' ? '#ff4444' : '#22c55e'}`,
                            color: statusMessage.type === 'error' ? '#ff4444' : '#22c55e',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.8rem'
                        }}>
                            <i className={`fa-solid ${statusMessage.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`}></i>
                            <span>{statusMessage.text}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default CustomerIntelligenceDrawer;
