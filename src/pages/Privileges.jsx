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
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Unlock rewards by habitually choosing to participate in the empathy economy.</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                <strong style={{ color: '#ffffff' }}>What are we trying to achieve?</strong> We believe that supporting empathetic, for-good local businesses shouldn't just be a transaction—it should be a celebrated lifestyle. We don't focus on how much you spend, but rather how consistently you build the habit of choosing empathy over short-termism. Your Conviction Network Tier emerges naturally as you collect Tokens of Empathy (Badges) through active discovery and community building. Higher Tiers unlock experiential privileges like exclusive founders' dinners and behind-the-scenes access.
            </div>

            <TierShowcase currentUser={currentUser} />

            {/* Gamification Engine Component */}
            <BadgeGallery />
        </div>
    );
};

export default Privileges;
