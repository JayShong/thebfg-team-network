import React from 'react';

const InitiativeCard = ({ initiative }) => {
    // legacy parsing
    const hasEnded = initiative.status === 'past' || (initiative.endDate && new Date(initiative.endDate) < new Date());
    
    return (
        <div className={`glass-card ${hasEnded ? 'initiative-past' : ''}`} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{initiative.title}</h3>
                <span className={`tier-badge ${hasEnded ? 'tier-badge-expired' : 'tier-badge-standard'}`}>
                    {hasEnded ? 'Completed' : 'Active'}
                </span>
            </div>
            
            {initiative.narrative && (
                <p style={{ marginTop: '1rem', color: '#ffffff', lineHeight: '1.5' }}>
                    {initiative.narrative}
                </p>
            )}

            {initiative.photos && initiative.photos.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {initiative.photos.map((photoUrl, idx) => (
                        <img 
                            key={idx} 
                            src={photoUrl} 
                            alt={`Initiative ${idx}`} 
                            style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} 
                            loading="lazy"
                        />
                    ))}
                </div>
            )}

            {initiative.mechanism && (
                <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>HOW IT WORKS</h4>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{initiative.mechanism}</p>
                </div>
            )}

            {initiative.url && (
                <a href={initiative.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>
                    Learn More <i className="fa-solid fa-arrow-right"></i>
                </a>
            )}
        </div>
    );
};

export default InitiativeCard;
