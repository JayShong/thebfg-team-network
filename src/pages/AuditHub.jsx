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
    const [activeTab, setActiveTab] = useState('supervisor'); // 'supervisor', 'auditor'

    useEffect(() => {
        // Use the legacy collection name
        const unsubscribe = db.collection('audit_logs')
            .onSnapshot(snapshot => {
                const loaded = [];
                snapshot.forEach(doc => {
                    loaded.push({ id: doc.id, ...doc.data() });
                });
                // Sort by date locally matching legacy app.js:4007
                loaded.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setLogs(loaded);
                setLoading(false);
            });
        return unsubscribe;
    }, []);

    // Authorization Guard
    if (!currentUser?.isSuperAdmin && !currentUser?.isAuditor) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Unauthorized Access</div>;
    }

    // Filter logic matching legacy app.js:4009-4010
    const myDrafts = logs.filter(l => l.auditorEmail === currentUser.email && (l.status === 'SYSTEM_DRAFT' || l.status === 'RETURNED'));
    const pendingForMe = logs.filter(l => {
        const isAssignedToMe = l.supervisorEmail === currentUser.email || (l.supervisorEmails && l.supervisorEmail === undefined && l.supervisorEmails.includes(currentUser.email));
        return isAssignedToMe && l.status === 'PENDING_APPROVAL';
    });

    const approveAudit = async (log) => {
        if (!window.confirm(`Approve and publish audit for ${log.bizName}?`)) return;
        try {
            // 1. Update the log status
            await db.collection('audit_logs').doc(log.id).update({
                status: 'PUBLISHED',
                approvedAt: new Date().toISOString(),
                approvedBy: currentUser.email
            });

            // 2. Reflect on business doc matching legacy app.js:143
            await db.collection('businesses').doc(log.bizId).update({
                score: log.scores || log.score,
                yearlyAssessments: log.yearlyAssessments || [],
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

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="page-header" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fa-solid fa-clipboard-check fa-2x" style={{ color: '#4caf50' }}></i>
                <div>
                    <h2 style={{ margin: 0 }}>Verification Hub</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ISO53001 Compliance Workflow</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                        <i className="fa-solid fa-circle-info"></i> The actual auditing process occurs off-platform. This dashboard monitors milestones and publishing.
                    </p>
                </div>
            </div>

            <div className="stats-grid" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                <div 
                    className={`stat-card glass-card ${activeTab === 'auditor' ? 'active-border' : ''}`} 
                    onClick={() => setActiveTab('auditor')}
                    style={{ cursor: 'pointer', borderLeft: '4px solid #81C784' }}
                >
                    <h3>{myDrafts.length}</h3>
                    <p>My Action Items</p>
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

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <p style={{ marginTop: '1rem' }}>Sychronizing verification logs...</p>
                </div>
            ) : (
                <div className="slide-up">
                    {activeTab === 'supervisor' ? (
                        <>
                            <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-user-check"></i> Approvals Assigned to Me</h3>
                            {pendingForMe.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>No logs currently awaiting your authorization.</p>
                            ) : (
                                pendingForMe.map(log => (
                                    <div key={log.id} className="glass-card mt-3" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ margin: 0 }}>{log.bizName}</h4>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Auditor: {log.auditorEmail}</p>
                                            </div>
                                            <span className="tier-badge" style={{ 
                                                background: log.status === 'VERIFICATION_STARTED' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.2)', 
                                                color: log.status === 'VERIFICATION_STARTED' ? '#F59E0B' : 'var(--accent-primary)' 
                                            }}>
                                                {log.status === 'VERIFICATION_STARTED' ? 'Audit in Progress' : 'Pending Approval'}
                                            </span>
                                        </div>
                                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <p style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Public Summary:</p>
                                            <p style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>"{log.publicSummary}"</p>
                                            <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.8rem 0' }} />
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Details: {log.details || 'Baseline Assessment'}</p>
                                        </div>
                                        <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.5rem' }}>
                                            <button className="nav-btn active" style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-success)' }} onClick={() => approveAudit(log)}>
                                                Approve & Publish
                                            </button>
                                            <button className="nav-btn" style={{ flex: 1, justifyContent: 'center', background: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid #f4433633' }} onClick={() => rejectAudit(log)}>
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    ) : (
                        <>
                            <h3 style={{ marginBottom: '1rem' }}><i className="fa-solid fa-pen-nib"></i> My Action Items</h3>
                            {myDrafts.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>You have no active drafts or returned items.</p>
                            ) : (
                                myDrafts.map(log => {
                                    const isReturned = log.status === 'RETURNED';
                                    return (
                                        <div key={log.id} className="glass-card mt-3" style={{ borderLeft: `4px solid ${isReturned ? '#ffb84d' : '#81C784'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div>
                                                    <h4 style={{ margin: 0 }}>{log.bizName}</h4>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Created: {new Date(log.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <span className="tier-badge" style={{ background: isReturned ? 'rgba(255,184,77,0.1)' : 'rgba(129,199,132,0.1)', color: isReturned ? '#ffb84d' : '#81C784' }}>{log.status}</span>
                                            </div>
                                            
                                            {isReturned && (
                                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(244,67,54,0.05)', borderRadius: '8px', border: '1px solid rgba(244,67,54,0.2)' }}>
                                                    <p style={{ color: '#ffb84d', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.3rem' }}>Rejection Comment from {log.rejectedBy}:</p>
                                                    <p style={{ fontSize: '0.9rem' }}>{log.rejectionComment}</p>
                                                </div>
                                            )}

                                            <div style={{ marginTop: '1.2rem' }}>
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Public Summary (Compliance Timeline Narrative)</label>
                                                <textarea 
                                                    id={`summary-${log.id}`} 
                                                    className="input-modern" 
                                                    rows="2" 
                                                    defaultValue={log.publicSummary || ''} 
                                                    style={{ width: '100%', marginBottom: '1rem' }}
                                                    placeholder="A human-readable explanation of why this audit was performed..."
                                                ></textarea>
                                                
                                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Select Supervisor</label>
                                                <select id={`sup-${log.id}`} className="input-modern" style={{ width: '100%', marginBottom: '1rem' }}>
                                                    {(log.supervisorEmails || PLATFORM_CONFIG.DEFAULT_SUPERVISORS).map(email => (
                                                        <option key={email} value={email}>{email}</option>
                                                    ))}
                                                </select>

                                                <button 
                                                    className="nav-btn active" 
                                                    style={{ width: '100%', justifyContent: 'center' }}
                                                    onClick={() => {
                                                        const sum = document.getElementById(`summary-${log.id}`).value;
                                                        const sup = document.getElementById(`sup-${log.id}`).value;
                                                        submitToSupervisor(log, sum, sup);
                                                    }}
                                                >
                                                    Submit for Verification
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AuditHub;
