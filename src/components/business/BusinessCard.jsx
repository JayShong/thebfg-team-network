import React from 'react';
import { useNavigate } from 'react-router-dom';

const BusinessCard = ({ business }) => {
    const navigate = useNavigate();

    const status = business.status || 'active';
    const isExpired = status === 'expired';
    const isAffiliate = business.type === 'affiliate';
    
    const scoreStr = typeof business.score === 'object' && business.score 
        ? `${business.score.s}${business.score.e}${business.score.c}${business.score.soc}${business.score.env}` 
        : (business.score || '---');

    const handleNavigation = (e) => {
        e.stopPropagation();
        navigate(`/business/${business.id}`);
    };

    return (
        <div 
            className={`business-card glass-card ${isExpired ? 'biz-expired' : ''}`}
            onClick={handleNavigation}
        >
            <div 
                className="business-img" 
                style={business.shopfrontImg ? { backgroundImage: `url(${business.shopfrontImg})`, backgroundSize: 'cover', backgroundPosition: 'center', border: 'none' } : {}}
            >
                {!business.shopfrontImg && (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}></div>
                )}
            </div>
            
            <div className="business-info">
                <h3>{business.name}</h3>
                
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <i className="fa-solid fa-user-tie" style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}></i>
                    {business.founder || 'Network Member'}
                </p>

                <div style={{ display: 'flex', gap: '5px', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    {isExpired ? (
                        <span className="business-score" style={{ color: '#F44336', borderColor: '#F44336', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            <i className="fa-solid fa-ban"></i> {business.expiryReason || 'Expired'}
                        </span>
                    ) : isAffiliate ? (
                        <span className="business-score" style={{ color: 'var(--text-warning)', borderColor: 'var(--text-warning)', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            <i className="fa-solid fa-circle-info"></i> Affiliate Member (Not Audited)
                        </span>
                    ) : (
                        <span className="business-score" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                            <i className="fa-solid fa-star"></i> BFG Score: {scoreStr}
                        </span>
                    )}
                    
                    <span className="tier-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                        {business.industry}
                    </span>
                </div>
                
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <i className="fa-solid fa-location-dot"></i>
                    {business.location}
                </p>
            </div>
        </div>
    );
};

export default BusinessCard;
