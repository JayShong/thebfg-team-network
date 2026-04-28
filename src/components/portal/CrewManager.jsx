import React, { useState } from 'react';
import { functions } from '../../services/firebase';

const CrewManager = ({ business, onClose, onUpdate }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('crew');
    const [loading, setLoading] = useState(false);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
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
            alert(`Added ${email} as ${role}.`);
        } catch (err) {
            alert("Failed to add member: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (targetEmail, targetRole) => {
        if (!window.confirm(`Are you sure you want to remove ${targetEmail}?`)) return;
        setLoading(true);
        try {
            const manageCrewFn = functions.httpsCallable('managecrew');
            await manageCrewFn({
                bizId: business.id,
                targetEmail: targetEmail,
                role: targetRole,
                action: 'remove'
            });
            onUpdate();
        } catch (err) {
            alert("Failed to remove member: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const managers = business.stewardship?.managers || [];
    const crew = business.stewardship?.crew || [];

    return (
        <div className="glass-card slide-up" style={{ padding: '2rem', maxWidth: '600px', width: '100%' }}>
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
                                <button onClick={() => handleRemove(m, 'manager')} className="btn-icon" style={{ color: '#ff4d4d' }}><i className="fa-solid fa-trash-can"></i></button>
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
                                <button onClick={() => handleRemove(c, 'crew')} className="btn-icon" style={{ color: '#ff4d4d' }}><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                        ))
                    )}
                </section>
            </div>
        </div>
    );
};

export default CrewManager;
