import React from 'react';
import { evaluateTier, CURRENT_SEASON, BADGE_CATEGORIES } from '../../utils/badgeLogic';

const TierShowcase = ({ currentUser }) => {
    
    // Safety check for user Badges payload
    const userBadges = currentUser?.badges || {};
    const tierInfo = evaluateTier(userBadges);

    let targetTierName = 'Blue';
    if (tierInfo.name === 'Silver') targetTierName = 'Gold';
    else if (tierInfo.name === 'Gold') targetTierName = 'Platinum';
    else if (tierInfo.name === 'Blue') targetTierName = 'Silver';

    let msgText = tierInfo.isMax ? `You have reached the highest tier!` : `Unlock ${tierInfo.totalNext - tierInfo.badgeCount} more badges to reach ${targetTierName}`;
    
    if (!tierInfo.isMax && tierInfo.missingCats && tierInfo.missingCats.length > 0) {
        const countDiff = Math.max(0, tierInfo.totalNext - tierInfo.badgeCount);
        if (countDiff > 0) {
            msgText = `Unlock ${countDiff} more badges AND mastery in ${tierInfo.missingCats.join(', ')} to reach ${targetTierName}.`;
        } else {
            msgText = `Badge count met! Complete ${tierInfo.missingCats.join(', ')} requirements to reach ${targetTierName}.`;
        }
    }

    // Season logic
    const seasonEnd = new Date(CURRENT_SEASON.endDate);
    const daysLeft = Math.max(0, Math.ceil((seasonEnd - new Date()) / (1000 * 60 * 60 * 24)));

    return (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1))', borderColor: 'rgba(59, 130, 246, 0.4)' }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.7, margin: 0, color: '#ffffff' }}>Current Tier</p>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.15)', padding: '0.2rem 0.6rem', borderRadius: '1rem', letterSpacing: '0.5px', color: '#ffffff' }}>
                        <i className="fa-solid fa-clock"></i> {CURRENT_SEASON.name} · {daysLeft} days left
                    </span>
                </div>
                
                <h2 style={{ textAlign: 'center', fontSize: '2rem', margin: '0.5rem 0', color: '#ffffff' }}>{tierInfo.name} Status</h2>
                
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '1rem 0', textAlign: 'center', color: '#ffffff' }}>
                    <i className="fa-solid fa-gem"></i>
                </div>
                
                <p style={{ fontWeight: 500, textAlign: 'center', marginBottom: '1rem', color: '#ffffff' }}>
                    {tierInfo.badgeCount} / {tierInfo.isMax ? 'MAX' : tierInfo.totalNext} Badges
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.65rem', background: `${BADGE_CATEGORIES['Seen'].color}33`, color: BADGE_CATEGORIES['Seen'].color, padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                        <i className={`fa-solid ${BADGE_CATEGORIES['Seen'].icon}`}></i> {tierInfo.categoryCounts['Seen']} Seen
                    </span>
                    <span style={{ fontSize: '0.65rem', background: `${BADGE_CATEGORIES['Verified'].color}33`, color: BADGE_CATEGORIES['Verified'].color, padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                        <i className={`fa-solid ${BADGE_CATEGORIES['Verified'].icon}`}></i> {tierInfo.categoryCounts['Verified']} Verified
                    </span>
                    <span style={{ fontSize: '0.65rem', background: `${BADGE_CATEGORIES['Valued'].color}33`, color: BADGE_CATEGORIES['Valued'].color, padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>
                        <i className={`fa-solid ${BADGE_CATEGORIES['Valued'].icon}`}></i> {tierInfo.categoryCounts['Valued']} Valued
                    </span>
                </div>
                
                {/* Progress Bar mapped manually from original CSS logic */}
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '1rem', height: '8px', marginTop: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', height: '100%', width: `${tierInfo.progress}%`, borderRadius: '1rem', transition: 'width 1s ease-out' }}></div>
                </div>
                
                <p style={{ fontSize: '0.85rem', marginTop: '1rem', opacity: 0.9, textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                    {msgText}
                </p>
            </div>
        </div>
    );
};

export default TierShowcase;
