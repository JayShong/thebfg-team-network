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
    const { currentUser, updateProfile, sendPasswordReset, logout } = useAuth();
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

    const handleDeleteAccount = async () => {
        const confirm1 = window.confirm("CRITICAL: Are you sure you want to delete your account? This action is IRREVERSIBLE and will purge all your badges and personal history.");
        if (!confirm1) return;

        const confirm2 = window.prompt("To confirm deletion, please type DELETE in all caps:");
        if (confirm2 !== "DELETE") return;

        setLoading(true);
        try {
            const deleteFn = functions.httpsCallable('deleteuseraccount');
            await deleteFn();
            alert("Account successfully deleted. Your impact has been anonymized for the national mission. Goodbye.");
            await logout();
            navigate('/login');
        } catch (err) {
            console.error("Deletion failed:", err);
            alert("Failed to delete account: " + err.message);
        } finally {
            setLoading(false);
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
                    <h3 style={{ color: '#fff' }}><i className="fa-solid fa-key" style={{ color: 'var(--accent-secondary)' }}></i> Security</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Keep your account safe by verifying your identity or resetting your password.</p>
                    <button type="button" onClick={handlePasswordReset} className="btn btn-secondary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                        <i className="fa-solid fa-envelope"></i> Send Password Reset Email
                    </button>
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

                <div className="glass-card mt-4 slide-up" style={{ animationDelay: '0.25s', border: '1px solid var(--primary-light)' }}>
                    <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}><i className="fa-solid fa-briefcase" style={{ color: 'var(--primary)' }}></i> Onboard Your Business</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Apply to list your business in the BFG Network. Once submitted, our team will review your application.
                    </p>

                    {myApplication ? (
                        <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--primary-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h4 style={{ margin: 0 }}>Application for {myApplication.name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Status: <strong style={{ color: 'var(--primary-light)', textTransform: 'uppercase' }}>{myApplication.status}</strong>
                                    </p>
                                </div>
                                <span className="tier-badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                    {['pending', 'draft'].includes(myApplication.status) ? (myApplication.assignedTo ? 'Partner Assigned' : 'Awaiting CS Partner') : 'Historical Record'}
                                </span>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '1.2rem' }}>
                                {['pending', 'draft'].includes(myApplication.status)
                                    ? (myApplication.assignedTo
                                        ? `Great news! A Customer Success partner (${myApplication.assignedEmail}) is currently handling your application. You can both co-edit the details together.`
                                        : "Your application is in the pool. Once a Customer Success member picks it up, you'll be able to co-edit the full business profile details here.")
                                    : "This application has been processed and is now part of the BFG Network historical records. It is preserved here for your reference."}
                            </p>

                            <button type="button" onClick={() => setEditingApp(myApplication)} className="nav-btn active" style={{ width: '100%', justifyContent: 'center' }}>
                                <i className={`fa-solid ${['pending', 'draft'].includes(myApplication.status) ? 'fa-pen-to-square' : 'fa-eye'}`}></i>
                                {['pending', 'draft'].includes(myApplication.status) ? ' Edit My Application Details' : ' View Historical Record'}
                            </button>
                        </div>
                    ) : onboardingSuccess ? (
                        <div className="success-gradient" style={{ padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                            <i className="fa-solid fa-circle-check fa-2x" style={{ marginBottom: '0.5rem' }}></i>
                            <p style={{ fontWeight: '600' }}>Application Submitted!</p>
                            <p style={{ fontSize: '0.85rem' }}>A customer success representative will pick up your application shortly.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Business Name</label>
                                <input type="text" className="input-modern" value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Official Business Name" />
                            </div>
                            <div className="form-group">
                                <label>Business Address</label>
                                <textarea className="input-modern" style={{ minHeight: '80px' }} value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} placeholder="Full physical address" />
                            </div>
                            <div className="form-group">
                                <label>Contact Number</label>
                                <input type="tel" className="input-modern" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} placeholder="+60..." />
                            </div>
                            <div className="form-group">
                                <label>Business Email</label>
                                <input type="email" className="input-modern" value={bizEmail} onChange={(e) => handleBizEmailChange(e.target.value)} />
                                {showEmailWarning && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(255, 165, 0, 0.1)', border: '1px solid orange' }}>
                                        <p style={{ color: 'orange', fontSize: '0.75rem', margin: 0 }}>
                                            <i className="fa-solid fa-triangle-exclamation"></i> <strong>Warning:</strong> If you use a different email, a new account will be created. You will need to manage two separate accounts.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <button type="button" onClick={handleOnboardSubmit} className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading || !bizName || !bizAddress}>
                                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : "Submit Application"}
                            </button>
                        </div>
                    )}
                </div>

                <div className="glass-card mt-4 slide-up" style={{ animationDelay: '0.3s', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
                    <h3 style={{ color: '#ff4444' }}><i className="fa-solid fa-triangle-exclamation"></i> Danger Zone</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Irreversibly delete your account. Your personal data will be purged in compliance with GDPR, but your positive impact metrics will be safely anonymized to preserve the network's historical accuracy.
                    </p>
                    <button
                        type="button"
                        onClick={handleDeleteAccount}
                        className="btn btn-secondary"
                        style={{ width: 'auto', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', borderColor: '#ff4444' }}
                        disabled={loading}
                    >
                        <i className="fa-solid fa-trash-can"></i> Delete My Account Permanently
                    </button>
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

            <div style={{ marginTop: '3rem', textAlign: 'center', opacity: 0.4, fontSize: '0.65rem', letterSpacing: '1px' }}>
                THE BFG TEAM PLATFORM • VERSION 1.0.0<br />
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
