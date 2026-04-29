import React, { useState, useEffect } from 'react';
import { db, functions } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import ApplicationEditor from '../components/admin/ApplicationEditor';
import { useBusinesses } from '../hooks/useBusinesses';
import { QRCodeCanvas } from 'qrcode.react';
import { drawStandee } from '../utils/assetUtils';
import { useNavigate } from 'react-router-dom';

const OnboardingHub = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [isActioning, setIsActioning] = useState(false);
    const [editingApp, setEditingApp] = useState(null);
    const [activeTab, setActiveTab] = useState('applications'); // 'applications' or 'directory'

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = db.collection('applications')
            .where('status', 'in', ['draft', 'onboarding', 'submitted'])
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
        setStatusMessage({ text: "Assigning application...", type: 'info' });
        try {
            const assignFn = functions.httpsCallable('assignapplication');
            await assignFn({ applicationId: id });
            setStatusMessage({ text: "Application assigned to you.", type: 'success' });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            setStatusMessage({ text: err.message, type: 'error' });
        } finally {
            setIsActioning(false);
        }
    };

    const handleUpdateApp = async (updates) => {
        setIsActioning(true);
        setStatusMessage({ text: "Saving updates...", type: 'info' });
        try {
            const isActiveBusiness = editingApp.status === 'approved' || !editingApp.status;
            if (isActiveBusiness) {
                await db.collection('businesses').doc(editingApp.id).update(updates);
                setStatusMessage({ text: "Business profile updated successfully!", type: 'success' });
            } else {
                const updateFn = functions.httpsCallable('updateapplication');
                await updateFn({ applicationId: editingApp.id, updates });
                setStatusMessage({ text: "Draft saved successfully.", type: 'success' });
            }
            setEditingApp(null);
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            setStatusMessage({ text: err.message, type: 'error' });
        } finally {
            setIsActioning(false);
        }
    };

    const [statusMessage, setStatusMessage] = useState(null);

    const handlePublish = async (id) => {
        // [REFAC] Using custom UI confirm logic if needed, but for now just bypass or use a simpler status
        setStatusMessage({ text: "Publishing business...", type: 'info' });
        setIsActioning(true);
        try {
            const publishFn = functions.httpsCallable('publishapplication');
            await publishFn({ applicationId: id });
            setStatusMessage({ text: "Business published successfully!", type: 'success' });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            setStatusMessage({ text: err.message, type: 'error' });
        } finally {
            setIsActioning(false);
        }
    };

    const handleDeleteApplication = async () => {
        if (!confirmDeleteId) return;
        setStatusMessage({ text: "Deleting application...", type: 'info' });
        setIsActioning(true);
        try {
            const deleteFn = functions.httpsCallable('deleteapplication');
            await deleteFn({ applicationId: confirmDeleteId });
            setStatusMessage({ text: "Application deleted successfully.", type: 'success' });
            setConfirmDeleteId(null);
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (err) {
            setStatusMessage({ text: err.message, type: 'error' });
        } finally {
            setIsActioning(false);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem', maxWidth: '900px', margin: '0 auto' }}>

            {/* Custom Confirm Modal */}
            {confirmDeleteId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                    <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '350px', padding: '2rem', textAlign: 'center' }}>
                        <i className="fa-solid fa-triangle-exclamation fa-3x" style={{ color: '#ff4444', marginBottom: '1rem' }}></i>
                        <h3 style={{ marginBottom: '0.5rem' }}>Confirm Deletion</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>This action is permanent and cannot be undone.</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setConfirmDeleteId(null)} className="btn glass-card" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleDeleteApplication} className="btn btn-primary" style={{ flex: 1, background: '#ff4444', border: 'none', color: '#fff' }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Toast */}
            {statusMessage && (
                <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 5000 }} className="slide-up">
                    <div className="glass-card" style={{ 
                        padding: '1rem 2rem', 
                        background: statusMessage.type === 'error' ? 'rgba(255,50,50,0.2)' : 
                                   statusMessage.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${statusMessage.type === 'error' ? '#ff4444' : statusMessage.type === 'success' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                        color: statusMessage.type === 'error' ? '#ff4444' : statusMessage.type === 'success' ? '#22c55e' : '#fff',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <i className={`fa-solid ${statusMessage.type === 'error' ? 'fa-circle-xmark' : statusMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`}></i>
                        <span style={{ fontWeight: '600' }}>{statusMessage.text}</span>
                    </div>
                </div>
            )}
            <div className="glass-card" style={{ display: 'inline-flex', padding: '0.4rem', borderRadius: 'var(--radius-full)', marginBottom: '2rem', gap: '0.4rem', background: 'rgba(255,255,255,0.02)' }}>
                <button 
                    onClick={() => setActiveTab('applications')}
                    className={`nav-btn ${activeTab === 'applications' ? 'active' : ''}`}
                    style={{ 
                        background: activeTab === 'applications' ? 'var(--accent-primary)' : 'transparent', 
                        borderRadius: 'var(--radius-full)',
                        padding: '0.5rem 1.25rem',
                        fontSize: '0.85rem',
                        color: activeTab === 'applications' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'applications' ? '700' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <i className="fa-solid fa-clipboard-list"></i> Intake Pool ({applications.length})
                </button>
                <button 
                    onClick={() => setActiveTab('directory')}
                    className={`nav-btn ${activeTab === 'directory' ? 'active' : ''}`}
                    style={{ 
                        background: activeTab === 'directory' ? 'var(--accent-primary)' : 'transparent', 
                        borderRadius: 'var(--radius-full)',
                        padding: '0.5rem 1.25rem',
                        fontSize: '0.85rem',
                        color: activeTab === 'directory' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'directory' ? '700' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <i className="fa-solid fa-address-book"></i> Network Inventory
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
                    onDelete={setConfirmDeleteId}
                />
            ) : (
                <DirectoryManagementTab onEdit={setEditingApp} />
            )}

            {/* Editor Modal */}
            {editingApp && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(10px)' }}>
                    <div className="slide-up" style={{ width: '100%', maxWidth: '650px' }}>
                        <ApplicationEditor application={editingApp} onClose={() => setEditingApp(null)} onSave={handleUpdateApp} readOnly={false} />
                    </div>
                </div>
            )}
        </div>
    );
};

