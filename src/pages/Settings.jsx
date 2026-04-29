import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, functions } from '../services/firebase';
import ApplicationEditor from '../components/admin/ApplicationEditor';

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
    const { currentUser, isGuest, updateProfile, sendPasswordReset, logout, syncRoles } = useAuth();
    const navigate = useNavigate();

    const [nickname, setNickname] = useState('');
    const [gender, setGender] = useState('');
    const [city, setCity] = useState('');
    const [dob, setDob] = useState('');
    const [selectedCauses, setSelectedCauses] = useState([]);

    // Business Onboarding State
    const [bizName, setBizName] = useState('');
    const [bizAddress, setBizAddress] = useState('');
    const [bizPhone, setBizPhone] = useState('');
    const [bizEmail, setBizEmail] = useState('');
    const [showEmailWarning, setShowEmailWarning] = useState(false);
    const [onboardingSuccess, setOnboardingSuccess] = useState(false);
    const [myApplication, setMyApplication] = useState(null);
    const [editingApp, setEditingApp] = useState(null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (currentUser) {
            setNickname(currentUser.name || '');
            setGender(currentUser.gender || '');
            setCity(currentUser.city || '');
            setDob(currentUser.dob || '');
            setSelectedCauses(currentUser.causes || []);
            setBizEmail(currentUser.email || '');
        }
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = db.collection('applications')
            .where('ownerUid', '==', currentUser.uid)
            .limit(1)
            .onSnapshot(snap => {
                if (!snap.empty) {
                    setMyApplication({ id: snap.docs[0].id, ...snap.docs[0].data() });
                } else {
                    setMyApplication(null);
                }
            });
        return unsubscribe;
    }, [currentUser]);

    const handleBizEmailChange = (val) => {
        setBizEmail(val);
        setShowEmailWarning(val !== currentUser?.email);
    };

    const handleOnboardSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const onboardFn = functions.httpsCallable('onboardbusinessapplication');
            await onboardFn({
                name: bizName,
                address: bizAddress,
                phone: bizPhone,
                email: bizEmail,
                ownerUid: currentUser.uid
            });
            setOnboardingSuccess(true);
            setBizName('');
            setBizAddress('');
            setBizPhone('');
        } catch (err) {
            setMessage({ text: 'Onboarding application failed: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateApp = async (updates) => {
        setLoading(true);
        try {
            const updateFn = functions.httpsCallable('updateapplication');
            await updateFn({ applicationId: editingApp.id, updates });
            setEditingApp(null);
            setMessage({ text: 'Onboarding draft updated successfully!', type: 'success' });
        } catch (err) {
            setMessage({ text: 'Failed to update draft: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

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

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');

    const handlePasswordReset = async () => {
        if (!currentUser?.email) return;
        setLoading(true);
        try {
            await sendPasswordReset(currentUser.email);
            setMessage({ text: 'Password reset email sent!', type: 'success' });
            setConfirmReset(false);
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (err) {
            setMessage({ text: 'Failed to send reset email: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSyncRoles = async () => {
        setLoading(true);
        setMessage({ text: 'Re-verifying security badges with the network...', type: 'success' });
        try {
            const result = await syncRoles();
            if (result.success) {
                setMessage({ text: 'Security badges refreshed successfully!', type: 'success' });
                setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            } else {
                setMessage({ text: 'Refresh failed: ' + result.error, type: 'error' });
            }
        } catch (err) {
            setMessage({ text: 'Refresh failed: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteInput !== "DELETE") {
            setMessage({ text: "Please type 'DELETE' to confirm.", type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const deleteFn = functions.httpsCallable('deleteuseraccount');
            await deleteFn();
            setMessage({ text: "Account successfully deleted. Goodbye.", type: 'success' });
            setTimeout(async () => {
                await logout();
                navigate('/login');
            }, 2000);
        } catch (err) {
            setMessage({ text: "Failed to delete account: " + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (isGuest) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem', padding: '1rem' }}>
                <i className="fa-solid fa-envelope-open-text fa-4x" style={{ color: 'var(--accent-primary)', marginBottom: '1rem', opacity: 0.8 }}></i>
                <h2 style={{ letterSpacing: '1px', textTransform: 'uppercase', fontSize: '1.2rem', color: 'var(--accent-primary)', textAlign: 'center' }}>Member Settings Locked</h2>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px', marginBottom: '2rem', lineHeight: '1.6' }}>
                    Personalizing your identity and defining your Empathy Profile requires a verified account.
                </p>
                <button onClick={() => navigate('/profile')} className="btn btn-primary feature-gradient" style={{ padding: '1rem 2rem', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: '800' }}>
                    Return to Profile
                </button>
            </div>
        );
    }

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
                    <h3 style={{ color: '#fff', marginBottom: '1rem' }}><i className="fa-solid fa-id-card" style={{ color: 'var(--primary)' }}></i> Basic Information</h3>
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
                    <h3 style={{ color: '#fff' }}><i className="fa-solid fa-key" style={{ color: 'var(--accent-secondary)' }}></i> Security & Permissions</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {!confirmReset ? (
                            <button type="button" onClick={() => setConfirmReset(true)} className="btn btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                                <i className="fa-solid fa-envelope"></i> Send Password Reset
                            </button>
                        ) : (
                            <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ fontSize: '0.85rem' }}>Send reset email to {currentUser?.email}?</span>
                                <button type="button" onClick={handlePasswordReset} className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Confirm</button>
                                <button type="button" onClick={() => setConfirmReset(false)} className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Cancel</button>
                            </div>
                        )}
                        
                        <button type="button" onClick={handleSyncRoles} className="btn btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }} disabled={loading}>
                            <i className="fa-solid fa-arrows-rotate"></i> Sync Identity Badges
                        </button>
                    </div>
                </div>

                <div className="glass-card mt-4 slide-up" style={{ animationDelay: '0.2s' }}>
                    <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}><i className="fa-solid fa-heart" style={{ color: '#ff4444' }}></i> Causes You Support</h3>
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

                <div className="glass-card mt-4 slide-up" style={{ animationDelay: '0.3s', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
                    <h3 style={{ color: '#ff4444' }}><i className="fa-solid fa-triangle-exclamation"></i> Danger Zone</h3>
                    {!confirmDelete ? (
                        <>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                Irreversibly delete your account. Your personal data will be purged, but your impact metrics will be safely anonymized.
                            </p>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="btn btn-secondary"
                                style={{ width: 'auto', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', borderColor: '#ff4444' }}
                                disabled={loading}
                            >
                                <i className="fa-solid fa-trash-can"></i> Delete My Account
                            </button>
                        </>
                    ) : (
                        <div className="slide-up">
                            <p style={{ fontSize: '0.9rem', color: '#ff4444', fontWeight: 'bold', marginBottom: '1rem' }}>
                                FINAL WARNING: This action cannot be undone. All your badges and progress will be lost.
                            </p>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type <strong style={{ color: '#fff' }}>DELETE</strong> to confirm:</label>
                                <input 
                                    type="text" 
                                    className="input-modern" 
                                    placeholder="Type DELETE here..."
                                    value={deleteInput}
                                    onChange={(e) => setDeleteInput(e.target.value)}
                                    style={{ border: deleteInput === 'DELETE' ? '1px solid #ff4444' : '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    className="btn btn-primary"
                                    style={{ flex: 1, background: '#ff4444', border: 'none' }}
                                    disabled={loading || deleteInput !== 'DELETE'}
                                >
                                    Confirm Permanent Deletion
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setConfirmDelete(false); setDeleteInput(''); }}
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>


            </form>

            <div style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.4, fontSize: '0.65rem', letterSpacing: '1px' }}>
                THE BFG TEAM PLATFORM • VERSION 0.9.6 (PRE-LAUNCH)<br />
                INSTITUTIONAL SYNC: 2026-04-26
            </div>

            {editingApp && (
                <ApplicationEditor
                    application={editingApp}
                    onClose={() => setEditingApp(null)}
                    onSave={handleUpdateApp}
                    isSaving={loading}
                    readOnly={!['pending', 'draft'].includes(editingApp.status)}
                />
            )}
        </div>
    );
};

export default Settings;
