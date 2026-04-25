import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import useBusinesses from '../hooks/useBusinesses';
import { db } from '../services/firebase';
import FeedbackModal from '../components/profile/FeedbackModal';

const BusinessProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, isGuest, logout } = useAuth();
    const { businesses, loading } = useBusinesses();
    
    const [business, setBusiness] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [liveAuditLog, setLiveAuditLog] = useState([]);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    useEffect(() => {
        if (!loading && businesses.length > 0) {
            const found = businesses.find(b => b.id?.toLowerCase() === id?.toLowerCase());
            if (found) {
                setBusiness(found);
            }
        }
    }, [id, businesses, loading]);

    // Reconciled stats from the business document (Updated every 5 mins by the network cron)
    const stats = {
        checkins: (business?.checkinsCount || 0) + (business?.ghostCheckinsCount || 0),
        purchases: business?.purchasesCount || 0,
        volume: business?.purchaseVolume || 0
    };

    useEffect(() => {
        if (!id) return;
        
        const unsubscribe = db.collection('audit_logs')
            .where('bizId', '==', id)
            .orderBy('timestamp', 'desc')
            .limit(20) // Scale safeguard
            .onSnapshot(snapshot => {
                const logs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setLiveAuditLog(logs);
            });
        return () => unsubscribe();
    }, [id, business]);

    const getNickname = (email) => {
        if (!email) return 'Operator';
        if (typeof email !== 'string') return 'Operator';
        if (email.includes('@')) {
            return email.split('@')[0];
        }
        return email;
    };

    const anonymizeText = (text) => {
        if (!text) return '';
        // Regex to find things that look like emails and replace with nicknames
        return text.replace(/([a-zA-Z0-9._-]+)@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/g, '$1');
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-circle-notch fa-spin fa-3x"></i>
                <p style={{ marginTop: '1rem' }}>Loading network profile...</p>
            </div>
        );
    }

    if (!business) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-triangle-exclamation fa-3x"></i>
                <p style={{ marginTop: '1rem' }}>Business not found in this sector.</p>
                <button className="btn btn-secondary mt-3" onClick={() => navigate('/directory')}>Back to Network</button>
            </div>
        );
    }

    const {
        name,
        industry,
        location,
        type,
        tier,
        score,
        founder,
        story,
        shopfrontImg,
        founderImg,
        website,
        googleMapsUrl,
        videoUrl,
        impactWaste,
        impactJobs,
        yearlyAssessments,
        auditLog,
        branches,
        status,
        expiryReason,
        expiryDate
    } = business;

    const purposeStatement = business.purposeStatement || business.impactStatement;
    const isExpired = status === 'expired';
    const scoreStr = typeof score === 'object' && score ? `${score.s}${score.e}${score.c}${score.soc}${score.env}` : (score || '---');

    // Video Embed Logic
    let embedUrl = videoUrl;
    if (embedUrl) {
        if (embedUrl.includes('youtube.com/watch?v=')) {
            embedUrl = embedUrl.replace('youtube.com/watch?v=', 'youtube.com/embed/').split('&')[0];
        } else if (embedUrl.includes('youtu.be/')) {
            const vidId = embedUrl.split('youtu.be/')[1].split('?')[0];
            embedUrl = `https://www.youtube.com/embed/${vidId}`;
        } else if (embedUrl.includes('vimeo.com/')) {
            const vidId = embedUrl.split('vimeo.com/')[1].split('?')[0];
            embedUrl = `https://player.vimeo.com/video/${vidId}`;
        }
    }

    return (
        <div style={{ width: '100%', paddingBottom: '5rem' }}>
            {/* Hero Image Section */}
            <div className="business-hero" style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'hidden', marginBottom: '1.5rem' }}>
                {shopfrontImg ? (
                    <img src={shopfrontImg} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                        <i className="fa-solid fa-camera fa-2x" style={{ color: 'rgba(255,255,255,0.1)' }}></i>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Photo coming soon</span>
                    </div>
                )}
                {isExpired && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(244, 67, 54, 0.9)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 'bold', backdropFilter: 'blur(4px)' }}>
                        <i className="fa-solid fa-ban"></i> EXPIRED
                    </div>
                )}
            </div>

            {/* Profile Content */}
            <div style={{ padding: '0 0.5rem' }}>
                {isExpired && (
                    <div className="biz-expired-banner" style={{ background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', color: '#F44336', marginBottom: '0.5rem' }}><i className="fa-solid fa-ban"></i></div>
                        <h3 style={{ color: '#F44336', marginBottom: '0.3rem' }}>This Business Has Expired</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{expiryReason || 'This entity is no longer an active participant in the network.'}</p>
                        {expiryDate && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Date: {new Date(expiryDate).toLocaleDateString()}</p>}
                    </div>
                )}

                <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.5rem' }}>{name}</h1>
                
                {/* Score & Industry Row */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {business.membershipType === 'full' ? (
                        <div className="business-score" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <div><i className="fa-solid fa-star"></i> TheBFG.Team Score: <strong>{scoreStr}</strong></div>
                                <button 
                                    onClick={() => setShowFeedbackModal(true)}
                                    className="btn btn-secondary" 
                                    style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                >
                                    <i className="fa-solid fa-comment-dots"></i> Share Observation
                                </button>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', width: '100%' }}>
                                Sh:{score?.s || '-'} | Em:{score?.e || '-'} | Cu:{score?.c || '-'} | So:{score?.soc || '-'} | Env:{score?.env || '-'}
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                This is a Living Signal — renewed annually and informed by consumer feedback.
                            </p>
                        </div>
                    ) : (
                        <div className="business-score" style={{ padding: '0.5rem 1rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd' }}>
                            <i className="fa-solid fa-circle-info"></i> Affiliate Member
                        </div>
                    )}
                </div>

                {/* Affiliate Status Disclaimer */}
                {business.membershipType === 'affiliate' && (
                    <div style={{ marginBottom: '1.5rem', background: 'rgba(139, 92, 246, 0.1)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(139, 92, 246, 0.2)', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c4b5fd', fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                            <i className="fa-solid fa-circle-info"></i> Affiliate Member
                        </div>
                        <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', line_height: '1.5', fontStyle: 'italic' }}>
                            "Affiliates support our Purpose and have been visited by the team. They have yet to apply to become a full member and receive their score. Persuade them to join by giving them check-ins!"
                        </div>
                    </div>
                )}

                {/* Founder's Conviction Section */}
                {(founder || story || founderImg) && (
                    <div className="detail-section glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <i className="fa-solid fa-heart" style={{ color: 'var(--accent-primary)' }}></i> Founder's Conviction
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                            {founderImg && (
                                <img src={founderImg} alt={founder} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-primary)' }} />
                            )}
                            <div>
                                <p style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{founder || 'Founder'}</p>
                                {story && <p style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.6' }}>"{story}"</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Purpose Statement Section */}
                {(purposeStatement || impactWaste || impactJobs) && (
                    <div className="detail-section glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(145deg, rgba(239, 108, 0, 0.1), rgba(0,0,0,0.4))' }}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0 }}>Purpose Statement</h3>
                        </div>
                        <p style={{ fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.8)' }}>
                            "{purposeStatement || 'The purpose and environmental commitments of this business are currently under audit.'}"
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {impactWaste && (
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-success)' }}>{impactWaste}kg</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>Waste Diverted</div>
                                </div>
                            )}
                            {impactJobs && (
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-primary)' }}>{impactJobs}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>Ethical Jobs</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Yearly Assessments Section */}
                {yearlyAssessments && Object.keys(yearlyAssessments).length > 0 && (
                    <div className="detail-section glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(145deg, rgba(76, 175, 80, 0.1), rgba(0,0,0,0.4))' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}><i className="fa-solid fa-chart-line"></i> Yearly Assessments</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {Object.entries(yearlyAssessments).sort((a, b) => b[0] - a[0]).map(([year, ya]) => (
                                <div key={year} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>
                                        <i className="fa-solid fa-calendar-check"></i> {year}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{ya.revenue ? `RM ${Number(ya.revenue).toLocaleString()}` : '-'}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Revenue</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>{ya.wasteKg ? `${Number(ya.wasteKg).toLocaleString()} kg` : '-'}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Waste</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#4CAF50' }}>{ya.treesPlanted ? Number(ya.treesPlanted).toLocaleString() : '-'}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Trees</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contact & Map Section */}
                <div className="detail-section glass-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.25rem' }}><i className="fa-solid fa-map-location-dot"></i> Contact & Location</h3>
                    
                    {/* Branch Selection Dropdown */}
                    {branches && branches.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Select Outlet / Branch
                            </label>
                            <select 
                                className="input-modern"
                                style={{ width: '100%', cursor: 'pointer' }}
                                value={selectedBranch ? branches.indexOf(selectedBranch) : -1}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setSelectedBranch(val === -1 ? null : branches[val]);
                                }}
                            >
                                <option value="-1">Main Location (HQ)</option>
                                {branches.map((b, idx) => (
                                    <option key={idx} value={idx}>{b.name || `Branch ${idx + 1}`}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {website && (
                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <i className="fa-solid fa-globe" style={{ width: '20px', color: 'var(--accent-primary)' }}></i>
                                <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}>{website}</a>
                            </p>
                        )}
                        {(selectedBranch?.address || location) && (
                            <p style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <i className="fa-solid fa-location-dot" style={{ width: '20px', color: '#ef4444', marginTop: '3px' }}></i>
                                <span style={{ color: 'var(--text-primary)' }}>{selectedBranch ? selectedBranch.address : location}</span>
                            </p>
                        )}
                        
                        {/* Maps Link - User Requested free external URL */}
                        <a 
                            href={selectedBranch ? selectedBranch.url : (googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-secondary w-full"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', marginTop: '0.5rem' }}
                        >
                            <i className="fa-solid fa-map-marked-alt"></i> 
                            {selectedBranch ? `Open ${selectedBranch.name} on Maps` : 'Navigate via Google Maps'}
                        </a>
                    </div>
                </div>

                {/* Video Section */}
                {embedUrl && (
                    <div className="detail-section glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Founder's Narrative</h3>
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
                            <iframe 
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                src={embedUrl} 
                                title="Video narrative" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                )}

                {/* Interactive Action Section */}
                <div className="detail-section" style={{ padding: '1rem', textAlign: 'center' }}>
                    <button 
                        onClick={() => navigate('/scan')}
                        className="nav-btn active" 
                        style={{ width: '100%', justifyContent: 'center', height: '60px', borderRadius: 'var(--radius-full)', fontSize: '1.1rem', fontWeight: '800', marginBottom: '1.5rem' }}
                    >
                        <i className="fa-solid fa-camera"></i> Visit this Merchant
                    </button>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        To support this business, please visit them in person and scan their official BFG standee.
                    </p>
                </div>

                {/* Network Support Summary (Sharded) */}
                <div className="detail-section glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2))' }}>
                    <h3 style={{ marginBottom: '1.2rem', fontSize: '1.1rem' }}>
                        <i className="fa-solid fa-chart-column" style={{ color: 'var(--accent-primary)' }}></i> Network Support
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.checkins}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Total Visitors</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-success)' }}>RM {stats.volume.toLocaleString()}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Verified Support</div>
                        </div>
                    </div>
                </div>

                {/* Symmetric Loyalty Connection */}
                {currentUser && <UserLoyaltyConnection bizId={id} userId={currentUser.uid} />}

                {/* Audit Trail */}
                {liveAuditLog.length > 0 && (
                    <div className="detail-section glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-list-check"></i> System Audit Trail</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {liveAuditLog.map((entry, idx) => {
                                const date = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
                                return (
                                    <div key={entry.id || idx} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{entry.action}</span>
                                            <span>{date.toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem' }}>{anonymizeText(entry.details)}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                                            Operator: {entry.userNickname || getNickname(entry.user)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Back Button Floating */}
            <button 
                onClick={() => navigate('/directory')}
                style={{ position: 'fixed', bottom: '100px', right: '20px', width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', backdropFilter: 'blur(10px)', zIndex: 100 }}
            >
                <i className="fa-solid fa-arrow-left"></i>
            </button>

            {showFeedbackModal && (
                <FeedbackModal 
                    business={business} 
                    currentUser={currentUser} 
                    onClose={() => setShowFeedbackModal(false)} 
                />
            )}
        </div>
    );
};

const UserLoyaltyConnection = ({ bizId, userId }) => {
    const [stats, setStats] = useState({ checkins: 0, purchases: 0, totalSpend: 0 });
    const [purchaseLog, setPurchaseLog] = useState([]);
    const [rewardsLog, setRewardsLog] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bizId || !userId) return;
        
        const unsubscribe = db.collection('transactions')
            .where('bizId', '==', bizId)
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snap => {
                let checkins = 0;
                let purchases = 0;
                let totalSpend = 0;
                const pLog = [];
                const rLog = [];

                snap.forEach(doc => {
                    const t = doc.data();
                    if (t.type === 'checkin') checkins++;
                    if (t.type === 'purchase' && t.status === 'verified') {
                        purchases++;
                        totalSpend += (parseFloat(t.amount) || 0);
                        pLog.push({ id: doc.id, ...t });
                    }
                    if (t.type === 'reward') {
                        rLog.push({ id: doc.id, ...t });
                    }
                });

                setStats({ checkins, purchases, totalSpend });
                setPurchaseLog(pLog);
                setRewardsLog(rLog);
                setLoading(false);
            });
            
        return () => unsubscribe();
    }, [bizId, userId]);

    if (loading) return null;
    if (stats.checkins === 0 && stats.purchases === 0 && rewardsLog.length === 0) return null;

    return (
        <div className="loyalty-card slide-up" style={{ marginTop: '2rem' }}>
            <div className="loyalty-header">
                <div className="loyalty-icon-box">
                    <i className="fa-solid fa-handshake-simple"></i>
                </div>
                <div className="loyalty-title-group">
                    <h3>Your Loyalty Connection</h3>
                    <p>Symmetric transparency between you and this business.</p>
                </div>
            </div>

            <div className="loyalty-stats-grid">
                <div className="loyalty-stat-card">
                    <div className="loyalty-stat-value" style={{ color: '#fff' }}>{stats.checkins}</div>
                    <div className="loyalty-stat-label">Check-ins</div>
                </div>
                <div className="loyalty-stat-card">
                    <div className="loyalty-stat-value" style={{ color: '#ffb84d' }}>{stats.purchases}</div>
                    <div className="loyalty-stat-label">Purchases</div>
                </div>
                <div className="loyalty-stat-card">
                    <div className="loyalty-stat-value" style={{ color: 'var(--accent-success)' }}>RM {stats.totalSpend.toFixed(0)}</div>
                    <div className="loyalty-stat-label">Impact</div>
                </div>
            </div>

            {rewardsLog.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="loyalty-section-label">
                        <i className="fa-solid fa-gift" style={{ color: '#ff5757', marginRight: '5px' }}></i> Gratitude Rewards Received
                    </label>
                    {rewardsLog.map(r => (
                        <div key={r.id} className="loyalty-reward-item">
                            <p className="loyalty-reward-text">{r.description}</p>
                            <p className="loyalty-reward-date">
                                Granted on {r.timestamp?.toDate ? r.timestamp.toDate().toLocaleDateString() : new Date(r.timestamp).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '15px' }}>
                <label className="loyalty-section-label">Recent Verified Purchases</label>
                {purchaseLog.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>No verified purchases yet.</p>
                ) : (
                    purchaseLog.slice(0, 3).map(p => (
                        <div key={p.id} className="loyalty-log-item">
                            <span className="loyalty-log-meta">{p.timestamp?.toDate ? p.timestamp.toDate().toLocaleDateString() : new Date(p.timestamp).toLocaleDateString()}</span>
                            <span className="loyalty-log-value">RM {p.amount.toFixed(2)}</span>
                        </div>
                    ))
                )}
            </div>
            
            <p className="loyalty-footer-note">
                <i className="fa-solid fa-circle-info"></i> This information is shared with the merchant only upon scanning your My Introduction Card.
            </p>
        </div>
    );
};

export default BusinessProfile;
