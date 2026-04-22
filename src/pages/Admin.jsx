import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useBusinesses from '../hooks/useBusinesses';
import { db } from '../services/firebase';
import { QRCodeCanvas } from 'qrcode.react';
import { drawStandee } from '../utils/assetUtils';
import { useAuth } from '../contexts/AuthContext';
import firebase from 'firebase/compat/app';

/**
 * FUTURE ROADMAP:
 * Automated POS CSV bulk uploads are planned for future phases to streamline receipt verification.
 * Currently, the system relies on manual cross-referencing against merchant POS exports.
 */
const Admin = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { businesses, loading } = useBusinesses();
    const [networkStats, setNetworkStats] = useState({ checkins: 0, purchases: 0 });
    const [showOnboard, setShowOnboard] = useState(false);
    const [newBiz, setNewBiz] = useState({ id: '', name: '', industry: 'F&B', location: '', founder: '', ownerEmail: '' });
    const [editingBiz, setEditingBiz] = useState(null);

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
            const batch = db.batch();
            const bizRef = db.collection('businesses').doc(newBiz.id);
            
            batch.set(bizRef, {
                ...newBiz,
                status: 'active',
                isVerified: false,
                membershipType: 'affiliate', // Default to affiliate until scored
                checkinsCount: 0,
                purchasesCount: 0,
                purchaseVolume: 0,
                createdAt: new Date().toISOString()
            });

            // Update System Stats
            const statsRef = db.collection('system').doc('stats');
            batch.update(statsRef, {
                businesses: firebase.firestore.FieldValue.increment(1)
            });

            await batch.commit();
            setShowOnboard(false);
            setNewBiz({ id: '', name: '', industry: 'F&B', location: '', founder: '', ownerEmail: '' });
            alert("Merchant successfully onboarded!");
        } catch (err) {
            alert("Onboarding failed: " + err.message);
        }
    };

    const deleteBusiness = async (bizId, bizName) => {
        if (!currentUser?.isSuperAdmin) return;
        
        // Double confirmation for safety
        const confirm1 = window.confirm(`DANGER: Are you sure you want to PERMANENTLY DELETE "${bizName}"? This action cannot be undone.`);
        if (!confirm1) return;
        
        const confirm2 = window.prompt(`To confirm deletion, please type the business ID: "${bizId}"`);
        if (confirm2 !== bizId) return alert("ID mismatch. Deletion cancelled.");

        try {
            const batch = db.batch();
            batch.delete(db.collection('businesses').doc(bizId));
            
            // Decrement global stats
            const statsRef = db.collection('system').doc('stats');
            batch.update(statsRef, {
                businesses: firebase.firestore.FieldValue.increment(-1)
            });

            await batch.commit();
            alert("Business deleted successfully.");
        } catch (e) {
            alert("Deletion failed: " + e.message);
        }
    };

    const BusinessRow = ({ biz }) => {
        return (
            <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <h4 style={{ margin: 0, color: '#fff' }}>{biz.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0' }}>ID: {biz.id} | Founder: {biz.founder || 'N/A'}</p>
                    {biz.membershipType === 'affiliate' && <span style={{ fontSize: '0.65rem', background: 'rgba(255,184,77,0.1)', color: '#ffb84d', padding: '2px 6px', borderRadius: '4px' }}>Affiliate</span>}
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
                        title="Edit Governance"
                        className="filter-btn" 
                        style={{ padding: '0.5rem', background: 'rgba(255,184,77,0.1)', color: '#ffb84d' }}
                        onClick={() => setEditingBiz(biz)}
                    >
                        <i className="fa-solid fa-gear"></i>
                    </button>

                    <button 
                        title="Audited Stats"
                        className="filter-btn" 
                        style={{ padding: '0.5rem', background: 'rgba(76,175,80,0.1)', color: '#4caf50' }}
                        onClick={() => navigate('/audit-hub')}
                    >
                        <i className="fa-solid fa-clipboard-check"></i>
                    </button>

                    {currentUser?.isSuperAdmin && (
                        <button 
                            title="Delete Business"
                            className="filter-btn" 
                            style={{ padding: '0.5rem', background: 'rgba(255,87,87,0.1)', color: '#ff5757' }}
                            onClick={() => deleteBusiness(biz.id, biz.name)}
                        >
                            <i className="fa-solid fa-trash-can"></i>
                        </button>
                    )}
                </div>
            </div>
        );
    };


    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

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
            b.founder?.toLowerCase().includes(q)
        );
    }, [businesses, debouncedSearch]);

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Admin Header */}
            <button className="back-btn" onClick={() => navigate('/profile')} style={{ marginBottom: '1rem' }}>
                <i className="fa-solid fa-arrow-left"></i> Back to Profile
            </button>
            
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0 }}>Admin Portal</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage the Conviction Network</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                    <button className="icon-btn" title="Business Spreadsheet" style={{ color: 'var(--accent-success)', borderColor: 'rgba(16,185,129,0.3)' }}><i className="fa-solid fa-table-columns"></i></button>
                    <button className="icon-btn" title="Backup Database"><i className="fa-solid fa-download"></i></button>
                    <button className="icon-btn" title="Restore Database"><i className="fa-solid fa-upload"></i></button>
                    <button 
                        className="icon-btn" 
                        title="Reconcile Stats" 
                        onClick={async () => {
                            if (!window.confirm("Reconcile global statistics? This will recount all users, businesses, and transactions.")) return;
                            try {
                                const bizSnap = await db.collection('businesses').get();
                                const userSnap = await db.collection('users').get();
                                const transSnap = await db.collection('transactions').get();
                                
                                let checkins = 0; let purchases = 0; let volume = 0;
                                let totalRevenue = 0; let totalWaste = 0; let totalTrees = 0; let totalJobs = 0;

                                bizSnap.forEach(doc => {
                                    const biz = doc.data();
                                    if (biz.status !== 'expired') {
                                        totalJobs += (parseInt(biz.impactJobs) || 0);
                                        if (biz.yearlyAssessments) {
                                            const assessments = Object.values(biz.yearlyAssessments);
                                            let latestRev = 0; let latestWaste = 0; let latestTrees = 0;
                                            assessments.forEach(ya => {
                                                const rev = parseFloat(ya.revenue?.toString().replace(/,/g, '')) || 0;
                                                if (rev > latestRev) {
                                                    latestRev = rev;
                                                    latestWaste = parseFloat(ya.wasteKg?.toString().replace(/,/g, '')) || 0;
                                                    latestTrees = parseFloat(ya.treesPlanted?.toString().replace(/,/g, '')) || 0;
                                                }
                                            });
                                            totalRevenue += latestRev; totalWaste += latestWaste; totalTrees += latestTrees;
                                        }
                                    }
                                });

                                transSnap.forEach(doc => {
                                    const d = doc.data();
                                    if (d.type === 'checkin') checkins++;
                                    if (d.type === 'purchase') { purchases++; volume += (parseFloat(d.amount) || 0); }
                                });

                                await db.collection('system').doc('stats').set({
                                    consumers: userSnap.size,
                                    businesses: bizSnap.size,
                                    checkins,
                                    purchases,
                                    purchaseVolume: volume,
                                    totalWaste,
                                    totalTrees,
                                    totalFamilies: totalJobs
                                }, { merge: true });

                                alert("Statistics Reconciled!");
                                window.location.reload();
                            } catch (e) { alert("Reconciliation failed: " + e.message); }
                        }}
                    >
                        <i className="fa-solid fa-sync"></i>
                    </button>
                </div>
            </div>

            {/* Quick Registry Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-card feature-gradient" onClick={() => navigate('/audit-hub')} style={{ cursor: 'pointer', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <i className="fa-solid fa-user-check fa-2x" style={{ color: 'var(--accent-primary)' }}></i>
                    <div>
                        <h4 style={{ margin: 0 }}>Verification Hub</h4>
                        <p style={{ fontSize: '0.75rem', margin: 0 }}>Manage Audit Approvals</p>
                    </div>
                </div>
                <div style={{ background: 'rgba(255,184,77,0.05)', border: '1px dashed rgba(255,184,77,0.3)', borderRadius: '12px', padding: '1rem', gridColumn: 'span 2' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#ffb84d' }}>
                        <i className="fa-solid fa-circle-info"></i> <strong>Note:</strong> Purchase verification is exclusively handled by Business Owners via the Merchant Portal.
                    </p>
                </div>
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.7 }}>
                    <i className="fa-solid fa-clock-rotate-left fa-2x" style={{ color: 'var(--text-secondary)' }}></i>
                    <div>
                        <h4 style={{ margin: 0 }}>Audit Logs</h4>
                        <p style={{ fontSize: '0.75rem', margin: 0 }}>Platform History</p>
                    </div>
                </div>
            </div>

            {/* Merchant Database */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: '#fff' }}><i className="fa-solid fa-database" style={{ color: 'var(--accent-primary)' }}></i> Merchant Database</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Search and manage business profiles within the network.</p>
                
                <div style={{ marginBottom: '1rem' }}>
                    <input 
                        type="text" 
                        className="input-modern" 
                        placeholder="Search by business name or founder..." 
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
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#fff' }}><i className="fa-solid fa-plus-circle" style={{ color: 'var(--accent-success)' }}></i> Add New Business</h3>
                    <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setNewBiz({ id: '', name: '', industry: 'F&B', location: '', founder: '', ownerEmail: '' })}>Clear Form</button>
                </div>
                
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
                    <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                        <i className="fa-solid fa-plus"></i> Finalize Onboarding
                    </button>
                </form>
            </div>

            {/* Role Management Section */}
            <RoleManager />

            {/* Initiatives Management */}
            <InitiativesManager />

            {/* Governance Modal */}
            {editingBiz && <BusinessEditor biz={editingBiz} onClose={() => setEditingBiz(null)} />}
        </div>
    );
};

