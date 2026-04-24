import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PLATFORM_CONFIG } from '../config/platformConfig';

const Home = () => {
    const { currentUser } = useAuth();


    // Initialize states from localStorage with robust fallbacks
    const [stats, setStats] = useState(() => {
        try {
            const saved = localStorage.getItem('bfg_global_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object' && parsed.consumers !== undefined) {
                    return parsed;
                }
            }
        } catch (e) { console.warn("Global stats cache corrupt"); }
        return {
            consumers: 0, businesses: 0, checkins: 0, ghostCheckins: 0,
            purchases: 0, purchaseVolume: 0, totalWaste: 0, totalTrees: 0,
            totalFamilies: 0, gdpPenetration: "0.01%"
        };
    });

    const [quantifiedImpact, setQuantifiedImpact] = useState(() => {
        try {
            const saved = localStorage.getItem('bfg_personal_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.quantifiedImpact || { waste: 0, trees: 0, families: 0 };
            }
        } catch (e) { console.warn("Personal impact cache corrupt"); }
        return { waste: 0, trees: 0, families: 0 };
    });

    const [personalStats, setPersonalStats] = useState(() => {
        try {
            const saved = localStorage.getItem('bfg_personal_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.personalStats || { checkins: 0, purchases: 0 };
            }
        } catch (e) { console.warn("Personal stats cache corrupt"); }
        return { checkins: 0, purchases: 0 };
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const refreshDashboard = async () => {
        setIsSyncing(true);
        try {
            // 1. Fetch Global Stats
            const statsDoc = await db.collection('system').doc('stats').get();
            let currentStats = statsDoc.exists ? statsDoc.data() : { ...stats };
            
            // 2. If Admin, perform live count check
            if (currentUser && currentUser.isSuperAdmin) {
                const [userCountSnap, bizCountSnap, checkinCountSnap, purchaseCountSnap] = await Promise.all([
                    db.collection('users').count().get(),
                    db.collection('businesses').count().get(),
                    db.collection('transactions').where('type', '==', 'checkin').count().get(),
                    db.collection('transactions').where('type', '==', 'purchase').count().get()
                ]);

                currentStats = {
                    ...currentStats,
                    consumers: userCountSnap.data().count,
                    businesses: bizCountSnap.data().count,
                    checkins: checkinCountSnap.data().count,
                    purchases: purchaseCountSnap.data().count
                };
                
                // Update server's cached stats if admin refreshes
                await db.collection('system').doc('stats').set(currentStats, { merge: true });
            }

            setStats(currentStats);
            localStorage.setItem('bfg_global_stats', JSON.stringify(currentStats));

            // 3. Fetch Personal Stats (O(1) from pre-calculated summary)
            if (currentUser) {
                const summaryDoc = await db.collection('users')
                    .doc(currentUser.uid)
                    .collection('counters')
                    .doc('summary')
                    .get();

                if (summaryDoc.exists) {
                    const s = summaryDoc.data();
                    const pStats = { 
                        checkins: s.totalCheckins || 0, 
                        purchases: s.totalPurchases || 0 
                    };
                    const qImpact = {
                        waste: s.totalWaste % 1 !== 0 ? parseFloat(s.totalWaste.toFixed(2)) : (s.totalWaste || 0),
                        trees: Math.round(s.totalTrees || 0),
                        families: s.totalFamilies || 0
                    };

                    setPersonalStats(pStats);
                    setQuantifiedImpact(qImpact);
                    localStorage.setItem('bfg_personal_stats', JSON.stringify({
                        personalStats: pStats,
                        quantifiedImpact: qImpact,
                        lastUpdated: new Date().toISOString()
                    }));
                }
            }
        } catch (error) {
            console.error("Refresh failed:", error);
        } finally {
            setIsSyncing(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Trigger refresh if local storage is missing OR global stats are effectively zero
        if (!localStorage.getItem('bfg_global_stats') || stats.consumers === 0) {
            refreshDashboard();
        } else {
            setIsLoading(false);
        }
    }, [currentUser]);

    const gdpPenetration = stats.gdpPenetration || "0%";

    return (
        <div style={{ width: '100%', paddingBottom: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Dashboard</h1>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Conviction Network impact overview</p>
                </div>




                <button 
                    onClick={refreshDashboard}
                    disabled={isSyncing}
                    className="btn"
                    style={{ 
                        background: 'rgba(255,255,255,0.08)', 
                        color: 'white', 
                        fontSize: '0.7rem', 
                        padding: '2px', 
                        border: '1px solid rgba(255,255,255,0.15)',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        width: 'fit-content',
                        minWidth: '0',
                        gap: '4px',
                        height: 'auto',
                        borderRadius: '6px'
                    }}
                >
                    {isSyncing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrows-rotate" style={{ fontSize: '0.75rem' }}></i>}
                    <span style={{ fontWeight: '600' }}>Refresh Dashboard</span>
                </button>
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '500' }}>
                    <i className="fa-solid fa-bullseye" style={{ color: 'var(--accent-primary)' }}></i> Our Purpose
                </h3>
                <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.9)' }}>
                    Make for-good and conviction-driven businesses be seen, verified, and valued.
                </p>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="stat-card glass-card">
                    <i className="fa-solid fa-users stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Consumers</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{(stats.consumers || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <i className="fa-solid fa-store stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Businesses</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{(stats.businesses || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card feature-gradient">
                    <i className="fa-solid fa-location-dot stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Total Check-ins
                            <i className="fa-solid fa-circle-question" title="Ghost Check-ins are acknowledgments from anonymous, non-registered supporters. Member Check-ins are from registered identities." style={{ fontSize: '0.7rem', cursor: 'help' }}></i>
                        </h3>
                        <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {isLoading ? '...' : (stats.checkins || 0).toLocaleString()} 
                            <span style={{ color: 'var(--accent-ghost)', fontWeight: '400', fontSize: '1.2rem', marginLeft: '8px' }}>
                                | {isLoading ? '...' : (stats.ghostCheckins || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="stat-card glass-card success-gradient">
                    <i className="fa-solid fa-receipt stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-success)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Purchases</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{(stats.purchases || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, rgba(255, 160, 0, 0.1), rgba(0,0,0,0.3))', borderColor: 'rgba(255, 160, 0, 0.2)' }}>
                    <i className="fa-solid fa-chart-pie stat-icon" style={{ color: '#FFA000', fontSize: '1.5rem' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>National Transformation</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#FFA000' }}>{gdpPenetration}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem', fontStyle: 'italic' }}>
                            The goal is have 30% of Malaysia's GDP to be part of the humane empathy economy.
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card mt-4" style={{ background: 'linear-gradient(145deg, rgba(239, 108, 0, 0.1), rgba(0, 0, 0, 0.4))', borderColor: 'rgba(239, 108, 0, 0.2)', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}><i className="fa-solid fa-chart-line" style={{color: '#ef6c00'}}></i> Network Quantified Impact</h3>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.6rem', borderRadius: '1rem', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold', letterSpacing: '0.5px' }}>ALPHA / WIP</span>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Verified aggregate outcomes from the entire Conviction Network.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <i className="fa-solid fa-recycle" style={{ color: 'var(--accent-success)', fontSize: '1.4rem', marginBottom: '0.5rem' }}></i>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(stats.totalWaste || 0).toLocaleString()} <span style={{ fontSize: '0.8rem' }}>kg</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>Waste Diverted</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <i className="fa-solid fa-tree" style={{ color: '#2ecc71', fontSize: '1.4rem', marginBottom: '0.5rem' }}></i>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(stats.totalTrees || 0).toLocaleString()} <span style={{ fontSize: '0.8rem' }}>Trees</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>Planted</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                        <i className="fa-solid fa-users" style={{ color: 'var(--accent-primary)', fontSize: '1.4rem', marginBottom: '0.5rem' }}></i>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(stats.totalFamilies || 0).toLocaleString()} <span style={{ fontSize: '0.8rem' }}>Families</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.25rem' }}>Supported</div>
                    </div>
                </div>
            </div>

            {currentUser && (
                <>
                    <div className="page-header mt-4" style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Your Impact</h2>
                    </div>
                    
                    <div className="stats-grid personal">
                        <div className="stat-card glass-card highlight-border">
                            <i className="fa-solid fa-location-dot stat-icon" style={{ color: 'var(--accent-primary)' }}></i>
                            <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Your Check-ins</h3>
                                <p className="stat-value">{personalStats.checkins}</p>
                            </div>
                        </div>
                        <div className="stat-card glass-card highlight-border" style={{ borderTopColor: 'var(--accent-success)' }}>
                            <i className="fa-solid fa-receipt stat-icon" style={{ color: 'var(--accent-success)' }}></i>
                            <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Your Purchases</h3>
                                <p className="stat-value">{personalStats.purchases}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Home;
