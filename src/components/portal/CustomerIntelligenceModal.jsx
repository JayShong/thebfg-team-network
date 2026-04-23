import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';

const CustomerIntelligenceModal = ({ userId, bizId, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rewardText, setRewardText] = useState('');
    const [isGranting, setIsGranting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
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
        try {
            const grantReward = firebase.functions().httpsCallable('grantcustomerreward');
            await grantReward({ targetUserId: userId, bizId, description: rewardText });
            alert("Gratitude Bond strengthened! Reward granted.");
            setRewardText('');
            // Refresh data
            const getIntelligence = firebase.functions().httpsCallable('getcustomerintelligence');
            const result = await getIntelligence({ targetUserId: userId, bizId });
            setData(result.data);
        } catch (err) {
            alert("Failed to grant reward: " + err.message);
        } finally {
            setIsGranting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', border: '1px solid rgba(255,184,77,0.4)' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>
                    <i className="fa-solid fa-xmark"></i>
                </button>

                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: '#ffb84d' }}></i>
                        <p style={{ marginTop: '1rem' }}>Retrieving Loyalty Profile...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <i className="fa-solid fa-triangle-exclamation fa-3x" style={{ color: '#ff4d4d' }}></i>
                        <p style={{ marginTop: '1rem', color: '#ff4d4d' }}>{error}</p>
                        <button onClick={onClose} className="btn btn-secondary mt-3">Close</button>
                    </div>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ background: 'linear-gradient(135deg, #ffb84d, #ef6c00)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 20px rgba(239,108,0,0.4)', border: '4px solid rgba(255,255,255,0.1)' }}>
                                <i className="fa-solid fa-user-check" style={{ color: '#fff', fontSize: '2.2rem' }}></i>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>{data.nickname}</h2>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Loyal Supporter recognized by your business</p>
                        </div>

                        <div className="loyalty-stats-grid">
                            <div className="loyalty-stat-card">
                                <div className="loyalty-stat-value">{data.stats.checkins}</div>
                                <div className="loyalty-stat-label">Check-ins</div>
                            </div>
                            <div className="loyalty-stat-card">
                                <div className="loyalty-stat-value" style={{ color: '#ffb84d' }}>{data.stats.purchases}</div>
                                <div className="loyalty-stat-label">Purchases</div>
                            </div>
                            <div className="loyalty-stat-card">
                                <div className="loyalty-stat-value" style={{ color: 'var(--accent-success)' }}>RM {data.stats.totalSpend.toFixed(0)}</div>
                                <div className="loyalty-stat-label">Impact</div>
                            </div>
                        </div>

                        {/* Grant Reward Form */}
                        <div className="reward-grant-box">
                            <h4 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <i className="fa-solid fa-gift" style={{ color: 'var(--accent-primary)' }}></i>
                                Recognize this Supporter
                            </h4>
                            <form onSubmit={handleGrantReward}>
                                <textarea 
                                    className="input-modern" 
                                    rows="3" 
                                    value={rewardText} 
                                    onChange={(e) => setRewardText(e.target.value)}
                                    placeholder="Enter gift description (e.g. Free Coffee, 20% discount coupon...)" 
                                    style={{ width: '100%', marginBottom: '1.25rem', fontSize: '0.95rem', background: 'rgba(0,0,0,0.3)' }}
                                />
                                <button 
                                    type="submit" 
                                    disabled={isGranting || !rewardText.trim()}
                                    className="nav-btn active" 
                                    style={{ width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-full)', height: '55px', fontSize: '1.1rem' }}
                                >
                                    {isGranting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Strengthen Gratitude Bond'}
                                </button>
                            </form>
                        </div>

                        {/* Recent History */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="loyalty-section-label">Support History</label>
                            {data.purchaseLog.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No purchase records found.</p>
                            ) : (
                                data.purchaseLog.slice(0, 5).map(p => (
                                    <div key={p.id} className="loyalty-log-item">
                                        <div className="loyalty-log-info">
                                            <span className="loyalty-log-value">RM {parseFloat(p.amount).toFixed(2)}</span>
                                            <span className="loyalty-log-meta">ID: {p.receiptId || 'Direct'}</span>
                                        </div>
                                        <span className="loyalty-log-meta">
                                            {new Date(p.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        <p className="loyalty-footer-note">
                            <i className="fa-solid fa-lock"></i> All data revealed through this secure handshake is symmetrically shared with the user.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default CustomerIntelligenceModal;
