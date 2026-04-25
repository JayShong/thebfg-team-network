import React from 'react';
import BadgeGallery from '../components/profile/BadgeGallery';
import TierShowcase from '../components/profile/TierShowcase';
import { useAuth } from '../contexts/AuthContext';

const Privileges = () => {
    const { currentUser } = useAuth();

    return (
        <div style={{ width: '100%', paddingBottom: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.25rem' }}>Conviction Network Privileges</h1>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.6rem', borderRadius: '1rem', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', letterSpacing: '0.5px' }}>ALPHA / WIP</span>
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Unlock privileges by habitually choosing conviction over convenience.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                <strong style={{ color: '#ffffff' }}>The Ambassador Journey</strong> Supporting for-good businesses isn't just a transaction — it's a lifestyle of conviction. Your Network Tier rises as you collect <strong style={{ color: 'var(--accent-primary)' }}>Tokens of Empathy</strong> through active discovery and community building. From Scout to Legend, every token earned proves that conviction-driven consumers are real. Higher Tiers unlock experiential privileges like exclusive founders' dinners and behind-the-scenes access.
            </div>

            {/* Genesis Season Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(139, 92, 246, 0.1))',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <i className="fa-solid fa-seedling" style={{ color: '#F59E0B', fontSize: '1.2rem' }}></i>
                <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#F59E0B' }}>Genesis Badge Season</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        The foundational season — extended through December 31, 2026. All badges earned now are permanently archived when the season closes.
                    </div>
                </div>
            </div>

            <TierShowcase currentUser={currentUser} />

            {/* Gamification Engine Component */}
            <BadgeGallery />
        </div>
    );
};

export default Privileges;
