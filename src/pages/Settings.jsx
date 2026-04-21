import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CAUSES_LIST = [
    "Poverty Eradication",
    "Quality Education",
    "Food Security",
    "Wildlife Conservation",
    "Healthcare Access",
    "Clean Water",
    "Affordable Housing",
    "Climate Action",
    "Gender Equality",
    "Indigenous Rights"
];

const Settings = () => {
    const { currentUser, updateProfile, sendPasswordReset } = useAuth();
    const navigate = useNavigate();

    const [nickname, setNickname] = useState('');
    const [gender, setGender] = useState('');
    const [city, setCity] = useState('');
    const [dob, setDob] = useState('');
    const [selectedCauses, setSelectedCauses] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (currentUser) {
            setNickname(currentUser.name || '');
            setGender(currentUser.gender || '');
            setCity(currentUser.city || '');
            setDob(currentUser.dob || '');
            setSelectedCauses(currentUser.causes || []);
        }
    }, [currentUser]);

    const handleToggleCause = (cause) => {
        setSelectedCauses(prev => 
            prev.includes(cause) 
                ? prev.filter(c => c !== cause)
                : [...prev, cause]
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            await updateProfile({
                name: nickname,
                gender,
                city,
                dob,
                causes: selectedCauses
            });
            setMessage({ text: 'Settings updated successfully!', type: 'success' });
            setTimeout(() => navigate('/profile'), 1500);
        } catch (err) {
            setMessage({ text: 'Failed to update settings: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!currentUser?.email) return;
        if (window.confirm(`Send a password reset email to ${currentUser.email}?`)) {
            try {
                await sendPasswordReset(currentUser.email);
                setMessage({ text: 'Password reset email sent!', type: 'success' });
            } catch (err) {
                setMessage({ text: 'Failed to send reset email: ' + err.message, type: 'error' });
            }
        }
    };

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <button className="back-btn" onClick={() => navigate('/profile')}>
                <i className="fa-solid fa-arrow-left"></i> Back to Profile
            </button>

            <div className="page-header">
                <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Settings</h1>
                <p>Update your personal information</p>
            </div>

            {message.text && (
                <div className={`glass-card ${message.type === 'success' ? 'success-gradient' : ''}`} style={{ marginBottom: '1.5rem', padding: '1rem', textAlign: 'center', border: message.type === 'error' ? '1px solid #ff4444' : '' }}>
                    <p style={{ color: message.type === 'error' ? '#ff4444' : 'var(--text-primary)', margin: 0 }}>
                        <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`} style={{ marginRight: '8px' }}></i>
                        {message.text}
                    </p>
                </div>
            )}

            <form onSubmit={handleSave}>
                <div className="glass-card slide-up">
                    <h3 style={{ color: '#fff', marginBottom: '1rem' }}><i className="fa-solid fa-id-card" style={{color: 'var(--primary)'}}></i> Basic Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Nickname</label>
                            <input 
                                type="text" 
                                className="input-modern" 
                                value={nickname} 
                                onChange={(e) => setNickname(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Gender</label>
                            <select 
                                className="input-modern" 
                                value={gender} 
                                onChange={(e) => setGender(e.target.value)}
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>City</label>
                            <input 
                                type="text" 
                                className="input-modern" 
                                placeholder="e.g. Kuala Lumpur"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input 
                                type="date" 
                                className="input-modern"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-card mt-4 slide-up" style={{ animationDelay: '0.1s' }}>
                    <h3 style={{ color: '#fff' }}><i className="fa-solid fa-key" style={{color: 'var(--accent-secondary)'}}></i> Security</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Keep your account safe by verifying your identity or resetting your password.</p>
                    <button type="button" onClick={handlePasswordReset} className="btn btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                        <i className="fa-solid fa-envelope"></i> Send Password Reset Email
                    </button>
                </div>

                <div className="glass-card mt-4 slide-up" style={{ animationDelay: '0.2s' }}>
                    <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}><i className="fa-solid fa-heart" style={{color: '#ff4444'}}></i> Causes You Support</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Select the causes in Malaysia you are most passionate about.</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                        {CAUSES_LIST.map(cause => (
                            <label key={cause} className="checkbox-container">
                                <input 
                                    type="checkbox" 
                                    checked={selectedCauses.includes(cause)}
                                    onChange={() => handleToggleCause(cause)}
                                />
                                <span className="checkmark"></span>
                                {cause}
                            </label>
                        ))}
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="btn btn-primary mt-4 feature-gradient" 
                    style={{ padding: '1.25rem', fontSize: '1.1rem', border: 'none' }}
                    disabled={loading}
                >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-floppy-disk"></i> Save Changes</>}
                </button>
            </form>
        </div>
    );
};

export default Settings;
