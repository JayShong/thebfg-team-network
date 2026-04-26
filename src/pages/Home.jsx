import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PLATFORM_CONFIG } from '../config/platformConfig';
import { getSeasonId } from '../utils/badgeLogic';

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
            totalFamilies: 0, gdpPenetration: "0.01%", initiativeParticipation: 0,
            sentinelBlocks: 0
        };
    });

    const [quantifiedImpact, setQuantifiedImpact] = useState(() => {
        try {
            const saved = localStorage.getItem('bfg_personal_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    waste: parsed.totalWaste || 0,
                    trees: parsed.totalTrees || 0,
                    families: parsed.totalFamilies || 0
                };
            }
        } catch (e) { console.warn("Personal impact cache corrupt"); }
        return { waste: 0, trees: 0, families: 0 };
    });

    const [personalStats, setPersonalStats] = useState(() => {
        try {
            const saved = localStorage.getItem('bfg_personal_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    checkins: parsed.totalCheckins || 0,
                    purchases: parsed.totalPurchases || 0,
                    attendanceDays: parsed.attendanceDays || 0
                };
            }
        } catch (e) { console.warn("Personal stats cache corrupt"); }
        return { checkins: 0, purchases: 0, attendanceDays: 0 };
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [festiveLabel, setFestiveLabel] = useState('');


    const refreshDashboard = async () => {
        setIsSyncing(true);
        try {
            // 1. Fetch Reconciled Global Stats
            const statsDoc = await db.collection('system').doc('stats').get();
            const serverGlobalStats = statsDoc.exists ? statsDoc.data() : {};

            // 2. Combine with local defaults
            const currentStats = { ...stats, ...serverGlobalStats };
            
            // 3. Update UI and Cache
            setStats(currentStats);
            localStorage.setItem('bfg_global_stats', JSON.stringify(currentStats));

            // 3. Fetch Personal Stats (Seasonal)
            if (currentUser) {
                const seasonId = getSeasonId();
                const seasonalDoc = await db.collection('users')
                    .doc(currentUser.uid)
                    .collection('seasons')
                    .doc(seasonId)
                    .get();

                if (seasonalDoc.exists) {
                    const s = seasonalDoc.data();
                    console.log(`REFRESH: Seasonal summary (${seasonId}) found:`, s);

                    const pStats = {
                        totalCheckins: s.totalCheckins || 0,
                        totalPurchases: s.totalPurchases || 0,
                        totalWaste: s.totalWaste || 0,
                        totalTrees: s.totalTrees || 0,
                        totalFamilies: s.totalFamilies || 0,
                        totalAttendance: s.totalAttendance || 0,
                        lastSynced: new Date().toISOString()
                    };

                    setPersonalStats({
                        checkins: pStats.totalCheckins,
                        purchases: pStats.totalPurchases,
                        attendanceDays: pStats.totalAttendance
                    });
                    setQuantifiedImpact({
                        waste: Number((pStats.totalWaste || 0).toFixed(2)),
                        trees: Math.round(pStats.totalTrees || 0),
                        families: pStats.totalFamilies || 0
                    });

                    localStorage.setItem('bfg_personal_stats', JSON.stringify(pStats));
                } else {
                    console.warn(`REFRESH: Seasonal doc (${seasonId}) missing for UID:`, currentUser.uid);
                    // Fallback to zeros for a new season
                    setPersonalStats({ checkins: 0, purchases: 0, attendanceDays: 0 });
                    setQuantifiedImpact({ waste: 0, trees: 0, families: 0 });
                }
            }
        } catch (error) {
            console.error("REFRESH: Dashboard refresh failed:", error);
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

        // Task 9: Fetch Seasonal Context from Public Holiday API
        const fetchHolidays = async () => {
            try {
                const year = new Date().getFullYear();
                const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/MY`);
                if (res.ok) {
                    const text = await res.text();
                    if (text) {
                        const holidays = JSON.parse(text);
                        const now = new Date();
                        const activeHoliday = holidays.find(h => {
                            const hDate = new Date(h.date);
                            const diffDays = Math.abs(now - hDate) / (1000 * 60 * 60 * 24);
                            return diffDays <= 7;
                        });
                        if (activeHoliday) {
                            setFestiveLabel(activeHoliday.localName || activeHoliday.name);
                        }
                    }
                }
            } catch (e) {
                console.warn("Festive API fetch failed", e);
            }
        };
        fetchHolidays();
    }, [currentUser]);

    const gdpPenetration = stats.gdpPenetration || "0%";

    return (
        <div style={{ width: '100%', paddingBottom: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    {festiveLabel && (
                        <div style={{ 
                            fontSize: '0.7rem', 
                            background: 'rgba(255,255,255,0.05)', 
                            color: 'var(--accent-primary)', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '2rem', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '5px', 
                            marginBottom: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            fontWeight: '700'
                        }}>
                            <i className="fa-solid fa-calendar-day"></i> {festiveLabel}
                        </div>
                    )}
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>The Network</h1>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Every number here is someone who chose conviction over convenience.</p>
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
                <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
                    There are founders who chose to do right. This network makes sure they don't finish last.
                </p>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', position: 'relative' }}>
                {stats.consumers === 0 && stats.businesses === 0 && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(10, 10, 10, 0.7)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <i className="fa-solid fa-satellite-dish fa-spin" style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'white', letterSpacing: '0.5px' }}>Retrieving Network Stats...</span>
                    </div>
                )}
                <div className="stat-card glass-card">
                    <i className="fa-solid fa-users stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Ambassadors</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{(stats.consumers || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <i className="fa-solid fa-store stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Founders</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{(stats.businesses || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card feature-gradient">
                    <i className="fa-solid fa-location-dot stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Supports
                            <i className="fa-solid fa-circle-question" title="Every support says: I see you, and I choose you. Ghost supports are from anonymous, non-registered visitors." style={{ fontSize: '0.7rem', cursor: 'help' }}></i>
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
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Economic Proof</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{(stats.purchases || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(0,0,0,0.3))', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                    <i className="fa-solid fa-users-viewfinder stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Movement Actions</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{(stats.initiativeParticipation || 0).toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ background: 'linear-gradient(135deg, rgba(255, 160, 0, 0.1), rgba(0,0,0,0.3))', borderColor: 'rgba(255, 160, 0, 0.2)' }}>
                    <i className="fa-solid fa-chart-pie stat-icon" style={{ color: '#FFA000', fontSize: '1.5rem' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>The 30% Goal</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#FFA000' }}>{gdpPenetration}</p>
                        
                        {(() => {
                            const val = parseFloat(gdpPenetration.replace('%', '')) || 0;
                            const progress = Math.min((val / 30) * 100, 100);
                            let narrative = "The foundation is being laid.";
                            if (val >= 30) narrative = "We built it.";
                            else if (val >= 15) narrative = "The final push. Every choice counts.";
                            else if (val >= 5) narrative = "The tipping point is within reach.";
                            else if (val >= 1) narrative = "We are becoming undeniable.";
                            else if (val >= 0.5) narrative = "The conviction economy is emerging.";
                            else if (val >= 0.1) narrative = "The movement is taking root.";

                            return (
                                <>
                                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,160,0,0.1)', borderRadius: '2px', margin: '10px 0', overflow: 'hidden' }}>
                                        <div style={{ width: `${progress}%`, height: '100%', background: '#FFA000', transition: 'width 1s ease-out' }}></div>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#FFA000', fontWeight: '600', marginBottom: '0.5rem' }}>
                                        {narrative}
                                    </p>
                                </>
                            );
                        })()}

                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            The share of Malaysia's economy we're reclaiming for businesses that care.
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card mt-4" style={{ background: 'linear-gradient(145deg, rgba(239, 108, 0, 0.1), rgba(0, 0, 0, 0.4))', borderColor: 'rgba(239, 108, 0, 0.2)', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}><i className="fa-solid fa-chart-line" style={{ color: '#ef6c00' }}></i> Network Quantified Impact</h3>
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
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Your Contribution</h2>
                    </div>

                    <div className="stats-grid personal">
                        <div className="stat-card glass-card highlight-border">
                            <i className="fa-solid fa-location-dot stat-icon" style={{ color: 'var(--accent-primary)' }}></i>
                            <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Your Supports</h3>
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
                        <div className="stat-card glass-card highlight-border" style={{ borderTopColor: 'var(--accent-primary)' }}>
                            <i className="fa-solid fa-flag stat-icon" style={{ color: 'var(--accent-primary)' }}></i>
                            <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Attendance Days</h3>
                                <p className="stat-value">{personalStats.attendanceDays || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card mt-4" style={{ 
                        background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.05) 0%, rgba(255, 68, 68, 0.02) 100%)', 
                        borderColor: 'rgba(255, 68, 68, 0.2)', 
                        marginTop: '2rem',
                        padding: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#ff4444' }}>
                                    <i className="fa-solid fa-shield-halved"></i> 
                                    Sentinel Interventions
                                    <i className="fa-solid fa-circle-question" title="This tracks the total number of spam, bot, and spoofing attempts prevented by the Sentinel security engine to ensure network integrity." style={{ fontSize: '0.8rem', cursor: 'help', color: 'var(--text-secondary)', opacity: 0.6 }}></i>
                                </h3>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Safeguarding the network against malicious actors
                                </p>
                            </div>
                            <p className="stat-value" style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#ff4444' }}>
                                {(stats.sentinelBlocks || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Home;
