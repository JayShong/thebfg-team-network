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
    const auth = useAuth();
    const { currentUser } = auth;
    const { getStewardshipLevel } = auth;
    const { businesses, loading: bizLoading } = useBusinesses();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const adminEditId = searchParams.get('edit') || searchParams.get('bizId');
    
    const [myBusinesses, setMyBusinesses] = useState([]);
    const [switcherInput, setSwitcherInput] = useState('');
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
    const [isSyncingLedger, setIsSyncingLedger] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    const isSupportMode = (currentUser?.isSuperAdmin || currentUser?.isAuditor || currentUser?.isCustomerSuccess) && adminEditId;

    useEffect(() => {
        if (isSupportMode && businesses.length > 0) {
            const target = businesses.find(b => b.id === adminEditId);
            if (target) {
                setMyBusinesses([target]);
                handleSelectBiz(target);
            }
        }
    }, [businesses, isSupportMode, adminEditId]);

    useEffect(() => {
        if (!currentUser?.email || isSupportMode) return;

        const fetchMyBiz = async () => {
            try {
                const email = currentUser.email;
                const [ownedSnap, managedSnap, crewSnap] = await Promise.all([
                    db.collection('businesses').where('ownerEmail', '==', email).get(),
                    db.collection('businesses').where('stewardship.managers', 'array-contains', email).get(),
                    db.collection('businesses').where('stewardship.crew', 'array-contains', email).get()
                ]);

                const owned = ownedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const managed = managedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const crew = crewSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const all = [...owned, ...managed, ...crew];
                const unique = Array.from(new Map(all.map(b => [b.id, b])).values());
                
                setMyBusinesses(unique);
                if (unique.length === 1 && !selectedBiz) {
                    handleSelectBiz(unique[0]);
                }
            } catch (err) {
                console.warn("Failed to fetch stewardship businesses:", err);
            }
        };

        fetchMyBiz();
    }, [currentUser, isSupportMode]);

    const stewardshipLevel = selectedBiz ? getStewardshipLevel(selectedBiz) : null;
    const canEditProfile = stewardshipLevel === 'founder' || stewardshipLevel === 'support';
    const canSeeIntelligence = stewardshipLevel === 'founder' || stewardshipLevel === 'manager' || stewardshipLevel === 'support';
    const canVerifyPurchases = stewardshipLevel !== null;

    const [shardedStats, setShardedStats] = useState({ checkins: 0, ghostCheckins: 0, purchases: 0, volume: 0 });

    const handleSyncLedger = async () => {
        if (!selectedBiz || isSyncingLedger) return;
        setIsSyncingLedger(true);
        setStatusMessage({ text: "Synchronizing merchant ledger...", type: 'info' });
        try {
            const syncFn = firebase.functions().httpsCallable('syncmerchantledger');
            const result = await syncFn({ bizId: selectedBiz.id });
            setStatusMessage({ text: `Sync complete. Pulled ${result.data?.count || 0} transactions into projection.`, type: 'success' });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (e) {
            console.error("Manual sync failed:", e);
            setStatusMessage({ text: "Sync failed: " + e.message, type: 'error' });
        } finally {
            setIsSyncingLedger(false);
        }
    };

    const handleSelectBiz = async (biz) => {
        setSelectedBiz(biz);
        setShardedStats({ checkins: 0, ghostCheckins: 0, purchases: 0, volume: 0 });
        
        // INTELLIGENCE CENTER PIVOT: Pull from the specialized aggregation doc
        try {
            const intelSnap = await db.collection('businesses').doc(biz.id).collection('intelligence').doc('latest').get();
            if (intelSnap.exists) {
                const data = intelSnap.data();
                setShardedStats({
                    checkins: data.totalCheckins || 0,
                    ghostCheckins: data.ghostCheckins || 0,
                    purchases: data.totalPurchases || 0,
                    volume: data.communityImpact || 0,
                    loyalSupporters: data.loyalSupporters || 0,
                    uniqueVisitors: data.uniqueVisitors || 0
                });
            } else {
                // Fallback to legacy shard summing if doc doesn't exist yet
                const shardSnap = await db.collection('businesses').doc(biz.id).collection('shards').get();
                let checkins = biz.checkinsCount || 0;
                let ghostCheckins = biz.ghostCheckinsCount || 0;
                let purchases = biz.purchasesCount || 0;
                let volume = biz.purchaseVolume || 0;

                shardSnap.forEach(doc => {
                    const s = doc.data();
                    checkins += (s.checkinsCount || 0);
                    ghostCheckins += (s.ghostCheckinsCount || 0);
                    purchases += (s.purchasesCount || 0);
                    volume += (s.purchaseVolume || 0);
                });
                setShardedStats({ checkins: checkins - ghostCheckins, ghostCheckins, purchases, volume });
            }
        } catch (e) {
            console.warn("Intelligence fetch failed:", e);
        }

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
            setStatusMessage({ text: "Business profile updated successfully!", type: 'success' });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            setStatusMessage({ text: "Failed to update profile: " + err.message, type: 'error' });
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

    const handleDownloadStandee = () => {
        if (!selectedBiz) return;
        const main = document.createElement('canvas');
        main.width = 1118; main.height = 1588;
        const qr = document.getElementById('hidden-qr');
        if (!qr) {
            setStatusMessage({ text: "QR Generator not ready. Please try again.", type: 'error' });
            return;
        }
        
        const dataUrl = drawStandee(main, qr, selectedBiz.name);
        const link = document.createElement('a');
        link.download = `BFG_Standee_${selectedBiz.id}.png`;
        link.href = dataUrl;
        link.click();
    };

    const getIndustryIcon = (industry) => {
        const map = {
            'Arts & Culture': 'fa-palette',
            'Business Support Services': 'fa-handshake-angle',
            'Cafe and Restaurants': 'fa-utensils',
            'Community': 'fa-users',
            'Ecological Stewardship': 'fa-earth-americas',
            'Education & Talent': 'fa-graduation-cap',
            'Finance': 'fa-coins',
            'Food Systems': 'fa-wheat-awn',
            'Gifts & Crafts': 'fa-gift',
            'Health & Wellness': 'fa-heart-pulse',
            'Housing & Living': 'fa-house-chimney',
            'Manufacturing & Logistics': 'fa-industry',
            'Personal Support Services': 'fa-user-gear',
            'Pets': 'fa-paw',
            'Repairs, Recycling & Sharing': 'fa-screwdriver-wrench',
            'Social Events': 'fa-calendar-day',
            'Sports': 'fa-volleyball',
            'Tourism & Nature': 'fa-leaf',
            'Transportation & Mobility': 'fa-bus'
        };
        return map[industry] || 'fa-store';
    };

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

            {/* Status Toast */}
            {statusMessage && (
                <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 5000 }} className="slide-up">
                    <div className="glass-card" style={{ 
                        padding: '0.8rem 1.5rem', 
                        background: statusMessage.type === 'error' ? 'rgba(255,50,50,0.2)' : 
                                   statusMessage.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${statusMessage.type === 'error' ? '#ff4444' : statusMessage.type === 'success' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                        color: statusMessage.type === 'error' ? '#ff4444' : statusMessage.type === 'success' ? '#22c55e' : '#fff',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.85rem'
                    }}>
                        <i className={`fa-solid ${statusMessage.type === 'error' ? 'fa-circle-xmark' : statusMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`}></i>
                        <span style={{ fontWeight: '600' }}>{statusMessage.text}</span>
                    </div>
                </div>
            )}

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
                        <i className={`fa-solid ${getIndustryIcon(selectedBiz?.industry)}`} style={{ color: 'white', fontSize: '1.5rem' }}></i>
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
            
            {/* Searchable Business Switcher for Admins/Support */}
            {(currentUser?.isSuperAdmin || currentUser?.isCustomerSuccess) && (
                <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--accent-primary-transparent)' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>
                        <i className="fa-solid fa-magnifying-glass"></i> Switch Stewardship Context (Search Businesses)
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            placeholder="Search for a business name or ID..."
                            className="input-modern"
                            style={{ flex: 1 }}
                            value={switcherInput}
                            onChange={(e) => setSwitcherInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const term = switcherInput.toLowerCase();
                                    if (term.length > 0) {
                                        const found = businesses.filter(b => b.name.toLowerCase().includes(term) || b.id.toLowerCase().includes(term));
                                        setMyBusinesses(found);
                                    } else {
                                        setMyBusinesses(businesses.slice(0, 10));
                                    }
                                }
                            }}
                        />
                        <button 
                            onClick={() => {
                                const term = switcherInput.toLowerCase();
                                if (term.length > 0) {
                                    const found = businesses.filter(b => b.name.toLowerCase().includes(term) || b.id.toLowerCase().includes(term));
                                    setMyBusinesses(found);
                                } else {
                                    setMyBusinesses(businesses.slice(0, 10));
                                }
                            }}
                            className="btn btn-primary"
                            style={{ height: '45px', borderRadius: 'var(--radius-md)', padding: '0 1rem', fontSize: '0.8rem' }}
                        >
                            Find
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto', padding: '4px' }}>
                        {myBusinesses.slice(0, 15).map(b => (
                            <button 
                                key={b.id} 
                                onClick={() => handleSelectBiz(b)}
                                className={`filter-btn ${selectedBiz?.id === b.id ? 'active' : ''}`}
                                style={{ fontSize: '0.8rem' }}
                            >
                                {b.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {myBusinesses.length > 1 && !(currentUser?.isSuperAdmin || currentUser?.isCustomerSuccess) && (
                <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Stewardship Portfolio:</label>
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
                    <div className="portal-header" style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>Operations Hub</h1>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    {selectedBiz.name} • Daily Engagements
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    onClick={() => navigate('/merchant-portal')} 
                                    className="btn btn-secondary"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                    <i className="fa-solid fa-arrow-left"></i> Strategy Hub
                                </button>
                                <button onClick={handleDownloadStandee} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <i className="fa-solid fa-download"></i> Get Standee
                                </button>
                            </div>
                        </div>
                    </div>

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
                                <QRCodeCanvas id="hidden-qr" value={`${window.location.origin}/scanner?bizId=${selectedBiz.id}`} size={550} level="H" />
                            </div>
                        </div>

                        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                             <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="stat-value">{shardedStats.checkins || selectedBiz.checkinsCount || 0}</div>
                                <div className="stat-label">Member Check-ins</div>
                            </div>
                            <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="stat-value" style={{ color: '#ffb84d' }}>{shardedStats.ghostCheckins || selectedBiz.ghostCheckinsCount || 0}</div>
                                <div className="stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                    Ghost Check-ins 
                                    <i className="fa-solid fa-circle-question" title="Anonymous support acknowledgments from unregistered visitors. These are not linked to registered identities." style={{ fontSize: '0.7rem', cursor: 'help' }}></i>
                                </div>
                            </div>
                            <div className="stat-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div className="stat-value">{shardedStats.purchases || selectedBiz.purchasesCount || 0}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#ffb84d', fontWeight: '600', marginTop: '0.2rem' }}>RM {(shardedStats.volume || selectedBiz.purchaseVolume || 0).toLocaleString()}</div>
                                </div>
                                <div className="stat-label">Purchases from the Network</div>
                            </div>
                            <div className="stat-card" style={{ background: 'rgba(76, 175, 80, 0.1)' }}>
                                <div className="stat-value" style={{ color: '#4caf50' }}>{selectedBiz.isVerified ? 'VERIFIED' : 'ACTIVE'}</div>
                                <div className="stat-label">Network Status</div>
                            </div>
                        </div>
                    </div>

                    {/* Operational Core */}
                    <div className="glass-card" style={{ marginBottom: '2.5rem', border: '1px solid var(--loyalty-glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <i className="fa-solid fa-qrcode" style={{ color: '#ffb84d' }}></i>
                                    Engagement Scanner
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    Scan customer cards to record engagement and recognize loyalty.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowScanner(true)}
                                className="nav-btn active feature-gradient" 
                                style={{ borderRadius: 'var(--radius-full)', height: '50px', padding: '0 2rem' }}
                            >
                                <i className="fa-solid fa-camera"></i> Launch Scanner
                            </button>
                        </div>

                        <GratitudeBondsLog 
                            bizId={selectedBiz.id} 
                            canSeeIntelligence={canSeeIntelligence}
                            onSelectUser={(uid) => {
                                if (canSeeIntelligence) {
                                    setScannedUserId(uid);
                                    setShowIntelligence(true);
                                } else {
                                    setStatusMessage({ text: "Recognition details are restricted to Owners and Managers.", type: 'error' });
                                }
                            }} 
                        />
                    </div>

                    {/* Verification Queue */}
                    <div className="glass-card" style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}><i className="fa-solid fa-user-check" style={{ color: '#ffb84d' }}></i> Purchase Verification Queue</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review and verify customer purchase logs to validate network impact.</p>
                            </div>
                            <button 
                                onClick={handleSyncLedger}
                                disabled={isSyncingLedger}
                                className="nav-btn"
                                style={{ 
                                    padding: '0.4rem 1rem', 
                                    fontSize: '0.75rem', 
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: 'var(--radius-full)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isSyncingLedger ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrows-rotate"></i>}
                                Sync Ledger
                            </button>
                        </div>

                        <PendingVerifications bizId={selectedBiz.id} setStatus={setStatusMessage} />
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

const PendingVerifications = ({ bizId, setStatus }) => {
    const [pending, setPending] = useState([]);
    const [processing, setProcessing] = useState(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (!bizId) return;
        // PIVOT: Query the partitioned sub-collection instead of the global ledger
        const unsubscribe = db.collection('businesses').doc(bizId).collection('transactions')
            .where('status', '==', 'pending')
            .where('type', '==', 'purchase')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .onSnapshot(snap => {
                setPending(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        return () => unsubscribe();
    }, [bizId]);

    const handleVerify = async (trans, isApproved) => {
        setProcessing(trans.id);
        setStatus({ text: isApproved ? "Verifying purchase..." : "Rejecting purchase...", type: 'info' });
        try {
            if (isApproved) {
                // 3-POINT ATOMIC BATCH: Handled by server for absolute integrity
                const verifyFn = firebase.functions().httpsCallable('verifypurchase');
                await verifyFn({ txnId: trans.id, bizId });
                setStatus({ text: "Purchase verified successfully!", type: 'success' });
            } else {
                // Rejection remains simple
                await db.collection('businesses').doc(bizId).collection('transactions').doc(trans.id).update({ 
                    status: 'rejected', 
                    rejectedAt: new Date().toISOString(), 
                    rejectedBy: currentUser.email 
                });
                await db.collection('transactions').doc(trans.id).update({ 
                    status: 'rejected', 
                    rejectedAt: new Date().toISOString(), 
                    rejectedBy: currentUser.email 
                });
                setStatus({ text: "Purchase rejected.", type: 'info' });
            }
            setTimeout(() => setStatus(null), 3000);
        } catch (e) {
            console.error("Verification failed:", e);
            setStatus({ text: "Verification failed: " + e.message, type: 'error' });
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
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Logged by <span 
                                className="clickable" 
                                style={{ color: 'var(--accent-primary)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => {
                                    setScannedUserId(t.userId);
                                    setShowIntelligence(true);
                                }}
                            >
                                {t.userNickname}
                            </span> on {new Date(t.timestamp).toLocaleDateString()}
                        </p>
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

const GratitudeBondsLog = ({ bizId, onSelectUser, canSeeIntelligence }) => {
    const [bonds, setBonds] = useState([]);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bizId) return;
        const now = new Date();
        const unsubscribe = db.collection('gratitude_bond_transfer')
            .where('bizId', '==', bizId)
            .where('type', '==', 'handshake_scan')
            .where('expiresAt', '>', now)
            .orderBy('expiresAt', 'desc')
            .limit(20)
            .onSnapshot(snap => {
                setBonds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
        return () => unsubscribe();
    }, [bizId]);

    const filtered = search.length > 0 
        ? bonds.filter(b => b.userId?.toLowerCase().includes(search.toLowerCase())) // Ideally this would be nickname if stored in bond
        : bonds;

    if (loading) return null;

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                    <i className="fa-solid fa-clock-rotate-left"></i> {canSeeIntelligence ? 'Active Stewardship Bonds' : 'Recent Scan Log'} (48h)
                </label>
                {canSeeIntelligence && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            placeholder="Search scans..." 
                            className="input-modern"
                            style={{ fontSize: '0.7rem', padding: '4px 10px', width: '120px' }}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
                        />
                        <button 
                            onClick={() => setSearch(searchInput)}
                            className="btn-icon" 
                            style={{ fontSize: '0.8rem', opacity: 0.7 }}
                        >
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </button>
                    </div>
                )}
            </div>
            {filtered.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No active bonds found.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {filtered.map(bond => (
                        <div 
                            key={bond.id} 
                            onClick={() => onSelectUser(bond.userId)}
                            className="glass-card clickable" 
                            style={{ 
                                flex: '0 0 160px', 
                                padding: '1rem', 
                                textAlign: 'center', 
                                cursor: 'pointer',
                                background: 'rgba(255,184,77,0.05)',
                                border: '1px solid rgba(255,184,77,0.2)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ background: 'rgba(255,255,255,0.1)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.8rem' }}>
                                <i className="fa-solid fa-user-check" style={{ color: '#ffb84d' }}></i>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {bond.userId?.substring(0, 8)}...
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
