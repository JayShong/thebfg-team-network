import React, { useState, useEffect } from 'react';
import { evaluateTier, CURRENT_SEASON, BADGE_CATEGORIES, getGuestBadges } from '../../utils/badgeLogic';
import { useAuth } from '../../contexts/AuthContext';

const JOURNEY_STEPS = [
    { name: 'Scout', icon: 'fa-binoculars', color: 'var(--accent-primary)' },
    { name: 'Steward', icon: 'fa-hand-holding-heart', color: 'var(--text-secondary)' },
    { name: 'Guardian', icon: 'fa-shield-halved', color: 'var(--accent-warning)' },
    { name: 'Legend', icon: 'fa-crown', color: 'var(--accent-success)' }
];

const TierShowcase = ({ currentUser }) => {
    const { isGuest } = useAuth();
    
    // For Guests, we simulate badges based on localStorage impact to show a "Teaser Tier"
    const getBadgesToEvaluate = () => {
        if (!isGuest) return currentUser?.badges || {};
        
        try {
            const key = isGuest ? 'bfg_guest_personal_stats' : 'bfg_personal_stats';
            const saved = localStorage.getItem(key);
            if (saved) {
                const stats = JSON.parse(saved);
                return getGuestBadges(stats);
            }
        } catch (e) {
            console.warn("Failed to parse guest stats for tier evaluation", e);
        }
        return {};
    };

    const userBadges = getBadgesToEvaluate();
    const tierInfo = evaluateTier(userBadges);

    const currentStepIdx = Math.max(0, JOURNEY_STEPS.findIndex(s => s.name === tierInfo.name));
    const nextStep = JOURNEY_STEPS[currentStepIdx + 1];

    let msgText = tierInfo.isMax 
        ? "You have reached the pinnacle of the movement: Legend Status." 
        : `Unlock ${tierInfo.totalNext - tierInfo.badgeCount} more badges to become a ${nextStep?.name || 'Legend'}.`;
    
    if (!tierInfo.isMax && tierInfo.missingCats && tierInfo.missingCats.length > 0) {
        const countDiff = Math.max(0, tierInfo.totalNext - tierInfo.badgeCount);
        if (countDiff > 0) {
            msgText = `Unlock ${countDiff} more badges AND mastery in ${tierInfo.missingCats.join(', ')} to become a ${nextStep?.name}.`;
        } else {
            msgText = `Badge count met! Complete ${tierInfo.missingCats.join(', ')} requirements to become a ${nextStep?.name}.`;
        }
    }

    const seasonEnd = new Date(CURRENT_SEASON.endDate);
    const daysLeft = Math.max(0, Math.ceil((seasonEnd - new Date()) / (1000 * 60 * 60 * 24)));

    return (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.6, margin: 0, color: '#ffffff', fontWeight: '800' }}>Ambassador Journey</p>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                        <i className="fa-solid fa-clock"></i> {CURRENT_SEASON.name}
                    </span>
                </div>
                
                {/* Journey Steps Visualization */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '2rem', padding: '0 1rem' }}>
                    {/* Line behind steps */}
                    <div style={{ position: 'absolute', top: '15px', left: '2rem', right: '2rem', height: '2px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
                    
                    {JOURNEY_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        return (
                            <div key={step.name} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '50%', 
                                    background: isCurrent ? step.color : (isCompleted ? step.color : '#1e293b'),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isCurrent || isCompleted ? '#fff' : 'rgba(255,255,255,0.2)',
                                    border: isCurrent ? '4px solid rgba(255,255,255,0.2)' : '2px solid rgba(255,255,255,0.1)',
                                    boxShadow: isCurrent ? `0 0 15px ${step.color}66` : 'none',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <i className={`fa-solid ${step.icon}`} style={{ fontSize: '0.9rem' }}></i>
                                </div>
                                <span style={{ fontSize: '0.6rem', fontWeight: isCurrent ? '800' : '500', color: isCurrent ? '#fff' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                                    {step.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
                
                <h2 style={{ textAlign: 'center', fontSize: '1.8rem', margin: '0.5rem 0', color: '#fff' }}>{tierInfo.name} Status</h2>
                
                <p style={{ fontWeight: 600, textAlign: 'center', marginBottom: '1.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                    {tierInfo.badgeCount} / {tierInfo.isMax ? '100+' : tierInfo.totalNext} Tokens of Empathy
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    {['Seen', 'Verified', 'Valued'].map(cat => (
                        <span key={cat} style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.3)', color: BADGE_CATEGORIES[cat].color, padding: '0.3rem 0.75rem', borderRadius: '2rem', border: `1px solid ${BADGE_CATEGORIES[cat].color}33`, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className={`fa-solid ${BADGE_CATEGORIES[cat].icon}`}></i> {tierInfo.categoryCounts[cat]} {cat}
                        </span>
                    ))}
                </div>
                
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '1rem', height: '10px', marginTop: '1.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ 
                        background: `linear-gradient(90deg, ${JOURNEY_STEPS[currentStepIdx].color}, ${JOURNEY_STEPS[Math.min(currentStepIdx + 1, 3)].color})`, 
                        height: '100%', 
                        width: `${tierInfo.progress}%`, 
                        borderRadius: '1rem', 
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }}></div>
                </div>
                
                <p style={{ fontSize: '0.85rem', marginTop: '1.25rem', opacity: 0.9, textAlign: 'center', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                    {msgText}
                </p>

                <p style={{ fontSize: '0.65rem', marginTop: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                    <i className="fa-solid fa-hourglass-half"></i> Genesis Season archiving in {daysLeft} days
                </p>
            </div>
        </div>
    );
};

export default TierShowcase;

