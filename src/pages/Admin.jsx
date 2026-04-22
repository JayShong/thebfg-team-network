import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, functions } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Admin Portal (Governance)
 * RESERVED for Superadmins only.
 * Focused on Network Governance, Role Management, and Global Initiatives.
 */
const Admin = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [networkStats, setNetworkStats] = useState({ consumers: 0, businesses: 0, checkins: 0, purchases: 0 });

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

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <button className="back-btn" onClick={() => navigate('/profile')} style={{ marginBottom: '1rem' }}>
                <i className="fa-solid fa-arrow-left"></i> Back to Profile
            </button>
            
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0 }}>Governance Portal</h1>
                <p style={{ color: 'var(--text-secondary)' }}>High-Level Network Management</p>
            </div>

            {/* Network Health Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{networkStats.consumers}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Members</div>
                </div>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>{networkStats.businesses}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Businesses</div>
                </div>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffb84d' }}>RM {(networkStats.purchaseVolume || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Network Volume</div>
                </div>
            </div>

            {/* Role Management Section */}
            <RoleManager />

            {/* Sentinel Governance: Flagged Identities */}
            <FlaggedIdentities />

            {/* Initiatives Management */}
            <InitiativesManager />
        </div>
    );
};

const FlaggedIdentities = () => {
    const [flaggedUsers, setFlaggedUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = db.collection('users')
            .where('isFlagged', '==', true)
            .onSnapshot(snap => {
                setFlaggedUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const handleAction = async (userId, actionType) => {
        try {
            setLoading(true);
            const fnName = actionType === 'clear' ? 'clearidentityflag' : 'resetlockout';
            const sentinelFn = functions.httpsCallable(fnName);
            await sentinelFn({ targetUserId: userId });
            alert(`Identity updated successfully.`);
        } catch (e) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    if (flaggedUsers.length === 0) return null;

    return (
        <div className="glass-card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '1rem' }}><i className="fa-solid fa-triangle-exclamation"></i> Sentinel: Flagged Identities</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Users flagged for automated rule violations. Only you can clear these flags.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {flaggedUsers.map(user => (
                    <div key={user.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{user.nickname || user.name || user.email}</div>
                            <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>Reason: {user.flagReason || 'Suspicious Activity'}</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>UID: {user.id}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleAction(user.id, 'reset')} className="filter-btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>Reset Lockout</button>
                            <button onClick={() => handleAction(user.id, 'clear')} className="filter-btn" style={{ background: '#ef4444', color: '#fff', border: 'none', fontSize: '0.75rem' }}>Clear Identity</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RoleManager = () => {
    const [email, setEmail] = useState('');
    const [merchantEmails, setMerchantEmails] = useState([]);
    const [complianceEmails, setComplianceEmails] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubMerchant = db.doc('system/merchant_roles').onSnapshot(doc => {
            if (doc.exists) setMerchantEmails(doc.data().emails || []);
            setLoading(false);
        });

        const unsubCompliance = db.doc('system/compliance_roles').onSnapshot(doc => {
            if (doc.exists) setComplianceEmails(doc.data().emails || []);
        });

        return () => { unsubMerchant(); unsubCompliance(); };
    }, []);

    const handleUpdate = async (targetEmail, roleType, isRemoving = false) => {
        if (!targetEmail || !targetEmail.includes('@')) return alert("Enter a valid email.");
        const action = isRemoving ? 'remove' : 'assign';
        
        try {
            setLoading(true);
            const manageRoleFn = functions.httpsCallable('managerole');
            const result = await manageRoleFn({ targetEmail, roleType, action });
            if (result.data.success) {
                alert("Role updated successfully.");
                setEmail('');
            }
        } catch (e) {
            alert(e.message || "Failed to update role.");
        } finally {
            setLoading(false);
        }
    };

    const RoleSection = ({ title, icon, color, roleType, emails }) => (
        <div className="glass-card" style={{ padding: '1.2rem', marginBottom: '1.5rem', borderLeft: `4px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <i className={`fa-solid ${icon}`} style={{ color }}></i>
                <h4 style={{ margin: 0 }}>{title}</h4>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input type="email" className="input-modern" style={{ flex: 1 }} placeholder="Assign email..." value={email} onChange={e => setEmail(e.target.value)} />
                <button className="nav-btn active" style={{ background: color }} onClick={() => handleUpdate(email, roleType, false)}>Add</button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '0.8rem' }}>
                {emails.map(e => (
                    <div key={e} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.85rem' }}>{e}</span>
                        {e !== 'jayshong@gmail.com' && (
                            <button onClick={() => handleUpdate(e, roleType, true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
                                <i className="fa-solid fa-trash-can"></i>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}><i className="fa-solid fa-users-gear" style={{ color: 'var(--accent-primary)' }}></i> Staff Management</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <RoleSection title="Merchant Assistants" icon="fa-user-tag" color="var(--primary)" roleType="merchant" emails={merchantEmails} />
                <RoleSection title="Auditors & Supervisors" icon="fa-shield-halved" color="var(--accent-success)" roleType="compliance" emails={complianceEmails} />
            </div>
        </div>
    );
};

const InitiativesManager = () => {
    const [inits, setInits] = useState([]);
    const [newInit, setNewInit] = useState({ title: '', narrative: '' });

    useEffect(() => {
        const unsubscribe = db.collection('initiatives').onSnapshot(snap => {
            setInits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const saveInit = async (e) => {
        e.preventDefault();
        try {
            await db.collection('initiatives').add({ ...newInit, createdAt: new Date().toISOString() });
            setNewInit({ title: '', narrative: '' });
            alert("Initiative created!");
        } catch (e) { alert(e.message); }
    };

    return (
        <div className="glass-card">
            <h3><i className="fa-solid fa-hand-holding-heart" style={{color: 'var(--accent-primary)'}}></i> Network Initiatives</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {inits.map(i => (
                    <div key={i.id} style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{i.title}</div>
                    </div>
                ))}
            </div>
            <form onSubmit={saveInit} style={{ marginTop: '1.5rem' }}>
                <input type="text" className="input-modern" placeholder="New Initiative Title" value={newInit.title} onChange={e => setNewInit({...newInit, title: e.target.value})} required />
                <button type="submit" className="nav-btn active" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>Publish Initiative</button>
            </form>
        </div>
    );
};

export default Admin;
