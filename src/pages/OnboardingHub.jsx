import React, { useState, useEffect } from 'react';
import { db, functions } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import ApplicationEditor from '../components/admin/ApplicationEditor';

const OnboardingHub = () => {
    const { currentUser } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);
    const [editingApp, setEditingApp] = useState(null);

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
                        <h2 style={{ margin: 0 }}>Onboarding Hub</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Customer Success Growth Pipeline</p>
                    </div>
                </div>
                <button onClick={() => window.history.back()} className="filter-btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <p style={{ marginTop: '1rem' }}>Synchronizing application pool...</p>
                </div>
            ) : (
                <div className="slide-up" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Section 1: Assigned to Me */}
                        <div>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '1px' }}>My Active Assignments</h4>
                            {applications.filter(a => a.assignedTo === currentUser.uid).length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>You haven't picked up any applications yet.</p>
                            ) : (
                                applications.filter(a => a.assignedTo === currentUser.uid).map(app => (
                                    <div key={app.id} className="glass-card mb-3" style={{ borderLeft: '4px solid var(--color-growth)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ margin: 0 }}>{app.name}</h4>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Owner: {app.email}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span className="tier-badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-growth)' }}>Drafting</span>
                                                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                    Picked up {app.pickedUpAt?.seconds ? new Date(app.pickedUpAt.seconds * 1000).toLocaleDateString() : 'recently'}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => setEditingApp(app)} className="nav-btn" style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                                                <i className="fa-solid fa-pen-to-square"></i> Open Studio Editor
                                            </button>
                                            <button onClick={() => handlePublish(app.id)} className="nav-btn active" style={{ flex: 1, justifyContent: 'center' }} disabled={isActioning}>
                                                {isActioning ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-rocket"></i> Publish Business</>}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Section 2: Unassigned */}
                        <div>
                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem', letterSpacing: '1px' }}>New Intake Pool (Unassigned)</h4>
                            {applications.filter(a => !a.assignedTo).length === 0 ? (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No new applications awaiting assignment.</p>
                            ) : (
                                applications.filter(a => !a.assignedTo).map(app => (
                                    <div key={app.id} className="glass-card mb-3">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ margin: 0 }}>{app.name}</h4>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contact: {app.phone}</p>
                                            </div>
                                            <button onClick={() => handlePickUp(app.id)} className="btn btn-primary" style={{ fontSize: '0.75rem', width: 'auto', padding: '0.5rem 1rem' }} disabled={isActioning}>
                                                {isActioning ? <i className="fa-solid fa-spinner fa-spin"></i> : "Pick Up Request"}
                                            </button>
                                        </div>
                                        <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            Applied: {app.timestamp?.seconds ? new Date(app.timestamp.seconds * 1000).toLocaleDateString() : 'recently'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editingApp && (
                <ApplicationEditor 
                    application={editingApp} 
                    onClose={() => setEditingApp(null)} 
                    onSave={handleUpdateApp}
                    isSaving={isActioning}
                />
            )}
        </div>
    );
};

export default OnboardingHub;
