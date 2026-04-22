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

    const BusinessRow = ({ biz }) => {
        return (
            <div style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <h4 style={{ margin: 0, color: '#fff' }}>{biz.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0' }}>ID: {biz.id} | Founder: {biz.founder || 'N/A'}</p>
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
                        title="Edit Details"
                        className="filter-btn" 
                        style={{ padding: '0.5rem', background: 'rgba(255,184,77,0.1)', color: '#ffb84d' }}
                        onClick={() => navigate(`/business-portal?edit=${biz.id}`)}
                    >
                        <i className="fa-solid fa-pen-to-square"></i>
                    </button>

                    <button 
                        title="Audited Stats"
                        className="filter-btn" 
                        style={{ padding: '0.5rem', background: 'rgba(76,175,80,0.1)', color: '#4caf50' }}
                        onClick={() => navigate('/audit-hub')}
                    >
                        <i className="fa-solid fa-clipboard-check"></i>
                    </button>
                </div>
            </div>
        );
    };


    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-shield-halved fa-2x" style={{color: 'var(--primary)'}}></i>
                    <h2 style={{ margin: 0 }}>Master Control</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {currentUser?.isSuperAdmin && (
                        <>
                            <button 
                                onClick={async () => {
                                    const { PLATFORM_CONFIG } = await import('../config/platformConfig');
                                    if (!window.confirm("Reconcile global statistics? This will recount all users, businesses, and transactions.")) return;
                                    try {
                                        const bizSnap = await db.collection('businesses').get();
                                        const userSnap = await db.collection('users').get();
                                        const transSnap = await db.collection('transactions').get();
                                        
                                        let checkins = 0;
                                        let purchases = 0;
                                        let volume = 0;
                                        let totalRevenue = 0;

                                        bizSnap.forEach(doc => {
                                            const biz = doc.data();
                                            if (biz.status !== 'expired' && biz.yearlyAssessments) {
                                                let latestRev = 0;
                                                const assessments = Array.isArray(biz.yearlyAssessments) ? biz.yearlyAssessments : Object.values(biz.yearlyAssessments);
                                                assessments.forEach(ya => {
                                                    const rev = parseFloat(ya.revenue?.toString().replace(/,/g, '')) || 0;
                                                    if (rev > latestRev) latestRev = rev;
                                                });
                                                totalRevenue += latestRev;
                                            }
                                        });

                                        transSnap.forEach(doc => {
                                            const d = doc.data();
                                            if (d.type === 'checkin') checkins++;
                                            if (d.type === 'purchase') { purchases++; volume += (parseFloat(d.amount) || 0); }
                                        });

                                        const penetration = (totalRevenue / PLATFORM_CONFIG.NOMINAL_GDP_MY_RM) * 100;

                                        await db.collection('system').doc('stats').set({
                                            consumers: userSnap.size,
                                            businesses: bizSnap.size,
                                            checkins: checkins,
                                            purchases: purchases,
                                            purchaseVolume: volume,
                                            gdpPenetration: penetration.toFixed(10) + '%'
                                        }, { merge: true });

                                        alert("Statistics Reconciled!");
                                        window.location.reload();
                                    } catch (e) {
                                        alert("Reconciliation failed: " + e.message);
                                    }
                                }}
                                className="nav-btn" 
                                style={{ fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}
                            >
                                <i className="fa-solid fa-sync"></i> Reconcile Stats
                            </button>
                            <RoleManager />
                        </>
                    )}
                    <button onClick={() => setShowOnboard(!showOnboard)} className="nav-btn active" style={{ fontSize: '0.85rem' }}>
                        <i className="fa-solid fa-plus-circle"></i> Onboard Merchant
                    </button>
                </div>
            </div>

            {showOnboard && (
                <div className="glass-card slide-up mt-4" style={{ border: '1px solid var(--primary-glow)' }}>
                    <h3>Register New Business</h3>
                    <form onSubmit={onboardMerchant} style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Business Name</label>
                            <input type="text" className="input-modern" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Unique ID (Slug)</label>
                            <input type="text" className="input-modern" placeholder="e.g. Morning Mist Coffee" value={newBiz.id} onChange={e => setNewBiz({...newBiz, id: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Industry</label>
                            <input type="text" className="input-modern" value={newBiz.industry} onChange={e => setNewBiz({...newBiz, industry: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <input type="text" className="input-modern" value={newBiz.location} onChange={e => setNewBiz({...newBiz, location: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Founder Name</label>
                            <input type="text" className="input-modern" value={newBiz.founder} onChange={e => setNewBiz({...newBiz, founder: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Owner Email</label>
                            <input type="email" className="input-modern" value={newBiz.ownerEmail} onChange={e => setNewBiz({...newBiz, ownerEmail: e.target.value})} />
                        </div>
                        <div className="form-actions" style={{ gridColumn: 'span 2', marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="nav-btn active" style={{ flex: 1, justifyContent: 'center' }}>Finalize Onboarding</button>
                            <button type="button" onClick={() => setShowOnboard(false)} className="nav-btn" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="stats-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="stat-card glass-card" style={{ textAlign: 'center' }}>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>{networkStats.checkins || 0}</div>
                    <div className="stat-label">Network Check-ins Received</div>
                </div>
                <div className="stat-card glass-card" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className="stat-value" style={{ color: '#ffb84d' }}>{networkStats.purchases || 0}</div>
                        <div style={{ fontSize: '1rem', color: '#ffb84d', fontWeight: 'bold' }}>RM {(networkStats.purchaseVolume || 0).toLocaleString()}</div>
                    </div>
                    <div className="stat-label">Purchases from the Network</div>
                </div>
            </div>

            <div className="glass-card slide-up" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>Merchant Roster</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{businesses.length} Active Businesses</span>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {businesses.map(biz => <BusinessRow key={biz.id} biz={biz} />)}
                    </div>
                )}
            </div>

        </div>
    );
};

const RoleManager = () => {
    const [email, setEmail] = useState('');
    const [roles, setRoles] = useState({ isAdmin: [], isAuditor: [] });
    const [userRegistry, setUserRegistry] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = db.collection('system').doc('roles').onSnapshot(doc => {
            if (doc.exists) setRoles(doc.data());
            setLoading(false);
        });
        
        // Fetch all users for the registry lookup
        const fetchUsers = async () => {
            try {
                const snap = await db.collection('users').limit(100).get();
                setUserRegistry(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.warn("Failed to fetch user registry");
            }
        };
        fetchUsers();

        return () => unsubscribe();
    }, []);

    const handleUpdate = async (targetEmail, roleField, isRemoving = false) => {
        if (!targetEmail || !targetEmail.includes('@')) return alert("Enter a valid email.");
        
        const action = isRemoving ? 'remove' : 'assign';
        if (!window.confirm(`Are you sure you want to ${action} the ${roleField} role for ${targetEmail}?`)) return;

        try {
            const cleanEmail = targetEmail.trim().toLowerCase();
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

            // Log the administrative action
            await db.collection('system').doc('audit_trail').collection('logs').add({
                action: `${action}_role`,
                target: cleanEmail,
                role: roleField,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                performedBy: 'Super Admin'
            });

            setEmail('');
            alert(`Role ${isRemoving ? 'removed' : 'assigned'} successfully.`);
        } catch (e) {
            alert("Role update failed: " + e.message);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '1rem' }}><i className="fa-solid fa-spinner fa-spin"></i></div>;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                <i className="fa-solid fa-users-gear fa-lg" style={{ color: 'var(--primary)' }}></i>
                <h3 style={{ margin: 0 }}>Identity & Access Management</h3>
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

            {/* Quick User Registry (Commercial Grade) */}
            <div className="glass-card mt-4" style={{ padding: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}><i className="fa-solid fa-address-book"></i> User Registry Lookup</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem' }}>
                    {userRegistry.map(u => (
                        <div 
                            key={u.id} 
                            onClick={() => setEmail(u.email)}
                            style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid transparent' }}
                            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                            onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || u.nickname || 'Unknown'}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{u.email}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Admin;
