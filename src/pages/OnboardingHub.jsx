import React, { useState, useEffect } from 'react';
import { db, functions, auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import ApplicationEditor from '../components/admin/ApplicationEditor';
import useBusinesses from '../hooks/useBusinesses';
import { QRCodeCanvas } from 'qrcode.react';
import { drawStandee } from '../utils/assetUtils';
import firebase from 'firebase/compat/app';

const OnboardingHub = () => {
    const { currentUser } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);
    const [editingApp, setEditingApp] = useState(null);
    const [activeTab, setActiveTab] = useState('applications'); // 'applications' or 'directory'

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = db.collection('applications')
            .where('status', 'in', ['pending', 'draft'])
            .onSnapshot(snap => {
                setApplications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            }, err => {
                console.error("Onboarding Hub Subscription failed:", err);
                setLoading(false);
            });

        return unsubscribe;
    }, [currentUser]);

    // Role Guard
    if (!currentUser?.isCustomerSuccess && !currentUser?.isSuperAdmin) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Unauthorized: Customer Success Access Only</div>;
    }

    const handlePickUp = async (id) => {
        setIsActioning(true);
        try {
            const assignFn = functions.httpsCallable('assignapplication');
            await assignFn({ applicationId: id });
            alert("Application assigned to you.");
        } catch (err) {
            alert(err.message);
        } finally {
            setIsActioning(false);
        }
    };

    const handleUpdateApp = async (updates) => {
        setIsActioning(true);
        try {
            const updateFn = functions.httpsCallable('updateapplication');
            await updateFn({ applicationId: editingApp.id, updates });
            setEditingApp(null);
            alert("Draft saved successfully.");
        } catch (err) {
            alert(err.message);
        } finally {
            setIsActioning(false);
        }
    };

    const handlePublish = async (id) => {
        if (!window.confirm("Ready to take this business live? This will generate their unique onboarding code.")) return;
        setIsActioning(true);
        try {
            const publishFn = functions.httpsCallable('publishapplication');
            await publishFn({ applicationId: id });
            alert("Business published successfully! They are now live on the network.");
        } catch (err) {
            alert(err.message);
        } finally {
            setIsActioning(false);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="page-header" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fa-solid fa-store fa-2x" style={{ color: 'var(--color-growth)' }}></i>
                    <div>
                        <h2 style={{ margin: 0 }}>Merchant Portal</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Network Growth & Merchant Support</p>
                    </div>
                </div>
                <button onClick={() => window.history.back()} className="filter-btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <button 
                    onClick={() => setActiveTab('applications')}
                    className={`nav-btn ${activeTab === 'applications' ? 'active' : ''}`}
                    style={{ background: activeTab === 'applications' ? 'var(--accent-primary)' : 'transparent', borderRadius: 'var(--radius-full)' }}
                >
                    <i className="fa-solid fa-clipboard-list"></i> Applications ({applications.length})
                </button>
                <button 
                    onClick={() => setActiveTab('directory')}
                    className={`nav-btn ${activeTab === 'directory' ? 'active' : ''}`}
                    style={{ background: activeTab === 'directory' ? 'var(--accent-primary)' : 'transparent', borderRadius: 'var(--radius-full)' }}
                >
                    <i className="fa-solid fa-address-book"></i> Active Directory
                </button>
            </div>

            {activeTab === 'applications' ? (
                <ApplicationPoolTab 
                    loading={loading}
                    applications={applications}
                    isActioning={isActioning}
                    onPickUp={handlePickUp}
                    onEdit={setEditingApp}
                    onPublish={handlePublish}
                />
            ) : (
                <DirectoryManagementTab />
            )}

            {editingApp && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(5px)' }}>
                    <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Review Application</h3>
                            <button onClick={() => setEditingApp(null)} className="btn-icon">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <ApplicationEditor application={editingApp} onSave={handleUpdateApp} readOnly={false} />
                    </div>
                </div>
            )}
        </div>
    );
};

