import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import useBusinesses from '../hooks/useBusinesses';
import { PLATFORM_CONFIG } from '../config/platformConfig';

const AuditHub = () => {
    const { currentUser } = useAuth();
    const { businesses, loading: bizLoading } = useBusinesses();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'supervisor', 'auditor'

    useEffect(() => {
        if (!currentUser) return;

        let query = db.collection('audit_logs');

        if (currentUser.isSuperAdmin) {
            query = query.orderBy('createdAt', 'desc').limit(50);
        } else if (activeTab === 'supervisor') {
            query = query.where('supervisorEmail', '==', currentUser.email)
                         .where('status', '==', 'PENDING_APPROVAL');
        } else if (activeTab === 'auditor') {
            query = query.where('auditorEmail', '==', currentUser.email);
        }

        const unsubscribe = query.onSnapshot(snapshot => {
            const loaded = [];
            snapshot.forEach(doc => {
                loaded.push({ id: doc.id, ...doc.data() });
            });
            
            let filtered = loaded;
            if (!currentUser.isSuperAdmin && activeTab === 'auditor') {
                filtered = loaded.filter(l => ['SYSTEM_DRAFT', 'RETURNED', 'PUBLISHED'].includes(l.status));
            }

            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setLogs(filtered);
            setLoading(false);
        }, err => {
            console.error("Audit Hub Subscription failed:", err);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser, activeTab]);

    if (!currentUser?.isSuperAdmin && !currentUser?.isAuditor) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Unauthorized Access: Auditors & Admins Only</div>;
    }

    const myDrafts = logs.filter(l => l.auditorEmail === currentUser.email && (l.status === 'SYSTEM_DRAFT' || l.status === 'RETURNED'));
    const pendingForMe = logs.filter(l => {
        const isAssignedToMe = l.supervisorEmail === currentUser.email || (l.supervisorEmails && l.supervisorEmail === undefined && l.supervisorEmails.includes(currentUser.email));
        return isAssignedToMe && l.status === 'PENDING_APPROVAL';
    });

    const approveAudit = async (log) => {
        if (!window.confirm(`Approve and publish audit for ${log.bizName}?`)) return;
        try {
            await db.collection('audit_logs').doc(log.id).update({
                status: 'PUBLISHED',
                approvedAt: new Date().toISOString(),
                approvedBy: currentUser.email
            });
            await db.collection('businesses').doc(log.bizId).update({
                score: log.scores || log.score,
                isVerified: true,
                lastAuditDate: new Date().toISOString()
            });
            alert("Audit published successfully.");
        } catch (e) {
            alert("Approval failed: " + e.message);
        }
    };

    const rejectAudit = async (log) => {
        const comment = window.prompt("Enter rejection comment / feedback for the auditor:");
        if (!comment) return;
        try {
            await db.collection('audit_logs').doc(log.id).update({
                status: 'RETURNED',
                rejectionComment: comment,
                rejectedBy: currentUser.email,
                rejectedAt: new Date().toISOString()
            });
            alert("Audit returned to auditor.");
        } catch (e) {
            alert("Rejection failed: " + e.message);
        }
    };

    const submitToSupervisor = async (log, summary, supervisor) => {
        if (!summary) return alert("Please provide a public summary.");
        try {
            await db.collection('audit_logs').doc(log.id).update({
                publicSummary: summary,
                supervisorEmail: supervisor,
                status: 'PENDING_APPROVAL',
                submittedAt: new Date().toISOString()
            });
            alert("Submitted for review.");
        } catch (e) {
            alert("Submission failed: " + e.message);
        }
    };

    const initiateAudit = (biz) => {
        const scores = prompt("Enter initial BFG Paradigm scores (e.g. ABABA):", biz.score || 'CCCCC');
        if (!scores) return;
        
        db.collection('audit_logs').add({
            bizId: biz.id,
            bizName: biz.name,
            auditorEmail: currentUser.email,
            status: 'SYSTEM_DRAFT',
            scores: scores,
            createdAt: new Date().toISOString()
        }).then(() => {
            setActiveTab('auditor');
            alert("Audit draft created.");
        });
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="page-header" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fa-solid fa-clipboard-check fa-2x" style={{ color: 'var(--color-compliance)' }}></i>
                    <div>
                        <h2 style={{ margin: 0 }}>Verification Hub</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ISO53001 Compliance & Business Scoring</p>
                    </div>
                </div>
                <button onClick={() => window.history.back()} className="filter-btn" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
                    <i className="fa-solid fa-arrow-left"></i> Back
                </button>
            </div>

            <div className="stats-grid" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                <div 
                    className={`stat-card glass-card ${activeTab === 'inventory' ? 'active-border' : ''}`} 
                    onClick={() => setActiveTab('inventory')}
                    style={{ cursor: 'pointer', borderLeft: '4px solid #3b82f6' }}
                >
                    <h3>{businesses.length}</h3>
                    <p>Network Inventory</p>
                </div>
                <div 
                    className={`stat-card glass-card ${activeTab === 'auditor' ? 'active-border' : ''}`} 
                    onClick={() => setActiveTab('auditor')}
                    style={{ cursor: 'pointer', borderLeft: '4px solid var(--color-compliance)' }}
                >
                    <h3>{myDrafts.length}</h3>
                    <p>My Active Audits</p>
                </div>
                <div 
                    className={`stat-card glass-card ${activeTab === 'supervisor' ? 'active-border' : ''}`} 
                    onClick={() => setActiveTab('supervisor')}
                    style={{ cursor: 'pointer', borderLeft: '4px solid var(--accent-primary)' }}
                >
                    <h3>{pendingForMe.length}</h3>
                    <p>Supervisor Queue</p>
                </div>
            </div>

            <div className="slide-up">
                {activeTab === 'inventory' && (
                    <>
                        <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-store"></i> All Businesses</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {businesses.map(biz => (
                                <div key={biz.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0 }}>{biz.name}</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{biz.industry} • {biz.location}</p>
                                        <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', letterSpacing: '2px', color: 'var(--primary-light)' }}>
                                            {biz.score || 'PENDING'}
                                        </div>
                                    </div>
                                    <button onClick={() => initiateAudit(biz)} className="btn btn-primary" style={{ fontSize: '0.7rem', width: 'auto', padding: '0.5rem 1rem' }}>
                                        Initiate Audit
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'supervisor' && (
                    <>
                        <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-user-check"></i> Pending Approvals</h3>
                        {pendingForMe.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Queue is clear.</p>
                        ) : (
                            pendingForMe.map(log => (
                                <div key={log.id} className="glass-card mt-3" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h4 style={{ margin: 0 }}>{log.bizName}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scores: {log.scores}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => approveAudit(log)} className="btn-icon" title="Approve"><i className="fa-solid fa-check" style={{color: 'var(--color-compliance)'}}></i></button>
                                            <button onClick={() => rejectAudit(log)} className="btn-icon" title="Reject"><i className="fa-solid fa-xmark" style={{color: '#f44336'}}></i></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'auditor' && (
                    <>
                        <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-pen-nib"></i> My Action Items</h3>
                        {myDrafts.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>No active drafts.</p>
                        ) : (
                            myDrafts.map(log => (
                                <div key={log.id} className="glass-card mt-3">
                                    <h4 style={{ margin: 0 }}>{log.bizName}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status: {log.status}</p>
                                    <div style={{ marginTop: '1rem' }}>
                                        <textarea 
                                            id={`sum-${log.id}`} 
                                            className="input-modern" 
                                            placeholder="Audit Summary..." 
                                            defaultValue={log.publicSummary}
                                            style={{ marginBottom: '0.5rem' }}
                                        />
                                        <button 
                                            className="nav-btn active" 
                                            style={{ width: '100%', justifyContent: 'center' }}
                                            onClick={() => submitToSupervisor(log, document.getElementById(`sum-${log.id}`).value, PLATFORM_CONFIG.DEFAULT_SUPERVISORS[0])}
                                        >
                                            Submit for Verification
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AuditHub;
