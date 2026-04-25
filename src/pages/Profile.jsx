import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useBusinesses from '../hooks/useBusinesses';
import AuthModal from '../components/auth/AuthModal';
import ReceiptLogger from '../components/profile/ReceiptLogger';
import MilestoneCelebration, { MILESTONES } from '../components/MilestoneCelebration';
import { db } from '../services/firebase';
import { QRCodeCanvas } from 'qrcode.react';

const Profile = () => {
    const { currentUser, isGuest, logout } = useAuth();
    const { businesses } = useBusinesses();
    const navigate = useNavigate();
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Detect if current user is an owner of any business
    const ownedBusinesses = businesses.filter(b => b.ownerEmail === currentUser?.email);
    const isOwner = ownedBusinesses.length > 0;

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [replayMilestone, setReplayMilestone] = useState(null);

    // Read total supports from localStorage for milestone gallery
    const getUserSupports = () => {
        try {
            const saved = localStorage.getItem('bfg_personal_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.totalCheckins || 0;
            }
        } catch (e) {}
        return 0;
    };
    const totalSupports = getUserSupports();

    useEffect(() => {
        if (!currentUser?.uid) return;
        const unsubscribe = db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setHistoryLoading(false);
            }, err => {
                console.warn("History fetch failed:", err);
                setHistoryLoading(false);
            });
        return () => unsubscribe();
    }, [currentUser]);

    if (!currentUser && !isGuest) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
                <i className="fa-solid fa-user-lock fa-4x" style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}></i>
                <h2>Identity Required</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px', marginBottom: '2rem' }}>
                    Every action you take here is a choice for the world you want. Create your identity to make it count.
                </p>
                <button onClick={() => setShowAuthModal(true)} className="btn btn-primary" style={{ padding: '1rem 2rem', border: 'none' }}>
                    Establish Identity
                </button>

                {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
            </div>
        );
    }

    const displayUser = currentUser || {
        name: 'Guest Explorer',
        email: 'Limited Access Mode',
        id: 'GUEST-MODE',
        checkins: 0,
        purchases: 0,
        isGuest: true
    };

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Your Journey</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Your journey in the Conviction Network</p>
                </div>
                <button onClick={() => navigate('/settings')} className="icon-btn" title="Settings">
                    <i className="fa-solid fa-gear"></i>
                </button>
            </div>

            <div className="profile-card slide-up">
                <div className="badge-header">
                    <i className="fa-solid fa-certificate badge-icon"></i>
                    <h2>TheBFG.Team</h2>
                </div>

                <div className="user-info">
                    <div className="avatar-placeholder">
                        <i className="fa-solid fa-user"></i>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.2rem', color: '#fff' }}>
                        {displayUser.nickname || displayUser.name || 'Explorer'}
                    </h3>
                    
                    <div style={{ margin: '0.5rem 0', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {displayUser.isSuperAdmin && (
                            <span style={{ background: 'linear-gradient(135deg, #FFD700, #FF8C00)', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '700' }}>
                                <i className="fa-solid fa-crown"></i> Super Admin
                            </span>
                        )}
                        {(displayUser.isAuditor || displayUser.isSuperAdmin) && (
                            <span style={{ background: '#4CAF50', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600' }}>
                                <i className="fa-solid fa-clipboard-check"></i> Auditor
                            </span>
                        )}
                        {displayUser.isCustomerSuccess && (
                            <span style={{ background: '#3b82f6', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600' }}>
                                <i className="fa-solid fa-user-tag"></i> Customer Success
                            </span>
                        )}
                        {isOwner && (
                            <span style={{ background: 'var(--accent-primary)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600' }}>
                                <i className="fa-solid fa-crown"></i> Founder
                            </span>
                        )}
                        {businesses.some(b => (b.stewardship?.managers || []).includes(displayUser.email)) && (
                            <span style={{ background: '#ffb84d', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600' }}>
                                <i className="fa-solid fa-user-tie"></i> Experience Manager
                            </span>
                        )}
                        {businesses.some(b => (b.stewardship?.crew || []).includes(displayUser.email)) && (
                            <span style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600' }}>
                                <i className="fa-solid fa-users"></i> Experience Crew
                            </span>
                        )}
                        {displayUser.isGuest && (
                            <span style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600' }}>
                                <i className="fa-solid fa-ghost"></i> Guest Explorer
                            </span>
                        )}
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{displayUser.email}</p>
                    <p className="user-id">ID: <span>{displayUser.uid ? displayUser.uid.substring(0, 10).toUpperCase() : displayUser.id}</span></p>

                    {/* Empathy Profile Tags */}
                    {!displayUser.isGuest && (
                        <div style={{ marginTop: '1.2rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Focusing On</div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {displayUser.causes && displayUser.causes.length > 0 ? (
                                    displayUser.causes.map(cause => (
                                        <span key={cause} style={{ 
                                            fontSize: '0.7rem', 
                                            padding: '0.3rem 0.75rem', 
                                            borderRadius: '2rem', 
                                            background: 'rgba(255,255,255,0.06)', 
                                            color: 'var(--text-primary)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {cause}
                                        </span>
                                    ))
                                ) : (
                                    <button 
                                        onClick={() => navigate('/settings')}
                                        style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.2)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        + Define your Empathy Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="stats-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="stat-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="stat-value" style={{ fontSize: '1.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>{displayUser.checkins || 0}</div>
                        <div className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Supports</div>
                    </div>
                    <div className="stat-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="stat-value" style={{ fontSize: '1.75rem', color: '#ffb84d', fontWeight: 'bold' }}>{displayUser.purchases || 0}</div>
                        <div className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Purchases</div>
                    </div>
                </div>

                <div className="badge-footer">
                    {displayUser.isGuest ? (
                        <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.3)', textAlign: 'left' }}>
                            <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}><i className="fa-solid fa-circle-info"></i> Why Sign Up?</h4>
                            <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.5' }}>
                                <li style={{ marginBottom: '0.4rem' }}>Every check-in is a signal. Every purchase is a vote. Make yours count permanently.</li>
                                <li style={{ marginBottom: '0.4rem' }}>Collect Tokens of Empathy and rise through the Ambassador Journey.</li>
                                <li style={{ marginBottom: '0.4rem' }}>Prove that conviction-driven consumers are real — and growing.</li>
                            </ul>
                            <button onClick={() => setShowAuthModal(true)} className="btn btn-primary mt-3 feature-gradient" style={{ border: 'none' }}>
                                Create Free Account
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Personal Networking Card (Privacy-First On-Demand) */}
                            <div style={{ 
                                margin: '2rem 0', 
                                padding: '1.5rem', 
                                background: 'rgba(255,255,255,0.03)', 
                                borderRadius: '20px', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                textAlign: 'center'
                            }}>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <i className="fa-solid fa-id-card" style={{ color: 'var(--accent-primary)' }}></i>
                                    My Introduction Card
                                </h4>
                                <div style={{ 
                                    background: '#fff', 
                                    padding: '1rem', 
                                    borderRadius: '15px', 
                                    display: 'inline-block',
                                    marginBottom: '1rem',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
                                }}>
                                    <QRCodeCanvas value={currentUser.uid} size={150} level="H" />
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', maxWidth: '250px', margin: '0 auto' }}>
                                    <i className="fa-solid fa-shield-halved" style={{ marginRight: '5px' }}></i>
                                    Present this to a merchant to let the merchant see your check-ins and purchases with that merchant. You can see exactly what is shown to them by viewing their business profile in the app.
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {displayUser.isSuperAdmin && (
                                    <button onClick={() => navigate('/admin')} className="btn btn-secondary" style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
                                        <i className="fa-solid fa-crown"></i> Governance Portal
                                    </button>
                                )}

                                {displayUser.isCustomerSuccess && (
                                    <button onClick={() => navigate('/onboarding-hub')} className="btn btn-secondary">
                                        <i className="fa-solid fa-user-tag"></i> Onboarding Hub
                                    </button>
                                )}

                                {(displayUser.isSuperAdmin || displayUser.isAuditor) && (
                                    <button onClick={() => navigate('/audit-hub')} className="btn btn-secondary">
                                        <i className="fa-solid fa-clipboard-check"></i> Verification Hub
                                    </button>
                                )}
                                
                                {(isOwner || displayUser.isCustomerSuccess || displayUser.isSuperAdmin || businesses.some(b => [...(b.stewardship?.managers || []), ...(b.stewardship?.crew || [])].includes(displayUser.email))) && (
                                    <button onClick={() => navigate('/business-portal')} className="btn btn-primary feature-gradient" style={{ border: 'none' }}>
                                        <i className="fa-solid fa-store"></i> My Business Portal
                                    </button>
                                )}

                                <button onClick={logout} className="btn btn-secondary" style={{ border: '1px solid rgba(255,87,87,0.3)', color: '#ff5757' }}>
                                    <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Milestone Gallery */}
            {!displayUser.isGuest && (
                <div className="glass-card mt-4 slide-up" style={{ animationDelay: '0.05s' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>
                        <i className="fa-solid fa-star" style={{ color: '#F59E0B' }}></i> Your Milestones
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                        {totalSupports > 0 
                            ? `${totalSupports} supports and counting. Tap an unlocked milestone to relive the moment.`
                            : 'Support a for-good business to unlock your first milestone.'
                        }
                    </p>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '0.75rem' 
                    }}>
                        {MILESTONES.map(m => {
                            const isUnlocked = totalSupports >= m.count;
                            return (
                                <div 
                                    key={m.count}
                                    onClick={() => isUnlocked && setReplayMilestone(m.count)}
                                    style={{
                                        background: isUnlocked 
                                            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12))'
                                            : 'rgba(255,255,255,0.02)',
                                        border: isUnlocked 
                                            ? '1px solid rgba(139, 92, 246, 0.3)'
                                            : '1px dashed rgba(255,255,255,0.08)',
                                        borderRadius: '14px',
                                        padding: '1rem 0.5rem',
                                        textAlign: 'center',
                                        cursor: isUnlocked ? 'pointer' : 'default',
                                        transition: 'all 0.2s ease',
                                        opacity: isUnlocked ? 1 : 0.4,
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {isUnlocked && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '6px',
                                            right: '6px',
                                            fontSize: '0.55rem',
                                            color: 'var(--accent-primary)',
                                            opacity: 0.7
                                        }}>
                                            <i className="fa-solid fa-play"></i>
                                        </div>
                                    )}
                                    <div style={{ 
                                        fontSize: isUnlocked ? '1.5rem' : '1.2rem', 
                                        fontWeight: '800',
                                        color: isUnlocked ? '#fff' : 'rgba(255,255,255,0.3)',
                                        marginBottom: '0.3rem'
                                    }}>
                                        {isUnlocked ? m.count : '???'}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.6rem', 
                                        color: isUnlocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>
                                        {isUnlocked ? 'Supports' : 'Locked'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Milestone Replay Overlay */}
            {replayMilestone && (
                <MilestoneCelebration 
                    count={replayMilestone} 
                    onDismiss={() => setReplayMilestone(null)} 
                />
            )}

            {/* Purchase Logging Component */}
            {!displayUser.isGuest && (
                <>
                    <div className="mt-4"><ReceiptLogger businesses={businesses} /></div>
                    
                    <div className="glass-card mt-4 slide-up" style={{ animationDelay: '0.1s' }}>
                        <h3 style={{ marginBottom: '1.2rem' }}><i className="fa-solid fa-history" style={{ color: 'var(--accent-secondary)' }}></i> Activity History</h3>
                        
                        {historyLoading ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem' }}><i className="fa-solid fa-spinner fa-spin"></i></div>
                        ) : history.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '1rem 0' }}>No activity recorded yet. Visit a business to start your journey!</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                {history.map(item => {
                                    const date = item.timestamp?.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
                                    const bizName = item.bizName || 'Unknown Business';
                                    const isPurchase = item.type === 'purchase';
                                    const isPending = item.status === 'pending';
                                    
                                    return (
                                        <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                                    <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: isPurchase ? 'rgba(255,184,77,0.1)' : 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <i className={`fa-solid ${isPurchase ? 'fa-receipt' : 'fa-location-dot'}`} style={{ color: isPurchase ? '#ffb84d' : 'var(--accent-primary)', fontSize: '0.9rem' }}></i>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{bizName}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{date.toLocaleDateString()} • {isPurchase ? 'Purchase' : 'Check-in'}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    {isPurchase && <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>RM {item.amount?.toFixed(2)}</div>}
                                                    <div style={{ 
                                                        fontSize: '0.6rem', 
                                                        color: item.status === 'verified' ? '#4caf50' : (isPending ? '#ffb84d' : 'var(--text-secondary)'),
                                                        textTransform: 'uppercase',
                                                        fontWeight: 'bold',
                                                        marginTop: '2px'
                                                    }}>
                                                        {item.status || 'verified'}
                                                    </div>
                                                </div>
                                            </div>

                                            {isPurchase && isPending && (
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => {
                                                            const newAmount = prompt("Enter corrected amount (RM):", item.amount);
                                                            if (newAmount && !isNaN(newAmount)) {
                                                                db.collection('transactions').doc(item.id).update({ amount: parseFloat(newAmount) })
                                                                    .catch(e => alert("Update failed: " + e.message));
                                                            }
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <i className="fa-solid fa-pen"></i> Edit Amount
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
            
            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </div>
    );
};

export default Profile;
