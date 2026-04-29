import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../../services/firebase';

const DonutChart = ({ data, color, size = 100 }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '15px', marginTop: '1rem' }}>
            {Object.entries(data).map(([label, pct]) => {
                const offset = circumference - (pct / 100) * circumference;
                return (
                    <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
                            <svg width={size} height={size} viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                <circle 
                                    cx="50" cy="50" r={radius} 
                                    fill="transparent" 
                                    stroke={color} 
                                    strokeWidth="8" 
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 5px ${color}88)` }}
                                    transform="rotate(-90 50 50)"
                                />
                                <text x="50" y="50" textAnchor="middle" dy="7" fill="#fff" fontSize="18" fontWeight="800">
                                    {Math.round(pct)}%
                                </text>
                            </svg>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: '600', textTransform: 'uppercase' }}>{label}</div>
                    </div>
                );
            })}
        </div>
    );
};

const StatInsightModal = ({ isOpen, onClose, type, stats }) => {
    const [demographics, setDemographics] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && type === 'ambassadors') {
            const fetchDemographics = async () => {
                setLoading(true);
                try {
                    const doc = await db.collection('system').doc('demographics').get();
                    if (doc.exists) {
                        setDemographics(doc.data());
                    }
                } catch (e) {
                    console.error("Failed to fetch demographics", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchDemographics();
        }
    }, [isOpen, type]);

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

    if (!isOpen) return null;

    const renderContent = () => {
        switch (type) {
            case 'ambassadors':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-users"></i> The Demographic Pulse</h2>
                        <p className="insight-desc">Our network is built on authenticated economic force. Data is anonymized with a 5% privacy floor.</p>
                        
                        {loading ? (
                            <div className="insight-loading"><i className="fa-solid fa-circle-notch fa-spin"></i> Analyzing Demographics...</div>
                        ) : demographics ? (
                            <div className="demographic-charts">
                                <div className="chart-group" style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                                        <i className="fa-solid fa-venus-mars"></i> Gender Diversity
                                    </h4>
                                    <DonutChart data={demographics.gender} color="var(--accent-primary)" />
                                </div>
                                <div className="chart-group" style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--accent-success)' }}>
                                        <i className="fa-solid fa-location-dot"></i> Network Districts
                                    </h4>
                                    <DonutChart data={demographics.location} color="var(--accent-success)" />
                                </div>
                                <div className="chart-group">
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#FFA000' }}>
                                        <i className="fa-solid fa-cake-candles"></i> Age Groups
                                    </h4>
                                    <DonutChart data={demographics.age} color="#FFA000" />
                                </div>
                            </div>
                        ) : (
                            <p className="insight-notice">Demographic pulse is being aggregated. Check back soon.</p>
                        )}
                    </div>
                );

            case 'founders':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-store"></i> The Living Standards</h2>
                        <p className="insight-desc">Every business in this network is verified against the BFG Five Pillars of Conviction.</p>
                        <div className="standard-grid">
                            <div className="standard-item">
                                <i className="fa-solid fa-leaf"></i>
                                <span>Sustainability</span>
                            </div>
                            <div className="standard-item">
                                <i className="fa-solid fa-scale-balanced"></i>
                                <span>Fair Wages</span>
                            </div>
                            <div className="standard-item">
                                <i className="fa-solid fa-hand-holding-heart"></i>
                                <span>Community Focus</span>
                            </div>
                            <div className="standard-item">
                                <i className="fa-solid fa-box-open"></i>
                                <span>Ethical Sourcing</span>
                            </div>
                            <div className="standard-item">
                                <i className="fa-solid fa-shield-halved"></i>
                                <span>Transparency</span>
                            </div>
                        </div>
                        <p className="insight-subtext">"We choose founders who prioritize conviction over convenience, proving that society-first commerce is the undeniable point for systemic change."</p>
                    </div>
                );

            case 'supports':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-location-dot"></i> Collective Signal</h2>
                        <p className="insight-desc">A check-in sends a signal to founders to overcome their doubts that no one supports their conviction.</p>
                        <div className="insight-highlight">
                            <p>"Your presence proves the market for good exists. Every signal strengthens the foundation of a new economy."</p>
                        </div>
                        <p className="insight-desc">Guest Supports are anonymous signals, while Member Supports are verified impacts from our Ambassador network.</p>
                    </div>
                );

            case 'economic-proof':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-receipt"></i> Economic Proof</h2>
                        <p className="insight-desc">Purchases send a signal that people like you who choose conviction over convenience exist.</p>
                        <div className="insight-highlight success">
                            <p>Every purchase is the "Verification Chain" that proves the economic viability of the for-good model.</p>
                        </div>
                        <p className="insight-desc">This is the undeniable fact that forces the mainstream to recognize our collective power.</p>
                    </div>
                );

            case 'movement-actions':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-users-viewfinder"></i> Collective Surges</h2>
                        <p className="insight-desc">Initiatives are focused surges of economic energy. When the entire network acts together, we drive change.</p>
                        <div className="insight-highlight">
                            <p>"A single purchase is a signal. A shared initiative is a revolution."</p>
                        </div>
                        <button className="btn btn-primary clickable" onClick={() => window.location.href = '/initiatives'} style={{ width: '100%', marginTop: '1rem' }}>
                            View Active Initiatives
                        </button>
                    </div>
                );

            case 'goal-30':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-chart-pie"></i> The Strategic Path</h2>
                        <p className="insight-desc">Our target is to reclaim 30% of the local economy. This is the "Undeniable Point" for systemic change.</p>
                        <div className="goal-visual">
                            <div className="goal-progress-circle">
                                <span className="goal-val">{stats?.gdpPenetration || '0.1%'}</span>
                            </div>
                        </div>
                        <p className="insight-desc">Once 30% of our daily choices prioritize conviction, the for-good model becomes the default standard for society.</p>
                    </div>
                );
            
            case 'impact-waste':
            case 'impact-trees':
            case 'impact-families':
                const impactMap = {
                    'impact-waste': { title: 'Waste Diverted', icon: 'fa-recycle', desc: 'Aggregate results achieved by businesses. Ambassadors "piggyback" on these stories because their choices funded this impact.' },
                    'impact-trees': { title: 'Trees Planted', icon: 'fa-tree', desc: 'Aggregate results achieved by businesses. Ambassadors "piggyback" on these stories because their choices funded this impact.' },
                    'impact-families': { title: 'Families Supported', icon: 'fa-users', desc: 'Your economic force creates stable livelihoods and intergenerational resilience for the families behind these businesses.' }
                };
                const config = impactMap[type];
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className={`fa-solid ${config.icon}`}></i> {config.title}</h2>
                        <p className="insight-desc">{config.desc}</p>
                        <div className="insight-highlight">
                            <p>This impact is achieved by our Founders, powered by your patronage.</p>
                        </div>
                    </div>
                );

            default:
                return <p>Insight coming soon...</p>;
        }
    };

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="intelligence-drawer glass-card slide-up" onClick={e => e.stopPropagation()} style={{ 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <div className="drawer-handle" onClick={onClose}></div>
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {renderContent()}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StatInsightModal;
