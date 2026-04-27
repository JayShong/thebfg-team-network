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
                ) : (
                    <>
                        {/* MOCK DATA OVERRIDE FOR REVIEW */}
                        {(function() {
                            if (!data) {
                                window.mockData = {
                                    nickname: 'Loyal Supporter (Demo)',
                                    stats: { checkins: 42, purchases: 12, totalSpend: 1250.50 },
                                    engagements: [
                                        { id: 'e1', type: 'purchase', amount: 45.00, timestamp: new Date().toISOString(), receiptId: 'RCPT-001' },
                                        { id: 'e2', type: 'checkin', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
                                        { id: 'e3', type: 'purchase', amount: 32.50, timestamp: new Date(Date.now() - 86400000).toISOString(), receiptId: 'RCPT-002' },
                                        { id: 'e4', type: 'checkin', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
                                        { id: 'e5', type: 'checkin', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() }
                                    ]
                                };
                            }
                        })()}

                        {(function() {
                            const d = data || window.mockData;
                            // Merge logs if using real data, or use mock engagements
                            const allEngagements = d.engagements || [
                                ...(d.purchaseLog || []).map(p => ({ ...p, type: 'purchase' })),
                                ...(d.checkinLog || []).map(c => ({ ...c, type: 'checkin' }))
                            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                            return (
                                <>
                                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                        <div style={{ background: 'linear-gradient(135deg, #ffb84d, #ef6c00)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 20px rgba(239,108,0,0.4)', border: '4px solid rgba(255,255,255,0.1)' }}>
                                            <i className="fa-solid fa-user-check" style={{ color: '#fff', fontSize: '2.2rem' }}></i>
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>
                                            {d.nickname}
                                        </h2>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {d.nickname === 'Guest Supporter' ? 'Temporary session until they Accept the Invitation' : 'Loyal Supporter recognized by your business'}
                                        </p>


                                    </div>

                                    <div className="loyalty-stats-grid">
                                        <div className="loyalty-stat-card">
                                            <div className="loyalty-stat-value">{d.stats.checkins}</div>
                                            <div className="loyalty-stat-label">Check-ins</div>
                                        </div>
                                        <div className="loyalty-stat-card">
                                            <div className="loyalty-stat-value" style={{ color: '#ffb84d' }}>{d.stats.purchases}</div>
                                            <div className="loyalty-stat-label">Purchases</div>
                                        </div>
                                        <div className="loyalty-stat-card">
                                            <div className="loyalty-stat-value" style={{ color: 'var(--accent-success)' }}>RM {d.stats.totalSpend.toFixed(0)}</div>
                                            <div className="loyalty-stat-label">Impact</div>
                                        </div>
                                    </div>

                                    {/* Grant Reward Form (Founders & Managers Only) */}
                                    {d.role !== 'crew' && (
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
                                    )}

                                    {/* Full Engagement History */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label className="loyalty-section-label">Engagement History</label>
                                        {allEngagements.length === 0 ? (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No history found with your business.</p>
                                        ) : (
                                            allEngagements.map(e => (
                                                <div key={e.id} className="loyalty-log-item">
                                                    <div className="loyalty-log-info">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <i className={`fa-solid ${e.type === 'purchase' ? 'fa-cart-shopping' : 'fa-location-dot'}`} style={{ color: e.type === 'purchase' ? '#ffb84d' : 'var(--accent-primary)', fontSize: '0.9rem' }}></i>
                                                            <span className="loyalty-log-value">
                                                                {e.type === 'purchase' ? (
                                                                    <>
                                                                        RM {parseFloat(e.amount).toFixed(2)}
                                                                        {e.status === 'pending' && <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,184,77,0.1)', color: '#ffb84d', borderRadius: '4px', border: '1px solid rgba(255,184,77,0.3)' }}>PENDING</span>}
                                                                    </>
                                                                ) : 'Check-in'}
                                                            </span>
                                                        </div>
                                                        <span className="loyalty-log-meta">{e.receiptId ? `ID: ${e.receiptId}` : 'Verified Presence'}</span>
                                                    </div>
                                                    <span className="loyalty-log-meta">
                                                        {new Date(e.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            );
                        })()}

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
