import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useBusinesses from '../hooks/useBusinesses';
import { db, auth, functions } from '../services/firebase';
import { QRCodeCanvas } from 'qrcode.react';
import { drawStandee } from '../utils/assetUtils';
import { useAuth } from '../contexts/AuthContext';
import firebase from 'firebase/compat/app';

/**
 * Merchant Portal (Operational)
 * Focused on Business Onboarding, Database Management, and Standee Generation.
 * Accessible to Merchant Assistants and Superadmins.
 */
const MerchantPortal = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { businesses, loading } = useBusinesses();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [newBiz, setNewBiz] = useState({ 
        id: '', name: '', industry: 'F&B', location: '', founder: '', ownerEmail: '',
        founderImg: '', shopfrontImg: ''
    });
    const [editingBiz, setEditingBiz] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredBusinesses = React.useMemo(() => {
        if (!debouncedSearch) return businesses;
        const q = debouncedSearch.toLowerCase();
        return businesses.filter(b => 
            b.name?.toLowerCase().includes(q) || 
            b.founder?.toLowerCase().includes(q) ||
            b.id?.toLowerCase().includes(q)
        );
    }, [businesses, debouncedSearch]);

    const onboardMerchant = async (e) => {
        e.preventDefault();
        if (!newBiz.id || !newBiz.name) return alert("ID and Name are mandatory.");
        try {
            const batch = db.batch();
            const bizRef = db.collection('businesses').doc(newBiz.id);
            
            batch.set(bizRef, {
                ...newBiz,
                status: 'active',
                isVerified: false,
                membershipType: 'affiliate',
                checkinsCount: 0,
                purchasesCount: 0,
                purchaseVolume: 0,
                createdAt: new Date().toISOString()
            });

            const statsRef = db.collection('system').doc('stats');
            batch.update(statsRef, {
                businesses: firebase.firestore.FieldValue.increment(1)
            });

            await batch.commit();
            setNewBiz({ 
                id: '', name: '', industry: 'F&B', location: '', founder: '', ownerEmail: '',
                founderImg: '', shopfrontImg: ''
            });
            alert("Merchant successfully onboarded!");
        } catch (err) {
            alert("Onboarding failed: " + err.message);
        }
    };

    const BusinessRow = ({ biz }) => (
        <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
                <h4 style={{ margin: 0, color: '#fff' }}>{biz.name}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0' }}>ID: {biz.id} | Founder: {biz.founder || 'N/A'}</p>
                {biz.membershipType === 'affiliate' && <span style={{ fontSize: '0.65rem', background: 'rgba(255,184,77,0.1)', color: '#ffb84d', padding: '2px 6px', borderRadius: '4px' }}>Affiliate</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
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
                    title="Edit Governance"
                    className="filter-btn" 
                    style={{ padding: '0.5rem', background: 'rgba(255,184,77,0.1)', color: '#ffb84d' }}
                    onClick={() => navigate(`/business-portal?edit=${biz.id}`)}
                >
                    <i className="fa-solid fa-gear"></i>
                </button>
                <button 
                    title="View Profile"
                    className="filter-btn" 
                    style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                    onClick={() => navigate(`/business/${biz.id}`)}
                >
                    <i className="fa-solid fa-eye"></i>
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <button className="back-btn" onClick={() => navigate('/profile')} style={{ marginBottom: '1rem' }}>
                <i className="fa-solid fa-arrow-left"></i> Back to Profile
            </button>
            
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0 }}>Merchant Portal</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Network Operations & Business Management</p>
            </div>

            {/* Merchant Database */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: '#fff' }}><i className="fa-solid fa-database" style={{ color: 'var(--accent-primary)' }}></i> Merchant Database</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Search and manage business profiles within the network.</p>
                
                <div style={{ marginBottom: '1rem' }}>
                    <input 
                        type="text" 
                        className="input-modern" 
                        placeholder="Search by name, founder, or ID..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>
                    ) : filteredBusinesses.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No businesses found.</p>
                    ) : (
                        filteredBusinesses.map(biz => <BusinessRow key={biz.id} biz={biz} />)
                    )}
                </div>
            </div>

            {/* Onboarding Section */}
            <div className="glass-card">
                <h3 style={{ margin: '0 0 1.5rem', color: '#fff' }}><i className="fa-solid fa-plus-circle" style={{ color: 'var(--accent-success)' }}></i> Add New Business</h3>
                
                <form onSubmit={onboardMerchant} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Business Name</label>
                        <input type="text" className="input-modern" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} required placeholder="e.g. Earthly Goods" />
                    </div>
                    <div className="form-group">
                        <label>Founder Name</label>
                        <input type="text" className="input-modern" value={newBiz.founder} onChange={e => setNewBiz({...newBiz, founder: e.target.value})} placeholder="e.g. Jane Doe" />
                    </div>
                    <div className="form-group">
                        <label>Unique ID (Slug)</label>
                        <input type="text" className="input-modern" value={newBiz.id} onChange={e => setNewBiz({...newBiz, id: e.target.value})} required placeholder="e.g. earthly-goods" />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Owner Email (For Portal Access)</label>
                        <input type="email" className="input-modern" value={newBiz.ownerEmail} onChange={e => setNewBiz({...newBiz, ownerEmail: e.target.value})} placeholder="owner@business.com" />
                    </div>
                    <div className="form-group">
                        <label>Industry</label>
                        <select className="input-modern" value={newBiz.industry} onChange={e => setNewBiz({...newBiz, industry: e.target.value})}>
                            <option value="F&B">Food & Beverage</option>
                            <option value="Retail">Retail</option>
                            <option value="Services">Services</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Location (City/State)</label>
                        <input type="text" className="input-modern" value={newBiz.location} onChange={e => setNewBiz({...newBiz, location: e.target.value})} placeholder="e.g. Kuala Lumpur" />
                    </div>
                    <div className="form-group">
                        <label>Founder Photo (URL)</label>
                        <input type="url" className="input-modern" value={newBiz.founderImg} onChange={e => setNewBiz({...newBiz, founderImg: e.target.value})} placeholder="https://..." />
                    </div>
                    <div className="form-group">
                        <label>Shopfront Photo (URL)</label>
                        <input type="url" className="input-modern" value={newBiz.shopfrontImg} onChange={e => setNewBiz({...newBiz, shopfrontImg: e.target.value})} placeholder="https://..." />
                    </div>
                    <button 
                        type="submit" 
                        className="nav-btn" 
                        style={{ 
                            gridColumn: '1 / -1', 
                            marginTop: '2rem',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--accent-success)',
                            color: 'var(--accent-success)',
                            height: '60px',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            fontWeight: '700'
                        }}
                    >
                        <i className="fa-solid fa-plus-circle"></i> Finalize Onboarding
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MerchantPortal;
