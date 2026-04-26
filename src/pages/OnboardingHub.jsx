import React, { useState, useEffect } from 'react';
import { db, functions } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import ApplicationEditor from '../components/admin/ApplicationEditor';
import useBusinesses from '../hooks/useBusinesses';
import { QRCodeCanvas } from 'qrcode.react';
import { drawStandee } from '../utils/assetUtils';
import firebase from 'firebase/compat/app';
import { useNavigate } from 'react-router-dom';

const OnboardingHub = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
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
        return (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <i className="fa-solid fa-lock fa-3x" style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem', opacity: 0.5 }}></i>
                <h2 style={{ marginBottom: '0.5rem' }}>Access Restricted</h2>
                <p style={{ color: 'var(--text-secondary)' }}>This portal is reserved for Network Staff and Governance.</p>
                <button onClick={() => navigate('/profile')} className="btn btn-primary mt-2">Return to Profile</button>
            </div>
        );
    }

    const handlePickUp = async (id) => {
        setIsActioning(true);
        try {
            const assignFn = functions.httpsCallable('assignapplication');
            await assignFn({ applicationId: id });
        } catch (err) {
            alert(err.message);
        } finally {
            setIsActioning(false);
        }
    };

    const handleUpdateApp = async (updates) => {
        setIsActioning(true);
        try {
            const isActiveBusiness = editingApp.status === 'active' || !editingApp.status;
            if (isActiveBusiness) {
                await db.collection('businesses').doc(editingApp.id).update(updates);
            } else {
                const updateFn = functions.httpsCallable('updateapplication');
                await updateFn({ applicationId: editingApp.id, updates });
            }
            setEditingApp(null);
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
        } catch (err) {
            alert(err.message);
        } finally {
            setIsActioning(false);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div className="glass-card" style={{ width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <i className="fa-solid fa-store fa-2x" style={{ color: '#3B82F6' }}></i>
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Merchant Portal</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '4px' }}>Network Growth & Strategic Support</p>
                    </div>
                </div>
                <button onClick={() => navigate('/profile')} className="icon-btn glass-card" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                </button>
            </div>

            {/* Premium Tab Navigation */}
            <div className="glass-card" style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: 'var(--radius-full)', marginBottom: '2.5rem', gap: '0.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <button 
                    onClick={() => setActiveTab('applications')}
                    className={`nav-btn ${activeTab === 'applications' ? 'active' : ''}`}
                    style={{ 
                        background: activeTab === 'applications' ? 'var(--accent-primary)' : 'transparent', 
                        borderRadius: 'var(--radius-full)',
                        padding: '0.6rem 1.5rem',
                        border: 'none',
                        color: activeTab === 'applications' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '600'
                    }}
                >
                    <i className="fa-solid fa-clipboard-list" style={{ marginRight: '8px' }}></i> Intake Pool ({applications.length})
                </button>
                <button 
                    onClick={() => setActiveTab('directory')}
                    className={`nav-btn ${activeTab === 'directory' ? 'active' : ''}`}
                    style={{ 
                        background: activeTab === 'directory' ? 'var(--accent-primary)' : 'transparent', 
                        borderRadius: 'var(--radius-full)',
                        padding: '0.6rem 1.5rem',
                        border: 'none',
                        color: activeTab === 'directory' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '600'
                    }}
                >
                    <i className="fa-solid fa-address-book" style={{ marginRight: '8px' }}></i> Network Inventory
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
                <DirectoryManagementTab onEdit={setEditingApp} />
            )}

            {/* Modal Overlay for Editor */}
            {editingApp && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(12px)' }}>
                    <div className="slide-up" style={{ width: '100%', maxWidth: '700px' }}>
                        <ApplicationEditor application={editingApp} onClose={() => setEditingApp(null)} onSave={handleUpdateApp} readOnly={false} />
                    </div>
                </div>
            )}
        </div>
    );
};

