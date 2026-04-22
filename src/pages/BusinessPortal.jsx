import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import useBusinesses from '../hooks/useBusinesses';
import { QRCodeCanvas } from 'qrcode.react';
import { drawStandee } from '../utils/assetUtils';

const BusinessPortal = () => {
    const { currentUser } = useAuth();
    const { businesses, loading: bizLoading } = useBusinesses();
    const [searchParams] = useSearchParams();
    const adminEditId = searchParams.get('edit');
    
    const [myBusinesses, setMyBusinesses] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        story: '',
        website: '',
        contact: '',
        shopfrontImg: '',
        founderImg: ''
    });

    const isSupportMode = (currentUser?.isSuperAdmin || currentUser?.isAuditor) && adminEditId;

    useEffect(() => {
        if (businesses.length > 0) {
            if (isSupportMode) {
                const target = businesses.find(b => b.id === adminEditId);
                if (target) {
                    setMyBusinesses([target]);
                    handleSelectBiz(target);
                }
            } else if (currentUser) {
                const owned = businesses.filter(b => b.ownerEmail === currentUser.email);
                setMyBusinesses(owned);
                if (owned.length === 1) {
                    handleSelectBiz(owned[0]);
                }
            }
        }
    }, [businesses, currentUser, adminEditId]);

    const handleSelectBiz = (biz) => {
        setSelectedBiz(biz);
        setFormData({
            story: biz.story || '',
            website: biz.website || '',
            contact: biz.contact || '',
            shopfrontImg: biz.shopfrontImg || '',
            founderImg: biz.founderImg || ''
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await db.collection('businesses').doc(selectedBiz.id).update(formData);
            alert("Business profile updated successfully!");
        } catch (err) {
            alert("Failed to update profile: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (bizLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Synchronizing with Network...</div>;

    if (myBusinesses.length === 0 && !isSupportMode) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <i className="fa-solid fa-store-slash fa-3x" style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}></i>
                <h3>No Associated Businesses Found</h3>
                <p style={{ color: 'var(--text-secondary)' }}>If you are a founder, please contact the network administrator to link your email ({currentUser?.email}).</p>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {isSupportMode && (
                <div style={{ background: 'rgba(255,184,77,0.1)', border: '1px solid #ffb84d33', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fa-solid fa-handshake-angle" style={{ color: '#ffb84d', fontSize: '1.2rem' }}></i>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: '#ffb84d' }}>Administrative Support Mode</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>You are assisting with the profile of <strong>{selectedBiz?.name}</strong>.</p>
                    </div>
                </div>
            )}

            <div className="page-header" style={{ display: 'flex', alignItems: 'center', marginTop: '1rem', gap: '10px' }}>
                <i className="fa-solid fa-briefcase fa-2x" style={{color: 'var(--primary)'}}></i>
                <h2>{isSupportMode ? 'Support Workspace' : 'Merchant Portal'}</h2>
            </div>
            
            {myBusinesses.length > 1 && (
                <div style={{ marginBottom: '2rem', marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Managed Property:</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {myBusinesses.map(b => (
                            <button 
                                key={b.id} 
                                onClick={() => handleSelectBiz(b)}
                                className={`filter-btn ${selectedBiz?.id === b.id ? 'active' : ''}`}
                            >
                                {b.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedBiz && (
                <div className="slide-up" style={{ marginTop: '1.5rem' }}>
                    <div className="glass-card" style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Material Generation</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Generated branded physical assets for the location.</p>
                            </div>
                            
                            <div style={{ display: 'none' }}>
                                <QRCodeCanvas id="hidden-qr" value={selectedBiz.id} size={550} level="H" />
                            </div>

                            <button onClick={() => {
                                const main = document.createElement('canvas');
                                main.width = 1118; main.height = 1588;
                                const qr = document.getElementById('hidden-qr');
                                const dataUrl = drawStandee(main, qr, selectedBiz.name);
                                const link = document.createElement('a');
                                link.download = `BFG_Standee_${selectedBiz.id}.png`;
                                link.href = dataUrl;
                                link.click();
                            }} className="nav-btn active" style={{ fontSize: '0.85rem' }}>
                                <i className="fa-solid fa-download"></i> Download A5 Standee
                            </button>
                        </div>

                        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                            <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="stat-value">{selectedBiz.checkinsCount || 0}</div>
                                <div className="stat-label">Total Check-ins Received</div>
                            </div>
                            <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div className="stat-value">{selectedBiz.purchasesCount || 0}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#ffb84d', fontWeight: '600', marginTop: '0.2rem' }}>RM {(selectedBiz.purchaseVolume || 0).toLocaleString()}</div>
                                </div>
                                <div className="stat-label">Purchases from the Network</div>
                            </div>
                            <div className="stat-card" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
                                <div className="stat-value" style={{ color: '#4caf50' }}>{selectedBiz.isVerified ? 'VERIFIED' : 'PENDING'}</div>
                                <div className="stat-label">Status</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card">
                        <h3>Public Narrative</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Manage how the conviction story is presented to the network.</p>
                        
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label>Founder's Story</label>
                                <textarea className="input-modern" rows="5" value={formData.story} onChange={(e) => setFormData({...formData, story: e.target.value})} placeholder="Tell the community about your conviction..." />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Website URL</label>
                                    <input type="url" className="input-modern" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>Contact Email</label>
                                    <input type="email" className="input-modern" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} />
                                </div>
                            </div>

                            <button type="submit" disabled={isSaving} className="nav-btn active" style={{ marginTop: '1rem', background: 'var(--primary)', justifyContent: 'center' }}>
                                {isSaving ? 'Updating...' : 'Save Profile Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessPortal;
