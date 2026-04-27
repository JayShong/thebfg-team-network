import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from '../auth/AuthModal';
import { BADGES_CONFIG, BADGE_CATEGORIES, getSeasonId, getGuestBadges } from '../../utils/badgeLogic';
import { db, functions } from '../../services/firebase';

const BadgeGallery = () => {
    const { currentUser, isGuest } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState(null);
    const [seasonalBadges, setSeasonalBadges] = useState({});
    const [localStats, setLocalStats] = useState({ totalCheckins: 0, totalPurchases: 0 });
    const [claimCode, setClaimCode] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimSuccess, setClaimSuccess] = useState(null);
    const [claimError, setClaimError] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem('bfg_personal_stats');
        if (saved) {
            try {
                setLocalStats(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    useEffect(() => {
        if (!currentUser || isGuest) return;
        
        const seasonId = getSeasonId();
        const unsub = db.collection('users').doc(currentUser.uid)
            .collection('seasons').doc(seasonId)
            .collection('badges')
            .onSnapshot(snapshot => {
                const badges = {};
                snapshot.forEach(doc => {
                    badges[doc.id] = doc.data();
                });
                setSeasonalBadges(badges);
            }, err => {
                console.error("Failed to fetch seasonal badges:", err);
            });
            
        return () => unsub();
    }, [currentUser, isGuest]);


    const categoryOrder = ['Seen', 'Verified', 'Valued'];
    const userBadges = isGuest ? getGuestBadges(localStats) : seasonalBadges;


    const handleClaim = async (e) => {
        e.preventDefault();
        if (!claimCode) return;
        setIsClaiming(true);
        setClaimError(null);
        setClaimSuccess(null);

        try {
            const claimFn = functions.httpsCallable('claimbusinessrecommendation');
            const result = await claimFn({ onboardingCode: claimCode.trim().toUpperCase() });
            setClaimSuccess(result.data.bizName);
            setClaimCode('');
        } catch (err) {
            setClaimError(err.message);
        } finally {
            setIsClaiming(false);
        }
    };

    const [expandedCats, setExpandedCats] = useState(isGuest ? {} : { 'Seen': true, 'Verified': true, 'Valued': true });

    const toggleCat = (cat) => {
        setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    return (
        <div style={{ marginTop: '2rem' }}>
            {/* The Invitation for Guests */}
            {isGuest && (
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.3)', textAlign: 'left' }}>
                    <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}><i className="fa-solid fa-envelope-open-text"></i> Why Accept the Invitation?</h4>
                    <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.5', listStyleType: 'none' }}>
                        <li style={{ marginBottom: '0.4rem' }}><i className="fa-solid fa-check" style={{ fontSize: '0.7rem', marginRight: '8px', color: 'var(--accent-primary)' }}></i> Every check-in is a signal. Every purchase is a vote. Make yours count permanently.</li>
                        <li style={{ marginBottom: '0.4rem' }}><i className="fa-solid fa-check" style={{ fontSize: '0.7rem', marginRight: '8px', color: 'var(--accent-primary)' }}></i> Collect Tokens of Empathy and rise through the Ambassador Journey.</li>
                        <li style={{ marginBottom: '0.4rem' }}><i className="fa-solid fa-check" style={{ fontSize: '0.7rem', marginRight: '8px', color: 'var(--accent-primary)' }}></i> Prove that conviction-driven consumers are real — and growing.</li>
                    </ul>
                    <button onClick={() => setShowAuthModal(true)} className="btn btn-primary mt-3 feature-gradient" style={{ border: 'none', width: '100%' }}>
                        Create Free Account to Start Your Journey
                    </button>
                </div>
            )}

            {/* Ambassador Redemption Section */}
            {!isGuest && currentUser && (
                <div className="glass-card slide-up" style={{ marginBottom: '2rem', border: '1px solid var(--primary-light)', background: 'rgba(var(--primary-rgb), 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1rem' }}>
                        <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '10px' }}>
                            <i className="fa-solid fa-handshake-angle" style={{ color: 'white' }}></i>
                        </div>
                        <div>
                            <h4 style={{ margin: 0, color: 'white' }}>Claim a Recommendation</h4>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Enter the unique code from the business owner you onboarded.</p>
                        </div>
                    </div>

                    <form onSubmit={handleClaim} style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            className="input-modern" 
                            placeholder="e.g. BFG-X9Z2" 
                            value={claimCode}
                            onChange={(e) => setClaimCode(e.target.value)}
                            style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '1px' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 1.5rem' }} disabled={isClaiming || !claimCode}>
                            {isClaiming ? <i className="fa-solid fa-spinner fa-spin"></i> : "Redeem"}
                        </button>
                    </form>

                    {claimSuccess && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50', color: '#4caf50', fontSize: '0.8rem', textAlign: 'center' }}>
                            <i className="fa-solid fa-circle-check"></i> Success! You are now the official advocate for <strong>{claimSuccess}</strong>.
                        </div>
                    )}
                    {claimError && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', color: '#ff4444', fontSize: '0.8rem', textAlign: 'center' }}>
                            <i className="fa-solid fa-circle-exclamation"></i> {claimError}
                        </div>
                    )}
                </div>
            )}
            {categoryOrder.map(catKey => {
                const catInfo = BADGE_CATEGORIES[catKey];
                const catBadges = BADGES_CONFIG.filter(b => b.category === catKey);
                const unlockedInCat = catBadges.filter(b => {
                    const status = userBadges[b.id];
                    return status === true || status?.unlocked === true;
                }).length;
                const isExpanded = expandedCats[catKey];

                return (
                    <div key={catKey} className="badge-category-section glass-card" style={{ marginBottom: '1rem', borderLeft: `3px solid ${catInfo.color}`, padding: '0.75rem' }}>
                        <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                            onClick={() => toggleCat(catKey)}
                        >
                            <i className={`fa-solid ${catInfo.icon}`} style={{ color: catInfo.color, fontSize: '1.1rem' }}></i>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', color: catInfo.color }}>{catInfo.label}</h4>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{isExpanded ? catInfo.description : `${unlockedInCat} / ${catBadges.length} Signals Captured`}</p>
                            </div>
                            <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.5 }}></i>
                        </div>
                        
                        {isExpanded && (
                            <div className="fade-in" style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
                                {catBadges.map(b => {
                                    const badgeStatus = userBadges[b.id];
                                    const isUnlocked = badgeStatus === true || badgeStatus?.unlocked === true;
                                    const stateClass = isUnlocked ? 'unlocked' : 'locked';
                                    
                                    return (
                                        <div 
                                            key={b.id}
                                            className={`badge-item ${stateClass}`} 
                                            style={{ cursor: 'pointer', padding: '0.8rem 0.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}
                                            onClick={(e) => { e.stopPropagation(); setSelectedBadge(b); }}
                                        >
                                            <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: isUnlocked ? catInfo.color : 'var(--text-secondary)', opacity: isUnlocked ? 1 : 0.3 }}>
                                                <i className={`fa-solid ${b.icon}`}></i>
                                            </div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#ffffff', opacity: isUnlocked ? 1 : 0.5 }}>{b.title}</div>
                                            {b.tier && (
                                                <span style={{ fontSize: '0.55rem', display: 'inline-block', marginTop: '0.2rem', padding: '0.1rem 0.4rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                                                    {b.tier}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Simulated Badge Modal inline */}
            {selectedBadge && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
                        <button onClick={() => setSelectedBadge(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#ffffff', fontSize: '1.2rem', cursor: 'pointer' }}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3.5rem', color: BADGE_CATEGORIES[selectedBadge.category].color, margin: '1rem 0' }}>
                                <i className={`fa-solid ${selectedBadge.icon}`}></i>
                            </div>
                            <h2 style={{ color: '#ffffff', marginBottom: '0.2rem' }}>{selectedBadge.title}</h2>
                            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.8rem', borderRadius: '1rem', color: 'var(--text-secondary)' }}>
                                {selectedBadge.category} {selectedBadge.tier ? `· ${selectedBadge.tier}` : ''}
                            </span>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>The Why</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#ffffff', lineHeight: '1.4' }}>{selectedBadge.why}</p>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                            <h4 style={{ color: BADGE_CATEGORIES[selectedBadge.category].color, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>How to Earn</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{selectedBadge.how}</p>
                        </div>
                    </div>
                </div>
            )}
            {showAuthModal && (
                <AuthModal 
                    isOpen={showAuthModal} 
                    onClose={() => setShowAuthModal(false)} 
                />
            )}
        </div>
    );
};

export default BadgeGallery;
