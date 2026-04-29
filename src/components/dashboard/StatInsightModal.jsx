import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';

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

    if (!isOpen) return null;

    const renderContent = () => {
        switch (type) {
            case 'ambassadors':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-users"></i> The Verified Network</h2>
                        <p className="insight-desc">Ambassadors are authenticated members of the movement. This data is anonymized and updated daily.</p>
                        
                        {loading ? (
                            <div className="insight-loading"><i className="fa-solid fa-circle-notch fa-spin"></i> Analyzing Demographics...</div>
                        ) : demographics ? (
                            <div className="demographic-charts">
                                <div className="chart-group">
                                    <h4><i className="fa-solid fa-venus-mars"></i> Gender Diversity</h4>
                                    {Object.entries(demographics.gender).map(([label, pct]) => (
                                        <div key={label} className="chart-row">
                                            <span className="chart-label">{label}</span>
                                            <div className="chart-bar-bg"><div className="chart-bar" style={{ width: `${pct}%`, background: 'var(--accent-primary)' }}></div></div>
                                            <span className="chart-pct">{pct}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="chart-group">
                                    <h4><i className="fa-solid fa-location-dot"></i> Geographical Presence</h4>
                                    {Object.entries(demographics.location).map(([label, pct]) => (
                                        <div key={label} className="chart-row">
                                            <span className="chart-label">{label}</span>
                                            <div className="chart-bar-bg"><div className="chart-bar" style={{ width: `${pct}%`, background: 'var(--accent-success)' }}></div></div>
                                            <span className="chart-pct">{pct}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="chart-group">
                                    <h4><i className="fa-solid fa-cake-candles"></i> Age Groups</h4>
                                    {Object.entries(demographics.age).map(([label, pct]) => (
                                        <div key={label} className="chart-row">
                                            <span className="chart-label">{label}</span>
                                            <div className="chart-bar-bg"><div className="chart-bar" style={{ width: `${pct}%`, background: '#FFA000' }}></div></div>
                                            <span className="chart-pct">{pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="insight-notice">Demographic data is being aggregated. Check back soon.</p>
                        )}
                    </div>
                );

            case 'founders':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-store"></i> For-Good Standards</h2>
                        <p className="insight-desc">Every business in this network is verified against the BFG Living Standards.</p>
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
                                <i className="fa-solid fa-shield-halved"></i>
                                <span>Transparency</span>
                            </div>
                        </div>
                        <p className="insight-subtext">We choose founders who prioritize conviction over convenience, ensuring your supports move the needle for society.</p>
                    </div>
                );

            case 'supports':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-location-dot"></i> Collective Signal</h2>
                        <p className="insight-desc">Every check-in is a powerful signal of support.</p>
                        <div className="insight-highlight">
                            <p>"A check-in tells a founder that they are not alone. It proves that the community values their decision to do good."</p>
                        </div>
                        <p className="insight-desc">Ghost Supports are signals from anonymous visitors, while Member Supports are verified impacts from our Ambassador network.</p>
                    </div>
                );

            case 'economic-proof':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-receipt"></i> The Verification Chain</h2>
                        <p className="insight-desc">"Economic Proof" is the most powerful force in the movement.</p>
                        <div className="insight-highlight success">
                            <p>Every purchase recorded here is verified by the Merchant. It proves that conviction-driven commerce is viable.</p>
                        </div>
                        <p className="insight-desc">This is not just data; it is an economic fact that convinces others to join the movement.</p>
                    </div>
                );

            case 'movement-actions':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-users-viewfinder"></i> Collective Surges</h2>
                        <p className="insight-desc">Initiatives are focused bursts of economic energy designed to drive systemic change.</p>
                        <div className="insight-highlight">
                            <p>"When the entire network acts together on a single cause, we become an undeniable market force."</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => window.location.href = '/initiatives'} style={{ width: '100%', marginTop: '1rem' }}>
                            Explore Initiatives
                        </button>
                    </div>
                );

            case 'goal-30':
                return (
                    <div className="insight-content">
                        <h2 className="insight-title"><i className="fa-solid fa-chart-pie"></i> The Strategic Path</h2>
                        <p className="insight-desc">Our target is to reclaim 30% of the local economy for for-good businesses.</p>
                        <div className="goal-visual">
                            <div className="goal-progress-circle">
                                <span className="goal-val">{stats?.gdpPenetration || '0.1%'}</span>
                            </div>
                        </div>
                        <p className="insight-desc">30% is the "Tipping Point" where for-good commerce becomes the default standard for the entire country.</p>
                    </div>
                );
            
            case 'impact-waste':
            case 'impact-trees':
            case 'impact-families':
                const impactMap = {
                    'impact-waste': { title: 'Waste Diverted', icon: 'fa-recycle', desc: 'Verified by our audit partners. Be part of it by supporting businesses that divert waste in our network.' },
                    'impact-trees': { title: 'Trees Planted', icon: 'fa-tree', desc: 'Verified by our audit partners. Be part of it by supporting businesses that plant trees in our network.' },
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container glass-card slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default StatInsightModal;
