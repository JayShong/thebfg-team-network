import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';

const BusinessCard = ({ business }) => {
    const navigate = useNavigate();
    const [recommendCount, setRecommendCount] = useState(0);

    useEffect(() => {
        if (!business.id) return;
        // Fetch recommendation count once per card
        const fetchRecommendations = async () => {
            try {
                const snap = await db.collection('feedback')
                    .where('bizId', '==', business.id)
                    .where('type', '==', 'Recommendation')
                    .get();
                setRecommendCount(snap.size);
            } catch (e) {
                console.warn("Card recommendation fetch failed", e);
            }
        };
        fetchRecommendations();
    }, [business.id]);

    const status = business.status || 'active';
    const isExpired = status === 'expired';
    const isAffiliate = business.type === 'affiliate';
    
    const scoreStr = typeof business.score === 'object' && business.score 
        ? `${business.score.s}${business.score.e}${business.score.c}${business.score.soc}${business.score.env}` 
        : (business.score || '---');

    const getPlainScore = () => {
        if (isAffiliate || isExpired) return null;
        if (typeof business.score !== 'object' || !business.score) return null;
        
        const labels = { 'A': 'Paradigm-Defining', 'B': 'Strong', 'C': 'Developing', 'D': 'Exploitative' };
        const paradigmNames = { 's': 'Shareholder', 'e': 'Employee', 'c': 'Customer', 'soc': 'Society', 'env': 'Environment' };
        
        // Find paradigms with the best score
        const scores = Object.entries(business.score);
        const bestScore = scores.reduce((min, [k, v]) => v < min ? v : min, 'D');
        const bestParadigms = scores.filter(([k, v]) => v === bestScore).map(([k, v]) => paradigmNames[k]);
        
        if (bestParadigms.length === 0) return null;
        return `${labels[bestScore]} in ${bestParadigms.join(' & ')}`;
    };

    const plainScore = getPlainScore();
    const purposeExcerpt = business.purposeStatement 
        ? (business.purposeStatement.length > 90 ? business.purposeStatement.substring(0, 87) + '...' : business.purposeStatement)
        : null;

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

                {plainScore && (
                    <div style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        <i className="fa-solid fa-award" style={{ marginRight: '4px' }}></i>
                        {plainScore}
                    </div>
                )}

                {purposeExcerpt && (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                        "{purposeExcerpt}"
                    </p>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-location-dot"></i>
                        {business.location}
                    </p>
                    <div style={{ display: 'flex', gap: '0.8rem', marginLeft: 'auto' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <i className="fa-solid fa-heart"></i> {recommendCount}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <i className="fa-solid fa-person-walking"></i> {business.checkinsCount || 0}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessCard;