const ApplicationPoolTab = ({ loading, applications, isActioning, onPickUp, onEdit, onPublish }) => {
    const { currentUser } = useAuth();
    
    if (loading) return (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem' }}></i>
            <p style={{ color: 'var(--text-secondary)', letterSpacing: '1px' }}>SYNCHRONIZING INTAKE POOL...</p>
        </div>
    );

    const myAssignments = applications.filter(a => a.assignedTo === currentUser.uid);
    const unassigned = applications.filter(a => !a.assignedTo && a.status === 'pending');

    return (
        <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {/* My Assignments */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                    <div style={{ width: '8px', height: '24px', background: 'var(--accent-primary)', borderRadius: '4px' }}></div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Active Assignments</h3>
                </div>

                {myAssignments.length === 0 ? (
                    <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>You currently have no pending merchant reviews.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {myAssignments.map(app => (
                            <div key={app.id} className="glass-card item-card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--accent-primary)' }}>
                                        <i className="fa-solid fa-file-signature"></i>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{app.name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>{app.industry}</span> • {app.email}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button onClick={() => onEdit(app)} className="btn glass-card" style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem' }}>
                                        <i className="fa-solid fa-pen-to-square"></i> Review
                                    </button>
                                    <button 
                                        onClick={() => onPublish(app.id)} 
                                        disabled={isActioning}
                                        className="btn btn-primary" 
                                        style={{ fontSize: '0.85rem', padding: '0.6rem 1.5rem', background: 'var(--color-growth)' }}
                                    >
                                        <i className="fa-solid fa-check-circle"></i> Publish
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* New Intake Pool */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                    <div style={{ width: '8px', height: '24px', background: 'var(--text-secondary)', borderRadius: '4px', opacity: 0.3 }}></div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, color: 'var(--text-secondary)' }}>Intake Pool</h3>
                </div>

                {unassigned.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center', padding: '2rem' }}>The intake pool is currently empty.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {unassigned.map(app => (
                            <div key={app.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', opacity: 0.7 }}>
                                <div>
                                    <h4 style={{ margin: '0 0 2px 0' }}>{app.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {app.industry} • Submitted {new Date(app.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => onPickUp(app.id)} 
                                    disabled={isActioning}
                                    className="btn glass-card" 
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    <i className="fa-solid fa-hand-holding-hand"></i> Claim Application
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

const DirectoryManagementTab = ({ onEdit }) => {
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

    if (loading) return <div style={{ padding: '5rem 0', textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>;

    return (
        <div className="slide-up">
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2.5rem', alignItems: 'start' }}>
                {/* Column 1: Manual Onboarding Form */}
                <aside>
                    <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: '1rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '700' }}>
                            <i className="fa-solid fa-plus-circle" style={{ color: 'var(--accent-primary)', marginRight: '8px' }}></i> Direct Onboard
                        </h3>
                        <form onSubmit={onboardMerchant} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Network ID</label>
                                <input type="text" placeholder="e.g. cafe-lab" className="input-modern" value={newBiz.id} onChange={e => setNewBiz({...newBiz, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Brand Name</label>
                                <input type="text" placeholder="Business Name" className="input-modern" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Founder</label>
                                <input type="text" placeholder="Founder Name" className="input-modern" value={newBiz.founder} onChange={e => setNewBiz({...newBiz, founder: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Registered Email</label>
                                <input type="email" placeholder="owner@email.com" className="input-modern" value={newBiz.ownerEmail} onChange={e => setNewBiz({...newBiz, ownerEmail: e.target.value})} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', height: '48px', fontWeight: '700' }}>
                                Initialize Profile
                            </button>
                        </form>
                    </div>
                </aside>

                {/* Column 2: Searchable Inventory */}
                <main>
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Network Inventory</h3>
                            <div style={{ position: 'relative', width: '260px' }}>
                                <i className="fa-solid fa-search" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}></i>
                                <input 
                                    type="text" 
                                    placeholder="Search by name or ID..." 
                                    className="input-modern" 
                                    style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.85rem', height: '40px' }}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {filteredBusinesses.map(biz => (
                                <div key={biz.id} className="item-card-hover" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                                            <i className="fa-solid fa-building"></i>
                                        </div>
                                        <div>
                                            <h5 style={{ margin: '0 0 2px 0', fontSize: '1rem' }}>{biz.name}</h5>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                                <code style={{ color: 'var(--accent-primary)', fontSize: '0.7rem' }}>{biz.id}</code> • {biz.location || 'Remote/TBD'}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <div style={{ display: 'none' }}>
                                            <QRCodeCanvas id={`qr-${biz.id}`} value={`${window.location.origin}/scanner?bizId=${biz.id}`} size={550} level="H" />
                                        </div>
                                        <button 
                                            title="Manual Profile Edit"
                                            className="icon-btn glass-card" 
                                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                                            onClick={() => onEdit(biz)}
                                        >
                                            <i className="fa-solid fa-pen-to-square"></i>
                                        </button>
                                        <button 
                                            title="Generate Network Standee"
                                            className="btn glass-card" 
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
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
                                            <i className="fa-solid fa-qrcode"></i> Asset
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredBusinesses.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                    <p>No matches found in network inventory.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default OnboardingHub;
