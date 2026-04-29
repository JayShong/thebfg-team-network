import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BADGE_CATEGORIES } from '../../utils/badgeLogic';

const BadgeInsightDrawer = ({ isOpen, onClose, badge }) => {
    // Cleanup scroll lock on unmount
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !badge) return null;

    const catInfo = BADGE_CATEGORIES[badge.category];

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="intelligence-drawer glass-card slide-up" onClick={e => e.stopPropagation()}>
                <div className="drawer-handle" onClick={onClose}></div>
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <div className="insight-content">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3.5rem', color: catInfo.color, margin: '0.5rem 0' }}>
                                <i className={`fa-solid ${badge.icon}`}></i>
                            </div>
                            <h2 className="insight-title" style={{ justifyContent: 'center', marginBottom: '0.25rem' }}>{badge.title}</h2>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.8rem', borderRadius: '1rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {badge.category} {badge.tier ? `· ${badge.tier}` : ''}
                            </span>
                        </div>

                        <div className="insight-highlight" style={{ borderLeftColor: catInfo.color, background: `rgba(${catInfo.color.startsWith('var') ? '139, 92, 246' : '255, 255, 255'}, 0.05)` }}>
                            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>The Why</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#ffffff', lineHeight: '1.5' }}>{badge.why}</p>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ color: catInfo.color, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>How to Earn</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>{badge.how}</p>
                        </div>

                        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                "Every badge earned is a permanent record of your conviction."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BadgeInsightDrawer;
