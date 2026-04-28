import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, functions } from '../services/firebase';
import ApplicationEditor from '../components/admin/ApplicationEditor';
import OnboardingHub from './OnboardingHub'; 
import CrewManager from '../components/portal/CrewManager';
import useBusinesses from '../hooks/useBusinesses';

/**
 * Unified Merchant Portal
 * A central hub for Ambassadors (Applications), Owners (Management), and CS (Operations).
 */
const MerchantPortal = () => {
    const navigate = useNavigate();
    const { currentUser, syncRoles, isSyncing: authSyncing } = useAuth();
    const [activeTab, setActiveTab] = useState('application');
    const [userApplication, setUserApplication] = useState(null);
    const [myBusinesses, setMyBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isActioning, setIsActioning] = useState(false);
    const [showEditor, setShowEditor] = useState(false);

    // 1. Data Fetching
    useEffect(() => {
        if (!currentUser?.email) return;

        // Fetch User's Application
        const unsubApp = db.collection('applications')
            .where('email', '==', currentUser.email)
            .limit(1)
            .onSnapshot(snap => {
                if (!snap.empty) {
                    setUserApplication({ id: snap.docs[0].id, ...snap.docs[0].data() });
                }
                setLoading(false);
            });

        // Fetch User's Businesses (Owner or Steward)
        const fetchMyBusinesses = async () => {
            try {
                const email = currentUser.email;
                const [ownedSnap, managedSnap, crewSnap] = await Promise.all([
                    db.collection('businesses').where('ownerEmail', '==', email).get(),
                    db.collection('businesses').where('stewardship.managers', 'array-contains', email).get(),
                    db.collection('businesses').where('stewardship.crew', 'array-contains', email).get()
                ]);

                const all = [
                    ...ownedSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    ...managedSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                    ...crewSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                ];
                // Deduplicate
                const unique = Array.from(new Map(all.map(b => [b.id, b])).values());
                setMyBusinesses(unique);
            } catch (err) {
                console.warn("Failed to fetch my businesses:", err);
            }
        };

        fetchMyBusinesses();

        return () => unsubApp();
    }, [currentUser]);

    // Role-based defaults
    useEffect(() => {
        if (currentUser?.isCustomerSuccess || currentUser?.isSuperAdmin) {
            setActiveTab('cs');
        } else if (myBusinesses.length > 0) {
            setActiveTab('my-business');
        } else {
            setActiveTab('application');
        }
    }, [currentUser, myBusinesses.length]);

    const handleStartApplication = async () => {
        setIsActioning(true);
        try {
            const onboardFn = functions.httpsCallable('onboardbusinessapplication');
            const result = await onboardFn({
                name: "New Strategic Application",
                email: currentUser.email,
                phone: ""
            });
            alert("Application draft created! Please fill in your business details.");
            setShowEditor(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setIsActioning(false);
        }
    };

    const handleSubmitApplication = async () => {
        if (!userApplication) return;
        setIsActioning(true);
        try {
            const submitFn = functions.httpsCallable('submitapplication');
            await submitFn({ applicationId: userApplication.id });
            alert("Application submitted! Our Customer Success team will review it shortly.");
        } catch (err) {
            alert(err.message);
        } finally {
            setIsActioning(false);
        }
    };

    const handleUpdateApplication = async (updates) => {
        setIsActioning(true);
        try {
            const updateFn = functions.httpsCallable('updateapplication');
            await updateFn({ applicationId: userApplication.id, updates });
            alert("Application draft saved.");
            setShowEditor(false);
        } catch (err) {
            alert(err.message);
        } finally {
            setIsActioning(false);
        }
    };

    const TabButton = ({ id, icon, label, count }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`nav-btn ${activeTab === id ? 'active' : ''}`}
            style={{ 
                background: activeTab === id ? 'var(--accent-primary)' : 'transparent', 
                borderRadius: 'var(--radius-full)',
                padding: '0.6rem 1.5rem',
                fontSize: '0.85rem',
                border: activeTab === id ? 'none' : '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
            }}
        >
            <i className={`fa-solid ${icon}`}></i>
            <span>{label}</span>
            {count > 0 && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>{count}</span>}
        </button>
    );

    return (
        <div style={{ paddingBottom: '4rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="page-header slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>Merchant Portal</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '4px' }}>Strategic Growth & Operations</p>
                </div>
                <button onClick={() => navigate('/profile')} className="icon-btn glass-card" style={{ padding: '0.8rem 1.2rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-arrow-left"></i>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>Back</span>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="glass-card slide-up" style={{ 
                display: 'flex', 
                padding: '0.5rem', 
                borderRadius: 'var(--radius-full)', 
                marginBottom: '2.5rem', 
                gap: '0.5rem', 
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.05)',
                overflowX: 'auto'
            }}>
                <TabButton id="application" icon="fa-file-signature" label="Register My Business" />
                
                {myBusinesses.length > 0 && (
                    <TabButton id="my-business" icon="fa-store" label="My Business" count={myBusinesses.length} />
                )}

                {(currentUser?.isCustomerSuccess || currentUser?.isSuperAdmin) && (
                    <TabButton id="cs" icon="fa-shield-halved" label="Network Ops (CS)" />
                )}
            </div>

            {/* Content Area */}
            <div className="content-area">
                {activeTab === 'application' && (
                    <div className="slide-up">
                        {!userApplication ? (
                            <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                <i className="fa-solid fa-seedling fa-4x" style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem', opacity: 0.8 }}></i>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem' }}>Register Your Business</h2>
                                <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 2.5rem auto', lineHeight: '1.6' }}>
                                    Join the BFG Network to turn your customer transactions into social impact. Start your application to become a verified for-good business.
                                </p>
                                <button 
                                    onClick={handleStartApplication} 
                                    disabled={isActioning}
                                    className="btn btn-primary feature-gradient" 
                                    style={{ padding: '1.2rem 3rem', fontSize: '1.1rem', fontWeight: '800', border: 'none' }}
                                >
                                    {isActioning ? <i className="fa-solid fa-spinner fa-spin"></i> : "Begin My Application"}
                                </button>
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                background: userApplication.status === 'onboarding' ? 'rgba(59, 130, 246, 0.2)' : 
                                                            userApplication.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
                                                color: userApplication.status === 'onboarding' ? '#3B82F6' : 
                                                       userApplication.status === 'approved' ? '#22c55e' : 'var(--text-secondary)',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                textTransform: 'uppercase',
                                                fontWeight: '800'
                                            }}>
                                                {userApplication.status}
                                            </span>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{userApplication.name}</h3>
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {userApplication.status === 'approved' ? 'This business is live on the BFG Network.' : 'Refine your business story and strategic profile.'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        {userApplication.status === 'draft' && (
                                            <button 
                                                onClick={handleSubmitApplication} 
                                                disabled={isActioning}
                                                className="btn btn-primary feature-gradient"
                                                style={{ border: 'none' }}
                                            >
                                                {isActioning ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-paper-plane"></i> Submit for Review</>}
                                            </button>
                                        )}
                                        {userApplication.status === 'approved' && !currentUser.isOwner && (
                                            <button 
                                                onClick={async () => {
                                                    const res = await syncRoles();
                                                    if (res.success) alert("Identity synced! Business Portal access activated.");
                                                    else alert("Sync failed: " + res.error);
                                                }}
                                                className="btn glass-card"
                                                style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}
                                            >
                                                <i className={`fa-solid ${authSyncing ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`}></i> Sync
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => userApplication.status === 'approved' ? navigate(`/business-portal?bizId=${userApplication.bizId}`) : setShowEditor(true)} 
                                            className="btn btn-primary"
                                            style={{ background: userApplication.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 'var(--accent-primary)', color: userApplication.status === 'approved' ? '#22c55e' : '#fff', border: userApplication.status === 'approved' ? '1px solid rgba(34, 197, 94, 0.2)' : 'none' }}
                                        >
                                            <i className={`fa-solid ${userApplication.status === 'approved' ? 'fa-gauge-high' : 'fa-pen-nib'}`}></i>
                                            {userApplication.status === 'approved' ? ' Open Portal' : ' Edit Draft'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>Application Guidelines</h4>
                                    <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                                        <li>Ensure your <strong>Purpose Statement</strong> reflects your social or environmental impact.</li>
                                        <li>Your <strong>Founder Story</strong> is what connects consumers to your convictions.</li>
                                        <li>Once submitted, a Customer Success member will claim your application to start the onboarding handshake.</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'my-business' && (
                    <div className="slide-up">
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {myBusinesses.map(biz => (
                                <BusinessManagementSuite 
                                    key={biz.id} 
                                    business={biz} 
                                    onRefresh={fetchMyBusinesses}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'cs' && (
                    <OnboardingHub />
                )}
            </div>

            {/* Modal Editor Overlay */}
            {showEditor && userApplication && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(12px)' }}>
                    <div className="slide-up" style={{ width: '100%', maxWidth: '750px' }}>
                        <ApplicationEditor 
                            application={userApplication} 
                            onClose={() => setShowEditor(false)} 
                            onSave={handleUpdateApplication} 
                            isSaving={isActioning}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const BusinessManagementSuite = ({ business, onRefresh }) => {
    const navigate = useNavigate();
    const { currentUser, getStewardshipLevel } = useAuth();
    const [showEditor, setShowEditor] = useState(false);
    const [showCrewManager, setShowCrewManager] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const stewardship = getStewardshipLevel(business);
    const canManage = stewardship === 'founder' || stewardship === 'manager' || currentUser?.isSuperAdmin;
    const canEdit = stewardship === 'founder' || currentUser?.isSuperAdmin;

    const handleUpdate = async (updatedData) => {
        setIsSaving(true);
        try {
            await db.collection('businesses').doc(business.id).update({
                ...updatedData,
                updatedAt: new Date().toISOString()
            });
            setShowEditor(false);
            onRefresh();
            alert("Business identity updated successfully.");
        } catch (err) {
            alert("Update failed: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>{business.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{business.industry} • {business.location || 'Remote'}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-secondary)' }}>
                            Role: {stewardship?.toUpperCase()}
                        </span>
                        {business.isVerified && (
                            <span style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '10px', color: '#22c55e' }}>
                                <i className="fa-solid fa-certificate"></i> VERIFIED
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {canEdit && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setShowCrewManager(true)} className="btn btn-secondary">
                                <i className="fa-solid fa-users-gear"></i> Manage Crew
                            </button>
                            <button onClick={() => setShowEditor(true)} className="btn btn-secondary">
                                <i className="fa-solid fa-pen-to-square"></i> Edit Identity
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={() => navigate(`/business-portal?bizId=${business.id}`)} 
                        className="btn btn-primary feature-gradient"
                    >
                        <i className="fa-solid fa-gauge-high"></i> Operations Hub
                    </button>
                </div>
            </div>

            {canManage && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{business.checkinsCount || 0}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Visitors</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffb84d' }}>{business.purchasesCount || 0}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Supporters</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-success)' }}>RM {(business.purchaseVolume || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Impact Volume</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-primary)' }}>{business.stewardship?.crew?.length || 0}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Crew Members</div>
                    </div>
                </div>
            )}

            {showEditor && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(15px)' }}>
                    <div className="slide-up" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <ApplicationEditor 
                            application={business} 
                            onClose={() => setShowEditor(false)} 
                            onSave={handleUpdate} 
                            isSaving={isSaving}
                            isLiveBusiness={true}
                        />
                    </div>
                </div>
            )}

            {showCrewManager && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(15px)' }}>
                    <CrewManager 
                        business={business} 
                        onClose={() => setShowCrewManager(false)} 
                        onUpdate={() => {
                            onRefresh();
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default MerchantPortal;
