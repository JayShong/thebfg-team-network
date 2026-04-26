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
    
    // Task 4: New state for structured audit
    const [selectedBiz, setSelectedBiz] = useState(null);
    const [showInitiateModal, setShowInitiateModal] = useState(false);
    const [auditScores, setAuditScores] = useState({ s: 'C', e: 'C', c: 'C', soc: 'C', env: 'C' });

    const PILLARS = [
        { id: 's', label: 'Shareholders', icon: 'fa-gem' },
        { id: 'e', label: 'Employees', icon: 'fa-people-carry-box' },
        { id: 'c', label: 'Customers', icon: 'fa-handshake' },
        { id: 'soc', label: 'Society', icon: 'fa-earth-asia' },
        { id: 'env', label: 'Natural Environment', icon: 'fa-leaf' }
    ];

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
            
            // Ensure we handle both string and object scores
            const finalScore = log.scores || log.score;
            
            await db.collection('businesses').doc(log.bizId).update({
                score: finalScore,
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

    const submitToSupervisor = async (log, summary, pillarComments, checklist, supervisor) => {
        if (!summary) return alert("Please provide a public summary.");
        try {
            await db.collection('audit_logs').doc(log.id).update({
                publicSummary: summary,
                pillarCommentary: pillarComments,
                verificationChecklist: checklist,
                supervisorEmail: supervisor,
                status: 'PENDING_APPROVAL',
                submittedAt: new Date().toISOString(),
                // Sync scores in case they changed in the draft UI
                scores: log.scores
            });
            alert("Submitted for review.");
        } catch (e) {
            alert("Submission failed: " + e.message);
        }
    };

    const initiateAudit = (biz) => {
        setSelectedBiz(biz);
        // Default to C if no score exists
        const baseScore = typeof biz.score === 'object' ? biz.score : { s: 'C', e: 'C', c: 'C', soc: 'C', env: 'C' };
        setAuditScores(baseScore);
        setShowInitiateModal(true);
    };

    const confirmInitiate = async () => {
        if (!selectedBiz) return;
        try {
            await db.collection('audit_logs').add({
                bizId: selectedBiz.id,
                bizName: selectedBiz.name,
                auditorEmail: currentUser.email,
                status: 'SYSTEM_DRAFT',
                scores: auditScores,
                createdAt: new Date().toISOString()
            });
            setShowInitiateModal(false);
            setActiveTab('auditor');
            alert("Audit draft created.");
        } catch (e) {
            alert("Failed to initiate: " + e.message);
        }
    };

    const GradeSelector = ({ currentScores, onSelect, pillarId }) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['A', 'B', 'C', 'D'].map(grade => (
                <button
                    key={grade}
                    onClick={() => onSelect(pillarId, grade)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: currentScores[pillarId] === grade ? 'var(--color-compliance)' : 'rgba(255,255,255,0.05)',
                        color: currentScores[pillarId] === grade ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '700'
                    }}
                >
                    {grade}
                </button>
            ))}
        </div>
    );

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
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scores: {JSON.stringify(log.scores)}</p>
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
                            myDrafts.map(log => {
                                // Local state for each draft to manage commentary and checklist
                                return <DraftEditor 
                                    key={log.id} 
                                    log={log} 
                                    PILLARS={PILLARS} 
                                    GradeSelector={GradeSelector} 
                                    onSubmit={submitToSupervisor}
                                    supervisors={PLATFORM_CONFIG.DEFAULT_SUPERVISORS}
                                />;
                            })
                        )}
                    </>
                )}
            </div>

            {/* Task 4a: Initiation Modal */}
            {showInitiateModal && (
                <div className="modal flex-center" style={{ display: 'flex', background: 'rgba(0,0,0,0.9)', zIndex: 1000 }}>
                    <div className="glass-card slide-up" style={{ maxWidth: '500px', width: '90%', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '0.5rem' }}>Initiate Audit</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{selectedBiz?.name} • {selectedBiz?.industry}</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            {PILLARS.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
                                        <i className={`fa-solid ${p.icon}`} style={{ color: 'var(--primary)', width: '20px' }}></i>
                                        {p.label}
                                    </div>
                                    <GradeSelector 
                                        currentScores={auditScores} 
                                        pillarId={p.id} 
                                        onSelect={(id, val) => setAuditScores(prev => ({ ...prev, [id]: val }))} 
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setShowInitiateModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={confirmInitiate} className="btn btn-primary" style={{ flex: 1 }}>Create Draft</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper component for structured draft editing
const DraftEditor = ({ log, PILLARS, GradeSelector, onSubmit, supervisors }) => {
    const [scores, setScores] = useState(log.scores || { s: 'C', e: 'C', c: 'C', soc: 'C', env: 'C' });
    const [pillarComments, setPillarComments] = useState(log.pillarCommentary || { s: '', e: '', c: '', soc: '', env: '' });
    const [summary, setSummary] = useState(log.publicSummary || '');
    const [checklist, setChecklist] = useState(log.verificationChecklist || { intent: false, excellence: false, consistency: false });

    return (
        <div className="glass-card mt-3" style={{ borderLeft: '4px solid var(--color-compliance)' }}>
            <h4 style={{ marginBottom: '1rem' }}>{log.bizName} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '10px' }}>{log.status}</span></h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Score & Pillar Commentary */}
                {PILLARS.map(p => (
                    <div key={p.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: '700' }}>
                                <i className={`fa-solid ${p.icon}`} style={{ color: 'var(--primary)', width: '20px' }}></i>
                                {p.label}
                            </div>
                            <GradeSelector 
                                currentScores={scores} 
                                pillarId={p.id} 
                                onSelect={(id, val) => setScores(prev => ({ ...prev, [id]: val }))} 
                            />
                        </div>
                        <textarea 
                            className="input-modern"
                            placeholder="What evidence supports this grade? What would need to change for it to improve?"
                            value={pillarComments[p.id]}
                            onChange={(e) => setPillarComments(prev => ({ ...prev, [p.id]: e.target.value }))}
                            style={{ fontSize: '0.85rem', minHeight: '60px' }}
                        />
                    </div>
                ))}

                {/* Overall Summary */}
                <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Overall Summary for Supervisor</label>
                    <textarea 
                        className="input-modern" 
                        placeholder="Comprehensive summary for supervisors and third parties..." 
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        style={{ minHeight: '100px' }}
                    />
                </div>

                {/* Checklist */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '10px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--accent-success)', fontWeight: '700', display: 'block', marginBottom: '0.75rem' }}>Verification Principles Checklist</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={checklist.intent} onChange={e => setChecklist(prev => ({...prev, intent: e.target.checked}))} />
                            Directional Intent verified (Reaction vs. Planned)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={checklist.excellence} onChange={e => setChecklist(prev => ({...prev, excellence: e.target.checked}))} />
                            Technical Excellence verified (Precision vs. Vague)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                            <input type="checkbox" checked={checklist.consistency} onChange={e => setChecklist(prev => ({...prev, consistency: e.target.checked}))} />
                            Internal Consistency verified (Culture vs. Surface-only)
                        </label>
                    </div>
                </div>

                <button 
                    className="btn btn-primary" 
                    style={{ padding: '1rem' }}
                    onClick={() => onSubmit({...log, scores}, summary, pillarComments, checklist, supervisors[0])}
                >
                    Submit for Verification
                </button>
            </div>
        </div>
    );
};

export default AuditHub;
