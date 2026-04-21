import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useBusinesses from '../hooks/useBusinesses';
import AuthModal from '../components/auth/AuthModal';
import ReceiptLogger from '../components/profile/ReceiptLogger';

const Profile = () => {
    const { currentUser, isGuest, logout } = useAuth();
    const { businesses } = useBusinesses();
    const navigate = useNavigate();
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Detect if current user is an owner of any business
    const ownedBusinesses = businesses.filter(b => b.ownerEmail === currentUser?.email);
    const isOwner = ownedBusinesses.length > 0;

    if (!currentUser && !isGuest) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
                <i className="fa-solid fa-user-lock fa-4x" style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}></i>
                <h2>Identity Required</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px', marginBottom: '2rem' }}>
                    Join the Conviction Network to track your impact, earn badges, and verify purchases.
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
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Your Badge</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>TheBFG.Team Member</p>
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
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.2rem', color: '#fff' }}>{displayUser.name}</h3>
                    
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
                        {displayUser.isGuest && (
                            <span style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: '600' }}>
                                <i className="fa-solid fa-ghost"></i> Guest Explorer
                            </span>
                        )}
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{displayUser.email}</p>
                    <p className="user-id">ID: <span>{displayUser.uid ? displayUser.uid.substring(0, 10).toUpperCase() : displayUser.id}</span></p>
                </div>

                <div className="stats-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="stat-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="stat-value" style={{ fontSize: '1.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>{displayUser.checkins || 0}</div>
                        <div className="stat-label" style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Check-ins</div>
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
                                <li style={{ marginBottom: '0.4rem' }}>Record your check-ins and purchases.</li>
                                <li style={{ marginBottom: '0.4rem' }}>Unlock exclusive empathy badges.</li>
                                <li style={{ marginBottom: '0.4rem' }}>Reach higher Tiers for premium rewards.</li>
                            </ul>
                            <button onClick={() => setShowAuthModal(true)} className="btn btn-primary mt-3 feature-gradient" style={{ border: 'none' }}>
                                Create Free Account
                            </button>
                        </div>
                    ) : (
                        <>
                            {(displayUser.isSuperAdmin || displayUser.isAuditor) && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <button onClick={() => navigate('/admin')} className="btn btn-secondary">
                                        <i className="fa-solid fa-users-gear"></i> Admin Portal
                                    </button>
                                    <button onClick={() => navigate('/audit-hub')} className="btn btn-secondary">
                                        <i className="fa-solid fa-clipboard-check"></i> Audit Hub
                                    </button>
                                </div>
                            )}
                            
                            {isOwner && (
                                <button onClick={() => navigate('/business-portal')} className="btn btn-primary feature-gradient" style={{ border: 'none' }}>
                                    <i className="fa-solid fa-store"></i> My Business Portal
                                </button>
                            )}

                            <button onClick={logout} className="btn btn-secondary" style={{ border: '1px solid rgba(255,87,87,0.3)', color: '#ff5757' }}>
                                <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Purchase Logging Component */}
            {!displayUser.isGuest && <div className="mt-4"><ReceiptLogger businesses={businesses} /></div>}
            
            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </div>
    );
};

export default Profile;