const BusinessEditor = ({ biz, onClose }) => {
    const [data, setData] = useState({
        score: biz.score || { s: '', e: '', c: '', soc: '', env: '' },
        status: biz.status || 'active',
        expiryReason: biz.expiryReason || '',
        impactJobs: biz.impactJobs || 0
    });

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const hasScore = data.score.s || data.score.e || data.score.c || data.score.soc || data.score.env;
            const membershipType = hasScore ? 'full' : 'affiliate';

            await db.collection('businesses').doc(biz.id).update({
                score: data.score,
                status: data.status,
                expiryReason: data.expiryReason,
                impactJobs: parseInt(data.impactJobs) || 0,
                membershipType
            });
            alert("Governance updated!");
            onClose();
        } catch (err) {
            alert("Save failed: " + err.message);
        }
    };

    return (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="glass-card slide-up" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Governance Editor: {biz.name}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ color: '#4CAF50', marginBottom: '0.8rem' }}><i className="fa-solid fa-clipboard-check"></i> TheBFG.Team Paradigm Score (A-D)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem' }}>
                            {[
                                { key: 's', label: 'Shareholder' },
                                { key: 'e', label: 'Employee' },
                                { key: 'c', label: 'Customer' },
                                { key: 'soc', label: 'Society' },
                                { key: 'env', label: 'Environment' }
                            ].map(field => (
                                <div key={field.key} className="form-group">
                                    <label style={{ fontSize: '0.7rem' }}>{field.label}</label>
                                    <select 
                                        className="input-modern" 
                                        value={data.score[field.key]} 
                                        onChange={e => setData({...data, score: {...data.score, [field.key]: e.target.value}})}
                                    >
                                        <option value="">-</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Verified Impact Jobs (Families Supported)</label>
                        <input type="number" className="input-modern" value={data.impactJobs} onChange={e => setData({...data, impactJobs: e.target.value})} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                        <div className="form-group">
                            <label>Status</label>
                            <select className="input-modern" value={data.status} onChange={e => setData({...data, status: e.target.value})}>
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="on-hold">On-Hold</option>
                            </select>
                        </div>
                        {data.status === 'expired' && (
                            <div className="form-group">
                                <label>Expiry Reason</label>
                                <input type="text" className="input-modern" value={data.expiryReason} onChange={e => setData({...data, expiryReason: e.target.value})} placeholder="e.g. Non-compliance" />
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="nav-btn active" style={{ flex: 1, justifyContent: 'center' }}>Save Governance</button>
                        <button type="button" onClick={onClose} className="nav-btn" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InitiativesManager = () => {
    const [inits, setInits] = useState([]);
    const [newInit, setNewInit] = useState({ title: '', narrative: '', mechanism: '' });

    useEffect(() => {
        const unsubscribe = db.collection('initiatives').onSnapshot(snap => {
            setInits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const saveInit = async (e) => {
        e.preventDefault();
        try {
            await db.collection('initiatives').add({
                ...newInit,
                createdAt: new Date().toISOString()
            });
            setNewInit({ title: '', narrative: '', mechanism: '' });
            alert("Initiative created!");
        } catch (e) { alert(e.message); }
    };

    return (
        <div className="glass-card mt-4">
            <h3><i className="fa-solid fa-hand-holding-heart" style={{color: 'var(--accent-primary)'}}></i> Initiatives Management</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                {inits.map(i => (
                    <div key={i.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontWeight: 'bold' }}>{i.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{i.narrative}</div>
                    </div>
                ))}
            </div>

            <form onSubmit={saveInit} style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="form-group">
                    <label>New Campaign Title</label>
                    <input type="text" className="input-modern" value={newInit.title} onChange={e => setNewInit({...newInit, title: e.target.value})} required />
                </div>
                <div className="form-group">
                    <label>Narrative</label>
                    <textarea className="input-modern" value={newInit.narrative} onChange={e => setNewInit({...newInit, narrative: e.target.value})} rows="2" />
                </div>
                <button type="submit" className="nav-btn active" style={{ marginTop: '1rem' }}>Create Initiative</button>
            </form>
        </div>
    );
};

const RoleManager = () => {
    const [email, setEmail] = useState('');
    const [roles, setRoles] = useState({ isAdmin: [], isAuditor: [] });
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

    useEffect(() => {
        const unsubscribe = db.collection('system').doc('roles').onSnapshot(doc => {
            if (doc.exists) setRoles(doc.data());
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdate = async (targetEmail, roleField, isRemoving = false) => {
        if (!targetEmail || !targetEmail.includes('@')) return alert("Enter a valid email.");
        
        const action = isRemoving ? 'remove' : 'assign';
        if (!window.confirm(`Are you sure you want to ${action} the ${roleField} role for ${targetEmail}?`)) return;

        try {
            const cleanEmail = targetEmail.trim().toLowerCase();
            
            // Verification logic as per User requirement
            const userCheck = await db.collection('users').where('email', '==', cleanEmail).get();
            if (userCheck.empty) {
                return alert(`Verification Failed: No user found with email ${cleanEmail}. Please ensure the user has registered on the platform first.`);
            }

            const currentList = roles[roleField] || [];
            let updatedList;
            
            if (isRemoving) {
                updatedList = currentList.filter(e => e !== cleanEmail);
            } else {
                if (currentList.includes(cleanEmail)) return alert("User already has this role.");
                updatedList = [...currentList, cleanEmail];
            }

            await db.collection('system').doc('roles').update({
                [roleField]: updatedList
            });

            // Notify user via newsreel if assigning
            if (!isRemoving) {
                await db.collection('announcements').add({
                    message: `Congratulations! You have been granted ${roleField} privileges. Access your new tools in the sidebar.`,
                    type: 'success',
                    status: 'active',
                    targetEmail: cleanEmail,
                    createdAt: new Date().toISOString()
                });
            }

            // Log the administrative action
            await db.collection('system').doc('audit_trail').collection('logs').add({
                action: `${action}_role`,
                target: cleanEmail,
                role: roleField,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                performedBy: currentUser?.email || 'Super Admin'
            });

            setEmail('');
            alert(`Identity Verified. Role ${isRemoving ? 'removed' : 'assigned'} successfully.`);
        } catch (e) {
            alert("Administrative update failed: " + e.message);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>;

    const RoleSection = ({ title, icon, color, roleField, emails, description }) => (
        <div className="glass-card" style={{ padding: '1.2rem', marginBottom: '1.5rem', borderLeft: `4px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className={`fa-solid ${icon}`} style={{ color }}></i>
                    <h4 style={{ margin: 0 }}>{title}</h4>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{description}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input 
                    type="email" 
                    className="input-modern" 
                    style={{ flex: 1 }} 
                    placeholder="Enter email to add..." 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdate(email, roleField, false)}
                />
                <button className="nav-btn active" style={{ background: color }} onClick={() => handleUpdate(email, roleField, false)}>
                    <i className="fa-solid fa-user-plus"></i> Add
                </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '0.8rem' }}>
                {emails.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No users assigned to this role.</p>
                ) : (
                    emails.map(e => (
                        <div key={e} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.85rem' }}>{e}</span>
                            {e !== 'jayshong@gmail.com' && (
                                <button 
                                    onClick={() => handleUpdate(e, roleField, true)} 
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
                                    title="Remove Role"
                                >
                                    <i className="fa-solid fa-trash-can"></i>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div style={{ marginTop: '2rem' }}>
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem' }}><i className="fa-solid fa-users-gear" style={{ color: 'var(--accent-primary)' }}></i> Role Management</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Only the Super Admin (<strong>jayshong@gmail.com</strong>) can assign and remove roles.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <RoleSection 
                    title="Admins" 
                    icon="fa-shield-halved" 
                    color="var(--primary)" 
                    roleField="isAdmin" 
                    emails={roles.isAdmin || []}
                    description="Can onboard and manage businesses"
                />
                <RoleSection 
                    title="Auditors" 
                    icon="fa-clipboard-check" 
                    color="var(--accent-success)" 
                    roleField="isAuditor" 
                    emails={roles.isAuditor || []}
                    description="Can verify and edit impact metrics"
                />
            </div>
        </div>
    );
};

export default Admin;
