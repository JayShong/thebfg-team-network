import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';
import { useAuth } from '../contexts/AuthContext';
import useBusinesses from '../hooks/useBusinesses';
import { QRCodeCanvas } from 'qrcode.react';
import { drawStandee } from '../utils/assetUtils';
import CustomerScannerModal from '../components/portal/CustomerScannerModal';
import CustomerIntelligenceModal from '../components/portal/CustomerIntelligenceModal';
import { useNavigate } from 'react-router-dom';

const BusinessPortal = () => {
    const { currentUser } = useAuth();
    const { businesses, loading: bizLoading } = useBusinesses();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const adminEditId = searchParams.get('edit');
    
    const [myBusinesses, setMyBusinesses] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        story: '',
        website: '',
        contact: '',
        shopfrontImg: '',
        founderImg: '',
        googleMapsUrl: '',
        videoUrl: '',
        purposeStatement: ''
    });

    const [showScanner, setShowScanner] = useState(false);
    const [scannedUserId, setScannedUserId] = useState(null);
    const [showIntelligence, setShowIntelligence] = useState(false);

    const isSupportMode = (currentUser?.isSuperAdmin || currentUser?.isAuditor || currentUser?.isMerchantAssistant) && adminEditId;

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
            contact: biz.contact || biz.ownerEmail || '',
            shopfrontImg: biz.shopfrontImg || '',
            founderImg: biz.founderImg || '',
            googleMapsUrl: biz.googleMapsUrl || '',
            videoUrl: biz.videoUrl || '',
            purposeStatement: biz.purposeStatement || ''
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
        <div style={{ paddingBottom: '3rem' }}>
            <button 
                className="nav-btn" 
                onClick={() => navigate('/profile')} 
                style={{ 
                    marginBottom: '1.5rem', 
                    borderRadius: 'var(--radius-full)', 
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.85rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
                <i className="fa-solid fa-arrow-left"></i> Back to Profile
            </button>

            {isSupportMode && (
                <div className="glass-card" style={{ background: 'rgba(255,184,77,0.1)', border: '1px solid rgba(255,184,77,0.2)', padding: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'rgba(255,184,77,0.2)', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-handshake-angle" style={{ color: '#ffb84d', fontSize: '1.4rem' }}></i>
                    </div>
                    <div>
                        <h4 style={{ margin: 0, color: '#ffb84d', fontSize: '1rem' }}>Administrative Support Mode</h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Assisting: <strong>{selectedBiz?.name}</strong> (Staff Workspace)</p>
                    </div>
                </div>
            )}

            <div className="page-header" style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: 'var(--primary)', width: '50px', height: '50px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`fa-solid ${selectedBiz?.industry === 'F&B' ? 'fa-utensils' : selectedBiz?.industry === 'Retail' ? 'fa-bag-shopping' : 'fa-briefcase'}`} style={{ color: 'white', fontSize: '1.5rem' }}></i>
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.4rem', fontWeight: '800', margin: 0 }}>
                            {selectedBiz ? selectedBiz.name : 'Business Dashboard'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem', marginTop: '4px' }}>
                            {isSupportMode ? 'Support Workspace (Staff)' : 'Business Management Portal'}
                        </p>
                    </div>
                </div>
            </div>
            
            {myBusinesses.length > 1 && !isSupportMode && (
                <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Switch Managed Property:</label>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {myBusinesses.map(b => (
                            <button 
                                key={b.id} 
                                onClick={() => handleSelectBiz(b)}
                                className={`filter-btn ${selectedBiz?.id === b.id ? 'active' : ''}`}
                                style={{ fontSize: '0.85rem' }}
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
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className="fa-solid fa-qrcode" style={{ color: 'var(--accent-primary)' }}></i>
                                    Material Generation
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Branded physical assets for the location.</p>
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

                    {/* Intelligence Center (Aggregate & Bonds) */}
                    <div className="glass-card" style={{ marginBottom: '2.5rem', border: '1px solid rgba(255,184,77,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className="fa-solid fa-brain" style={{ color: '#ffb84d' }}></i>
                                    Intelligence Center
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Securely access customer loyalty and recognition data.</p>
                            </div>
                            <button 
                                onClick={() => setShowScanner(true)}
                                className="nav-btn active" 
                                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', borderRadius: 'var(--radius-full)', height: '50px' }}
                            >
                                <i className="fa-solid fa-qrcode"></i> Scan Customer for Insights
                            </button>
                        </div>

                        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ padding: '1.2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '15px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800' }}>{selectedBiz.checkinsCount || 0}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Unique Visitors</div>
                            </div>
                            <div style={{ padding: '1.2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '15px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffb84d' }}>{selectedBiz.purchasesCount || 0}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Loyal Supporters</div>
                            </div>
                            <div style={{ padding: '1.2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '15px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-success)' }}>RM {(selectedBiz.purchaseVolume || 0).toLocaleString()}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Community Impact</div>
                            </div>
                        </div>

                        <GratitudeBondsLog bizId={selectedBiz.id} onSelectUser={(uid) => {
                            setScannedUserId(uid);
                            setShowIntelligence(true);
                        }} />
                    </div>

                    {/* Verification Queue */}
                    <div className="glass-card" style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}><i className="fa-solid fa-user-check" style={{ color: '#ffb84d' }}></i> Purchase Verification Queue</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review and verify customer purchase logs to validate network impact.</p>
                            </div>
                        </div>

                        <PendingVerifications bizId={selectedBiz.id} />
                    </div>

                    <div className="glass-card">
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fa-solid fa-feather-pointed" style={{ color: 'var(--primary)' }}></i>
                            Public Narrative
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '1.5rem' }}>Manage how the conviction story is presented to the network.</p>
                        
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

                            <div className="form-group">
                                <label>Public Purpose Statement</label>
                                <input type="text" className="input-modern" value={formData.purposeStatement} onChange={(e) => setFormData({...formData, purposeStatement: e.target.value})} placeholder="Describe your business' core mission..." />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Founder Photo (URL)</label>
                                    <input type="url" className="input-modern" value={formData.founderImg} onChange={(e) => setFormData({...formData, founderImg: e.target.value})} placeholder="https://..." />
                                </div>
                                <div className="form-group">
                                    <label>Shopfront Banner (URL)</label>
                                    <input type="url" className="input-modern" value={formData.shopfrontImg} onChange={(e) => setFormData({...formData, shopfrontImg: e.target.value})} placeholder="https://..." />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Google Maps Pin (URL)</label>
                                    <input type="url" className="input-modern" value={formData.googleMapsUrl} onChange={(e) => setFormData({...formData, googleMapsUrl: e.target.value})} placeholder="https://goo.gl/maps/..." />
                                </div>
                                <div className="form-group">
                                    <label>Narrative Video (YouTube/Vimeo URL)</label>
                                    <input type="url" className="input-modern" value={formData.videoUrl} onChange={(e) => setFormData({...formData, videoUrl: e.target.value})} placeholder="https://youtube.com/..." />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving} 
                                className="nav-btn" 
                                style={{ 
                                    marginTop: '2rem', 
                                    background: 'rgba(0,0,0,0.2)', 
                                    width: '100%', 
                                    justifyContent: 'center',
                                    height: '65px',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid var(--accent-primary)',
                                    color: 'var(--accent-primary)',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                                    e.currentTarget.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                {isSaving ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin"></i> Synchronizing...</>
                                ) : (
                                    <><i className="fa-solid fa-floppy-disk"></i> Finalize Profile Changes</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showScanner && (
                <CustomerScannerModal 
                    bizId={selectedBiz.id} 
                    onClose={() => setShowScanner(false)} 
                    onBondCreated={(uid) => {
                        setShowScanner(false);
                        setScannedUserId(uid);
                        setShowIntelligence(true);
                    }}
                />
            )}

            {showIntelligence && (
                <CustomerIntelligenceModal 
                    userId={scannedUserId} 
                    bizId={selectedBiz.id} 
                    onClose={() => {
                        setShowIntelligence(false);
                        setScannedUserId(null);
                    }}
                />
            )}
        </div>
    );
};

const PendingVerifications = ({ bizId }) => {
    const [pending, setPending] = useState([]);
    const [processing, setProcessing] = useState(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!bizId) return;
        const unsubscribe = db.collection('transactions')
            .where('bizId', '==', bizId)
            .where('status', '==', 'pending')
            .where('type', '==', 'purchase')
            .onSnapshot(snap => {
                setPending(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        return () => unsubscribe();
    }, [bizId]);

    const handleVerify = async (trans, isApproved) => {
        setProcessing(trans.id);
        try {
            const batch = db.batch();
            const transRef = db.collection('transactions').doc(trans.id);
            const bizRef = db.collection('businesses').doc(bizId);
            const userRef = db.collection('users').doc(trans.userId);
            const statsRef = db.collection('system').doc('stats');

            if (isApproved) {
                const amount = parseFloat(trans.amount) || 0;
                
                // Status update only. The system calculates impact from verified/pending transactions dynamically.
                batch.update(transRef, { status: 'verified', verifiedAt: new Date().toISOString(), verifiedBy: currentUser.email });

                // Log to Audit Trail
                const logRef = db.collection('audit_logs').doc();
                batch.set(logRef, {
                    bizId,
                    action: 'PURCHASE_VERIFIED',
                    details: `Purchase of RM ${amount} by ${trans.userNickname} verified by Founder.`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    user: currentUser.email,
                    userNickname: currentUser.nickname || currentUser.name || currentUser.email.split('@')[0] || 'Explorer'
                });
            } else {
                batch.update(transRef, { status: 'rejected', rejectedAt: new Date().toISOString(), rejectedBy: currentUser.email });
            }

            await batch.commit();
        } catch (e) {
            console.error("Verification failed:", e);
            alert("Verification failed. See console.");
        } finally {
            setProcessing(null);
        }
    };

    if (pending.length === 0) return <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>No pending purchases to verify.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pending.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>RM {parseFloat(t.amount).toLocaleString()}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Logged by {t.userNickname} on {new Date(t.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button 
                            disabled={processing === t.id}
                            onClick={() => handleVerify(t, false)}
                            className="nav-btn" 
                            style={{ 
                                padding: '0.6rem 1.2rem', 
                                fontSize: '0.85rem', 
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(255, 77, 77, 0.05)',
                                border: '1px solid #ff4d4d',
                                color: '#ff4d4d',
                                fontWeight: '700'
                            }}
                        >
                            <i className="fa-solid fa-xmark"></i> Reject
                        </button>
                        <button 
                            disabled={processing === t.id}
                            onClick={() => handleVerify(t, true)}
                            className="nav-btn" 
                            style={{ 
                                padding: '0.6rem 1.5rem', 
                                fontSize: '0.85rem', 
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(76, 175, 80, 0.05)',
                                border: '1px solid #4caf50',
                                color: '#4caf50',
                                fontWeight: '700'
                            }}
                        >
                            {processing === t.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-check"></i> Approve</>}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const GratitudeBondsLog = ({ bizId, onSelectUser }) => {
    const [bonds, setBonds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bizId) return;
        // Fetch recent scans (bonds) that are not expired
        const now = new Date();
        const unsubscribe = db.collection('gratitude_bond_records')
            .where('bizId', '==', bizId)
            .where('type', '==', 'handshake_scan')
            .orderBy('expiresAt', 'desc')
            .limit(10)
            .onSnapshot(snap => {
                const loaded = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.expiresAt.toDate() > now) {
                        loaded.push({ id: doc.id, ...data });
                    }
                });
                setBonds(loaded);
                setLoading(false);
            });
        return () => unsubscribe();
    }, [bizId]);

    if (loading) return null;

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '1rem' }}>
                <i className="fa-solid fa-clock-rotate-left"></i> Recent Gratitude Bonds (Active for 48h)
            </label>
            {bonds.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No active bonds. Scan a customer to begin.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {bonds.map(bond => (
                        <div 
                            key={bond.id} 
                            onClick={() => onSelectUser(bond.userId)}
                            className="glass-card" 
                            style={{ 
                                flex: '0 0 160px', 
                                padding: '1rem', 
                                textAlign: 'center', 
                                cursor: 'pointer',
                                background: 'rgba(255,184,77,0.05)',
                                border: '1px solid rgba(255,184,77,0.2)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,184,77,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,184,77,0.05)'}
                        >
                            <div style={{ background: 'rgba(255,255,255,0.1)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.8rem' }}>
                                <i className="fa-solid fa-user" style={{ color: '#ffb84d' }}></i>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                Customer Bond
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {new Date(bond.createdAt?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BusinessPortal;
