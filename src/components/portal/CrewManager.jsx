import React, { useState } from 'react';
import { functions } from '../../services/firebase';

const CrewManager = ({ business, onClose, onUpdate }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('crew');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState(null); // { email, role }

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setStatus({ message: `Adding ${email}...`, type: 'info' });
        try {
            const manageCrewFn = functions.httpsCallable('managecrew');
            await manageCrewFn({
                bizId: business.id,
                targetEmail: email,
                role: role,
                action: 'add'
            });
            setEmail('');
            onUpdate();
            setStatus({ message: `Successfully added ${email} as ${role}.`, type: 'success' });
            setTimeout(() => setStatus(null), 3000);
        } catch (err) {
            setStatus({ message: "Failed: " + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!confirmRemove) return;
        setLoading(true);
        setStatus({ message: `Removing ${confirmRemove.email}...`, type: 'info' });
        try {
            const manageCrewFn = functions.httpsCallable('managecrew');
            await manageCrewFn({
                bizId: business.id,
                targetEmail: confirmRemove.email,
                role: confirmRemove.role,
                action: 'remove'
            });
            onUpdate();
            setStatus({ message: "Member removed successfully.", type: 'success' });
            setConfirmRemove(null);
            setTimeout(() => setStatus(null), 3000);
        } catch (err) {
            setStatus({ message: "Failed: " + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const managers = business.stewardship?.managers || [];
    const crew = business.stewardship?.crew || [];

    return (
        <div className="glass-card slide-up" style={{ padding: '2rem', maxWidth: '600px', width: '100%', position: 'relative' }}>
            {/* Status Overlay */}
            {status && (
                <div style={{ position: 'absolute', top: '-1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                    <div className="glass-card" style={{ 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.8rem',
                        background: status.type === 'error' ? 'rgba(255,50,50,0.2)' : 'rgba(34,197,94,0.2)',
                        border: `1px solid ${status.type === 'error' ? '#ff4444' : '#22c55e'}`,
                        color: status.type === 'error' ? '#ff4444' : '#22c55e',
                        whiteSpace: 'nowrap'
                    }}>
                        {status.message}
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmRemove && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 20, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                    <div className="slide-up">
                        <i className="fa-solid fa-user-minus fa-2x" style={{ color: '#ff4444', marginBottom: '1rem' }}></i>
                        <h4 style={{ margin: '0 0 0.5rem' }}>Remove Member?</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Are you sure you want to remove <strong>{confirmRemove.email}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setConfirmRemove(null)} className="btn glass-card" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleRemove} className="btn btn-primary" style={{ flex: 1, background: '#ff4444', border: 'none' }}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Crew Management</h3>
                <button onClick={onClose} className="btn-icon"><i className="fa-solid fa-xmark"></i></button>
            </div>

            <form onSubmit={handleAdd} style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
                <input 
                    type="email" 
                    className="input-modern" 
                    placeholder="Ambassador Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ flex: 1 }}
                />
                <select 
                    className="input-modern" 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ width: '120px' }}
                >
                    <option value="crew">Crew</option>
                    <option value="manager">Manager</option>
                </select>
                <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : "Add"}
                </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <section>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Managers</h4>
                    {managers.length === 0 ? <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>No managers assigned.</p> : (
                        managers.map(m => (
                            <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{m}</span>
                                <button onClick={() => setConfirmRemove({ email: m, role: 'manager' })} className="btn-icon" style={{ color: '#ff4d4d' }}><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                        ))
                    )}
                </section>

                <section>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Crew Members</h4>
                    {crew.length === 0 ? <p style={{ fontSize: '0.85rem', opacity: 0.5 }}>No crew assigned.</p> : (
                        crew.map(c => (
                            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{c}</span>
                                <button onClick={() => setConfirmRemove({ email: c, role: 'crew' })} className="btn-icon" style={{ color: '#ff4d4d' }}><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                        ))
                    )}
                </section>
            </div>
        </div>
    );
};

export default CrewManager;
