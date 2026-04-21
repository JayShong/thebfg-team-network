import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useBusinesses from '../hooks/useBusinesses';
import { db } from '../services/firebase';
import { QRCodeCanvas } from 'qrcode.react';
import { drawStandee } from '../utils/assetUtils';

const Admin = () => {
    const navigate = useNavigate();
    const { businesses, loading } = useBusinesses();
    const [networkStats, setNetworkStats] = useState({ checkins: 0, purchases: 0 });
    const [showOnboard, setShowOnboard] = useState(false);
    const [newBiz, setNewBiz] = useState({ id: '', name: '', industry: 'F&B', location: '', founder: '', ownerEmail: '' });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const doc = await db.collection('system').doc('stats').get();
                if (doc.exists) setNetworkStats(doc.data());
            } catch (e) {
                console.warn("Failed retrieving impact stats");
            }
        };
        fetchStats();
    }, []);

    const onboardMerchant = async (e) => {
        e.preventDefault();
        if (!newBiz.id || !newBiz.name) return alert("ID and Name are mandatory.");
        try {
            await db.collection('businesses').doc(newBiz.id).set({
                ...newBiz,
                status: 'active',
                isVerified: false,
                checkins: 0,
                purchases: 0,
                createdAt: new Date().toISOString()
            });
            setShowOnboard(false);
            setNewBiz({ id: '', name: '', industry: 'F&B', location: '', founder: '', ownerEmail: '' });
            alert("Merchant successfully onboarded!");
        } catch (err) {
            alert("Onboarding failed: " + err.message);
        }
    };

    const BusinessRow = ({ biz }) => {
        return (
            <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <h4 style={{ margin: 0, color: '#fff' }}>{biz.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0' }}>ID: {biz.id} | Founder: {biz.founder || 'N/A'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    {/* Hidden QR for Standee Engine */}
                    <div style={{ display: 'none' }}>
                        <QRCodeCanvas id={`qr-${biz.id}`} value={biz.id} size={550} level="H" />
                    </div>

                    <button 
                        title="Download Standee"
                        className="filter-btn" 
                        style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)' }}
                        onClick={() => {
                            const main = document.createElement('canvas');
                            main.width = 1118; main.height = 1588;
                            const qr = document.getElementById(`qr-${biz.id}`);
                            const dataUrl = drawStandee(main, qr, biz.name);
                            const link = document.createElement('a');
                            link.download = `BFG_Standee_${biz.id}.png`;
                            link.href = dataUrl;
                            link.click();
                        }}
                    >
                        <i className="fa-solid fa-download"></i>
                    </button>

                    <button 
                        title="Edit Details"
                        className="filter-btn" 
                        style={{ padding: '0.5rem', background: 'rgba(255,184,77,0.1)', color: '#ffb84d' }}
                        onClick={() => navigate(`/business-portal?edit=${biz.id}`)}
                    >
                        <i className="fa-solid fa-pen-to-square"></i>
                    </button>

                    <button 
                        title="Audited Stats"
                        className="filter-btn" 
                        style={{ padding: '0.5rem', background: 'rgba(76,175,80,0.1)', color: '#4caf50' }}
                        onClick={() => navigate('/audit-hub')}
                    >
                        <i className="fa-solid fa-clipboard-check"></i>
                    </button>
                </div>
            </div>
        );
    };

    const wipeMockData = async () => {
        const pass = window.prompt("Type 'PURGE' to confirm deletion of all mock data and system stats reset:");
        if (pass !== 'PURGE') return;

        try {
            // 1. Reset System Stats
            await db.collection('system').doc('stats').set({
                checkins: 0,
                purchases: 0,
                purchaseVolume: 0
            });

            // 2. Clear Audit Logs
            const logsSnap = await db.collection('audit_logs').get();
            const logBatch = db.batch();
            logsSnap.forEach(doc => logBatch.delete(doc.ref));
            await logBatch.commit();

            // 3. Delete Mock Businesses (ID starts with biz_)
            const bizSnap = await db.collection('businesses').get();
            const bizBatch = db.batch();
            let count = 0;
            bizSnap.forEach(doc => {
                if (doc.id.startsWith('biz_')) {
                    bizBatch.delete(doc.ref);
                    count++;
                }
            });
            await bizBatch.commit();

            alert(`System Purged! Reset stats, cleared logs, and removed ${count} mock businesses.`);
            window.location.reload();
        } catch (err) {
            alert("Purge failed: " + err.message);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-shield-halved fa-2x" style={{color: 'var(--primary)'}}></i>
                    <h2 style={{ margin: 0 }}>Master Control</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button onClick={() => setShowOnboard(!showOnboard)} className="nav-btn active" style={{ fontSize: '0.85rem' }}>
                        <i className="fa-solid fa-plus-circle"></i> Onboard Merchant
                    </button>
                </div>
            </div>

            {showOnboard && (
                <div className="glass-card slide-up mt-4" style={{ border: '1px solid var(--primary-glow)' }}>
                    <h3>Register New Business</h3>
                    <form onSubmit={onboardMerchant} style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Business Name</label>
                            <input type="text" className="input-modern" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Unique ID (Slug)</label>
                            <input type="text" className="input-modern" placeholder="e.g. greenroots-cafe" value={newBiz.id} onChange={e => setNewBiz({...newBiz, id: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Industry</label>
                            <input type="text" className="input-modern" value={newBiz.industry} onChange={e => setNewBiz({...newBiz, industry: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <input type="text" className="input-modern" value={newBiz.location} onChange={e => setNewBiz({...newBiz, location: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Founder Name</label>
                            <input type="text" className="input-modern" value={newBiz.founder} onChange={e => setNewBiz({...newBiz, founder: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Owner Email</label>
                            <input type="email" className="input-modern" value={newBiz.ownerEmail} onChange={e => setNewBiz({...newBiz, ownerEmail: e.target.value})} />
                        </div>
                        <div className="form-actions" style={{ gridColumn: 'span 2', marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="nav-btn active" style={{ flex: 1, justifyContent: 'center' }}>Finalize Onboarding</button>
                            <button type="button" onClick={() => setShowOnboard(false)} className="nav-btn" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="stats-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="stat-card glass-card" style={{ textAlign: 'center' }}>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>{networkStats.checkins || 0}</div>
                    <div className="stat-label">Network Check-ins Received</div>
                </div>
                <div className="stat-card glass-card" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="stat-value" style={{ color: '#ffb84d' }}>{networkStats.purchases || 0}</div>
                        <div style={{ fontSize: '1rem', color: '#ffb84d', fontWeight: 'bold' }}>RM {(networkStats.purchaseVolume || 0).toLocaleString()}</div>
                    </div>
                    <div className="stat-label">Purchases from the Network</div>
                </div>
            </div>

            <div className="glass-card slide-up" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>Merchant Roster</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{businesses.length} Active Businesses</span>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {businesses.map(biz => <BusinessRow key={biz.id} biz={biz} />)}
                    </div>
                )}
            </div>

            {/* Maintenance & Safety Section */}
            {currentUser?.isSuperAdmin && (
                <div className="glass-card slide-up mt-4" style={{ background: 'rgba(244,67,54,0.02)', border: '1px solid rgba(244,67,54,0.1)' }}>
                    <h3 style={{ color: '#f44336' }}>Maintenance & Safety</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Dangerous operations to reset the platform state. Use with extreme caution.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            onClick={wipeMockData} 
                            className="nav-btn" 
                            style={{ background: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', width: '100%', justifyContent: 'center' }}
                        >
                            <i className="fa-solid fa-trash-can"></i> Wipe Mock Data & Reset Stats
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