const ApplicationPoolTab = ({ loading, applications, isActioning, onPickUp, onEdit, onPublish, onDelete }) => {
    const { currentUser } = useAuth();
    
    if (loading) return <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.5 }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>;

    const myAssignments = applications.filter(a => a.assignedTo === currentUser.uid || a.assignedTo === currentUser.email);
    const unassigned = applications.filter(a => !a.assignedTo && a.status === 'submitted');

    return (
        <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <section>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', opacity: 0.6 }}>Your Active Reviews</h3>
                {myAssignments.length === 0 ? (
                    <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', opacity: 0.5, border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <p style={{ fontSize: '0.9rem' }}>No active assignments.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {myAssignments.map(app => (
                            <div key={app.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem' }}>{app.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{app.industry} • {app.email}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => onEdit(app)} className="btn glass-card" style={{ fontSize: '0.8rem', color: '#fff' }}>Review</button>
                                    <button onClick={() => onPublish(app.id)} disabled={isActioning} className="btn btn-primary" style={{ fontSize: '0.8rem', background: 'var(--color-growth)', color: '#fff' }}>Publish</button>
                                    <button onClick={() => onDelete(app.id)} disabled={isActioning} className="btn icon-btn" style={{ background: 'rgba(255,50,50,0.1)', color: '#ff4444', padding: '0.5rem' }}>
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', opacity: 0.6 }}>New Intake Pool</h3>
                {unassigned.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Intake pool is empty.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {unassigned.map(app => (
                            <div key={app.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', opacity: 0.8 }}>
                                <div>
                                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem' }}>{app.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{app.industry}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button onClick={() => onPickUp(app.id)} disabled={isActioning} className="btn glass-card" style={{ fontSize: '0.8rem', color: '#fff', width: 'auto', padding: '0.5rem 1rem' }}>Claim</button>
                                    <button onClick={() => onDelete(app.id)} disabled={isActioning} className="btn icon-btn" style={{ background: 'rgba(255,50,50,0.1)', color: '#ff4444', padding: '0.5rem' }}>
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

const DirectoryManagementTab = ({ onEdit }) => {
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const { businesses, loading } = useBusinesses(searchQuery);

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        setSearchQuery(inputValue);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearchSubmit();
        }
    };

    if (loading && businesses.length === 0) return <div style={{ padding: '4rem 0', textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>;

    return (
        <div className="slide-up">
            <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Network Inventory</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '500px' }}>
                        <div style={{ position: 'relative' }}>
                            <i className="fa-solid fa-search" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '1rem' }}></i>
                            <input 
                                type="text" 
                                placeholder="Find any business by name or ID..." 
                                className="input-modern" 
                                style={{ 
                                    width: '100%', 
                                    paddingLeft: '3.25rem', 
                                    height: '56px', 
                                    fontSize: '1.1rem',
                                    borderRadius: '16px'
                                }}
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <button 
                            onClick={handleSearchSubmit}
                            className="btn btn-primary"
                            style={{ 
                                height: '48px', 
                                width: '140px',
                                fontSize: '0.95rem',
                                borderRadius: 'var(--radius-full)',
                                alignSelf: 'flex-start',
                                color: '#fff'
                            }}
                        >
                            Commit Search
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '65vh', overflowY: 'auto' }}>
                    {businesses.map(biz => (
                        <div key={biz.id} className="item-card-hover" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    <i className="fa-solid fa-building"></i>
                                </div>
                                <div>
                                    <h5 style={{ margin: '0 0 2px 0', fontSize: '1rem' }}>{biz.name}</h5>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        <code style={{ color: 'var(--accent-primary)' }}>{biz.id}</code> • {biz.location || 'Remote'}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ display: 'none' }}>
                                    <QRCodeCanvas id={`qr-${biz.id}`} value={`${window.location.origin}/scanner?bizId=${biz.id}`} size={550} level="H" />
                                </div>
                                <button title="Edit Profile" className="icon-btn glass-card" style={{ padding: '0.6rem 0.8rem' }} onClick={() => onEdit(biz)}>
                                    <i className="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button 
                                    className="btn glass-card" 
                                    style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
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
                    {businesses.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                            <p>No matches found in the entire network inventory.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingHub;
