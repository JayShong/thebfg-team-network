import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PLATFORM_CONFIG } from '../config/platformConfig';

const Home = () => {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState({
        consumers: 0,
        businesses: 0,
        checkins: 0,
        purchases: 0,
        purchaseVolume: 0,
        totalWaste: 0,
        totalTrees: 0,
        totalFamilies: 0,
        gdpPenetration: "0.01%"
    });

    const [quantifiedImpact, setQuantifiedImpact] = useState({ waste: 0, trees: 0, families: 0 });
    const [personalStats, setPersonalStats] = useState({ checkins: 0, purchases: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Global Stats (Baseline from stats doc)
                const statsDoc = await db.collection('system').doc('stats').get();
                if (statsDoc.exists) setStats(prev => ({...prev, ...statsDoc.data()}));

                if (!currentUser) return;

                // 2. Fetch Businesses & ALL Transactions for this user
                const [bizSnap, transSnap] = await Promise.all([
                    db.collection('businesses').get(),
                    db.collection('transactions')
                        .where('userId', '==', currentUser.uid)
                        .get()
                ]);

                const businesses = bizSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Calculate Real-time Personal Totals (Ensures no double counting)
                let userCheckins = 0;
                let userPurchases = 0;
                const bizPurchases = {}; // For quantified impact (Verified Only)
                
                transSnap.forEach(doc => {
                    const t = doc.data();
                    if (t.type === 'checkin') userCheckins++;
                    if (t.type === 'purchase') {
                        userPurchases++;
                        // For institutional impact calculation, we only count verified contributions
                        if (t.status === 'verified' || t.status === 'approved') {
                            bizPurchases[t.bizId] = (bizPurchases[t.bizId] || 0) + (parseFloat(t.amount) || 0);
                        }
                    }
                });

                // Update local stats for the "Your Impact" section
                setPersonalStats({ checkins: userCheckins, purchases: userPurchases });

                let waste = 0;
                let trees = 0;
                let families = 0;

                Object.keys(bizPurchases).forEach(bizId => {
                    const biz = businesses.find(b => b.id === bizId);
                    if (biz && biz.status !== 'expired') {
                        families += (parseInt(biz.impactJobs) || 0);
                        let latestRev = 0; let latestWaste = 0; let latestTrees = 0;

                        if (biz.yearlyAssessments) {
                            const assessments = Array.isArray(biz.yearlyAssessments) 
                                ? biz.yearlyAssessments : Object.values(biz.yearlyAssessments);

                            assessments.forEach(ya => {
                                const rev = parseFloat(ya.revenue?.toString().replace(/,/g, '')) || 0;
                                if (rev > latestRev) {
                                    latestRev = rev;
                                    latestWaste = parseFloat(ya.wasteKg?.toString().replace(/,/g, '')) || 0;
                                    latestTrees = parseFloat(ya.treesPlanted?.toString().replace(/,/g, '')) || 0;
                                }
                            });
                        }

                        if (latestRev > 0) {
                            const proportion = bizPurchases[bizId] / latestRev;
                            waste += (proportion * latestWaste);
                            trees += (proportion * latestTrees);
                        }
                    }
                });

                setQuantifiedImpact({
                    waste: waste % 1 !== 0 ? parseFloat(waste.toFixed(2)) : waste,
                    trees: Math.round(trees),
                    families: families
                });

            } catch (e) {
                console.warn("Impact sync failed:", e);
            }
        };
        fetchData();
    }, [currentUser]);

    const gdpPenetration = stats.gdpPenetration || "0%";

    return (
        <div style={{ width: '100%', paddingBottom: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Dashboard</h1>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Conviction Network impact overview</p>
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
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.consumers.toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <i className="fa-solid fa-store stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Businesses</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.businesses.toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card feature-gradient">
                    <i className="fa-solid fa-location-dot stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Check-ins</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.checkins.toLocaleString()}</p>
                    </div>
                </div>
                <div className="stat-card glass-card success-gradient">
                    <i className="fa-solid fa-receipt stat-icon" style={{ fontSize: '1.5rem', color: 'var(--accent-success)' }}></i>
                    <div className="stat-info" style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Purchases</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stats.purchases.toLocaleString()}</p>
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
        </div>
    );
};

export default Home;