const ApplicationPoolTab = ({ loading, applications, isActioning, onPickUp, onEdit, onPublish }) => {
    const { currentUser } = useAuth();
    
    if (loading) return (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p style={{ marginTop: '1rem' }}>Synchronizing application pool...</p>
        </div>
    );

    const myAssignments = applications.filter(a => a.assignedTo === currentUser.uid);
    const unassigned = applications.filter(a => !a.assignedTo && a.status === 'pending');

    return (
        <div className="slide-up">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Section 1: Assigned to Me */}
                <div>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '1px' }}>My Active Assignments</h4>
                    {myAssignments.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No pending tasks assigned to you.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {myAssignments.map(app => (
                                <div key={app.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem' }}>
                                    <div>
                                        <h4 style={{ margin: 0 }}>{app.name}</h4>
                                        <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{app.email} • {app.industry}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        <button onClick={() => onEdit(app)} className="nav-btn" style={{ fontSize: '0.8rem' }}>
                                            <i className="fa-solid fa-pen-to-square"></i> Review
                                        </button>
                                        <button 
                                            onClick={() => onPublish(app.id)} 
                                            disabled={isActioning}
                                            className="nav-btn active" 
                                            style={{ fontSize: '0.8rem', background: 'var(--color-growth)' }}
                                        >
                                            <i className="fa-solid fa-check-circle"></i> Publish
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Section 2: Intake Pool */}
                <div>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '1px' }}>New Intake Pool</h4>
                    {unassigned.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>Intake pool is currently empty.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {unassigned.map(app => (
                                <div key={app.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', opacity: 0.8 }}>
                                    <div>
                                        <h4 style={{ margin: 0 }}>{app.name}</h4>
                                        <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{app.industry} • Submitted {new Date(app.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                        onClick={() => onPickUp(app.id)} 
                                        disabled={isActioning}
                                        className="nav-btn" 
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        <i className="fa-solid fa-hand-holding-hand"></i> Pick Up
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DirectoryManagementTab = () => {
    const { businesses, loading } = useBusinesses();
    const [searchQuery, setSearchQuery] = useState('');
    const [newBiz, setNewBiz] = useState({ 
        id: '', name: '', industry: 'Cafe and Restaurants', location: '', founder: '', ownerEmail: '',
        founderImg: '', shopfrontImg: ''
    });

    const filteredBusinesses = React.useMemo(() => {
        if (!searchQuery) return businesses;
        const q = searchQuery.toLowerCase();
        return businesses.filter(b => 
            b.name?.toLowerCase().includes(q) || 
            b.founder?.toLowerCase().includes(q) ||
            b.id?.toLowerCase().includes(q)
        );
    }, [businesses, searchQuery]);

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
                id: '', name: '', industry: 'Cafe and Restaurants', location: '', founder: '', ownerEmail: '',
                founderImg: '', shopfrontImg: ''
            });
            alert("Merchant successfully onboarded!");
        } catch (err) {
            alert("Onboarding failed: " + err.message);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading directory...</div>;

    return (
        <div className="slide-up">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* Column 1: Manual Onboarding */}
                <div>
                    <div className="glass-card" style={{ padding: '1.5rem', position: 'sticky', top: '1rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>Manual Onboard (Affiliate)</h4>
                        <form onSubmit={onboardMerchant} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <input type="text" placeholder="Custom ID (e.g. cafe-lab)" className="input-modern" value={newBiz.id} onChange={e => setNewBiz({...newBiz, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                            <input type="text" placeholder="Business Name" className="input-modern" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} />
                            <input type="text" placeholder="Founder Name" className="input-modern" value={newBiz.founder} onChange={e => setNewBiz({...newBiz, founder: e.target.value})} />
                            <input type="email" placeholder="Owner Email" className="input-modern" value={newBiz.ownerEmail} onChange={e => setNewBiz({...newBiz, ownerEmail: e.target.value})} />
                            <button type="submit" className="nav-btn active" style={{ width: '100%', marginTop: '0.5rem' }}>Create Active Profile</button>
                        </form>
                    </div>
                </div>

                {/* Column 2: Directory & Assets */}
                <div>
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: 0 }}>Business Inventory</h4>
                            <input 
                                type="text" 
                                placeholder="Search inventory..." 
                                className="input-modern" 
                                style={{ width: '200px', fontSize: '0.8rem' }}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {filteredBusinesses.map(biz => (
                                <div key={biz.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <h5 style={{ margin: 0 }}>{biz.name}</h5>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0' }}>{biz.id} • {biz.location || 'No Location'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <div style={{ display: 'none' }}>
                                            <QRCodeCanvas id={`qr-${biz.id}`} value={`${window.location.origin}/scanner?bizId=${biz.id}`} size={550} level="H" />
                                        </div>
                                        <button 
                                            title="Download Standee"
                                            className="nav-btn" 
                                            style={{ padding: '0.5rem 0.8rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem' }}
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
                                            <i className="fa-solid fa-qrcode"></i> Standee
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingHub;
