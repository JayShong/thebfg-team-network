import React from 'react';
import { CURRENT_SEASON } from '../../utils/badgeLogic';

const SeasonalSnapshot = ({ stats, onClose }) => {
    // Fallback to local if not provided
    const displayStats = stats || JSON.parse(localStorage.getItem('bfg_personal_stats') || '{}');
    
    const {
        totalCheckins = 0,
        totalPurchases = 0,
        totalWaste = 0,
        totalTrees = 0,
        uniqueBizIds = {}
    } = displayStats;

    const discoveries = Object.keys(uniqueBizIds).length;
    
    // Calculate season progress
    const start = new Date(CURRENT_SEASON.startDate).getTime();
    const end = new Date(CURRENT_SEASON.endDate).getTime();
    const now = Date.now();
    const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

    return (
        <div className="modal flex-center" style={{ display: 'flex', background: 'rgba(0,0,0,0.92)', zIndex: 11000 }}>
            <div className="modal-content glass-card slide-up" style={{ 
                maxWidth: '420px', 
                padding: 0, 
                overflow: 'hidden',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 20px rgba(245, 158, 11, 0.1)'
            }}>
                {/* Header Branding */}
                <div style={{ 
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(139, 92, 246, 0.2))',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    position: 'relative'
                }}>
                    <button 
                        onClick={onClose}
                        style={{ 
                            position: 'absolute', 
                            top: '1rem', 
                            right: '1rem', 
                            background: 'rgba(255,255,255,0.05)', 
                            border: 'none', 
                            color: '#fff', 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%',
                            cursor: 'pointer'
                        }}
                    >
                        <i className="fa-solid fa-times"></i>
                    </button>

                    <div style={{ 
                        width: '60px', 
                        height: '60px', 
                        background: 'rgba(0,0,0,0.3)', 
                        borderRadius: '15px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        border: '1px solid rgba(245, 158, 11, 0.5)',
                        boxShadow: '0 0 15px rgba(245, 158, 11, 0.2)'
                    }}>
                        <i className="fa-solid fa-seedling" style={{ fontSize: '2rem', color: '#F59E0B' }}></i>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', margin: 0, color: '#fff' }}>{CURRENT_SEASON.name}</h2>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '0.4rem' }}>
                        Seasonal Impact Snapshot
                    </p>
                </div>

                {/* Content Area */}
                <div style={{ padding: '2rem 1.5rem' }}>
                    
                    {/* Primary Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>{totalCheckins}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Supports</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-success)' }}>{totalPurchases}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Purchases</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3B82F6' }}>{discoveries}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Seen</div>
                        </div>
                    </div>

                    {/* Impact Highlights */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '15px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Collective Proof</h4>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <i className="fa-solid fa-trash-can" style={{ color: '#10B981', fontSize: '0.9rem' }}></i>
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Waste Diverted</span>
                            </div>
                            <div style={{ fontWeight: '700', color: '#fff' }}>{totalWaste.toFixed(1)} kg</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <i className="fa-solid fa-leaf" style={{ color: '#8B5CF6', fontSize: '0.9rem' }}></i>
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Carbon Offset</span>
                            </div>
                            <div style={{ fontWeight: '700', color: '#fff' }}>{totalTrees.toFixed(1)} trees</div>
                        </div>
                    </div>

                    {/* Season Progress */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            <span>Season Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ 
                                height: '100%', 
                                width: `${progress}%`, 
                                background: 'linear-gradient(90deg, #F59E0B, var(--accent-success))',
                                borderRadius: '10px'
                            }}></div>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                            Genesis Season ends Dec 31, 2026. All impact is archived.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            className="btn btn-primary"
                            style={{ 
                                background: 'linear-gradient(135deg, #F59E0B, var(--accent-success))',
                                border: 'none',
                                flex: 2
                            }}
                            onClick={() => alert("Share feature coming soon! Take a screenshot to share your impact.")}
                        >
                            <i className="fa-solid fa-share-nodes"></i> Share Impact
                        </button>
                        <button 
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Footer Subtle ID */}
                <div style={{ padding: '0.8rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', fontSize: '0.6rem', color: 'var(--text-secondary)', opacity: 0.5, letterSpacing: '1px' }}>
                    VERIFIED CONVICTION SIGNAL • ID: {displayStats.uid || 'GENESIS-SCOUT'}
                </div>
            </div>
        </div>
    );
};

export default SeasonalSnapshot;
