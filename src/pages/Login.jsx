import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { login, loginWithGoogle, signup, continueAsGuest, sendPasswordReset } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const rememberedEmail = localStorage.getItem('bfg_remembered_email');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRemember(true);
        }
    }, []);

    const handleAuth = async (e, mode) => {
        if (e) e.preventDefault();
        setError('');
        setMessage('');
        setIsProcessing(true);

        try {
            if (remember) {
                localStorage.setItem('bfg_remembered_email', email);
            } else {
                localStorage.removeItem('bfg_remembered_email');
            }
            
            if (mode === 'signup') {
                await signup(email, password);
            } else {
                await login(email, password);
            }
            navigate('/');
        } catch (err) {
            let msg = "The handshake failed. Please check your connection and try again.";
            
            if (err.code === 'auth/user-not-found') {
                msg = "Seems like you are new here. Are you looking to join the movement?";
            } else if (err.code === 'auth/wrong-password') {
                msg = "Sorry I could not catch your password. Please try again.";
            } else if (err.code === 'auth/invalid-credential') {
                msg = "I am having difficulty understanding you. Please enter your email address and password again please?";
            } else if (err.code === 'auth/email-already-in-use') {
                msg = "Oh no! There seems to be another you? Try with another email.";
            } else if (err.code === 'auth/too-many-requests') {
                msg = "I am having difficulty opening the door for you. Please try again later.";
            }
            
            setError(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGoogleAuth = async () => {
        setError('');
        setMessage('');
        setIsProcessing(true);
        try {
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            setError(err.message || 'Google authentication failed.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }
        try {
            await sendPasswordReset(email);
            setMessage('Password reset email sent. Please check your inbox.');
            setError('');
        } catch (err) {
            setError('Failed to send reset email: ' + err.message);
        }
    };

    return (
        <section id="view-login" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifySelf: 'center', alignItems: 'center', padding: '2rem', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '400px', width: '100%', marginTop: 'auto', marginBottom: 'auto' }}>
                <i className="fa-solid fa-leaf text-gradient" style={{ fontSize: '4rem', marginBottom: '1.5rem' }}></i>
                <h1 style={{ marginBottom: '0.5rem', textAlign: 'center', fontSize: '2rem', fontWeight: '700' }}>Join the Movement</h1>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: '1.5' }}>
                    Every purchase is a vote. Every signal is a choice. We're reclaiming 30% of the economy for businesses that care.
                </p>

                <div className="glass-card" style={{ width: '100%', padding: '2rem' }}>
                    <form onSubmit={(e) => handleAuth(e, 'login')} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {localStorage.getItem('bfg_guest_id') && (
                            <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', color: '#fcd34d', fontSize: '0.85rem', textAlign: 'center' }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> 
                                <strong>Warning:</strong> Logging in as a different user will permanently overwrite your current anonymous impact data. If this is your first time, please Register to claim it.
                            </div>
                        )}
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email Address</label>
                            <input
                                type="email"
                                className="input-modern"
                                placeholder="hello@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Password</label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <input
                                type="password"
                                className="input-modern"
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                            <input
                                type="checkbox"
                                id="login-remember"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="login-remember" style={{ fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-primary)' }}>Remember email Address</label>
                        </div>

                        {error && <div style={{ color: 'var(--accent)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}
                        {message && <div style={{ color: 'var(--accent-success)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>{message}</div>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={(e) => handleAuth(e, 'signup')}
                                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', padding: '0.5rem 0' }}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : 'Join the Movement'}
                            </button>

                            <button
                                type="submit"
                                onClick={(e) => handleAuth(e, 'login')}
                                className="btn"
                                disabled={isProcessing}
                                style={{ 
                                    padding: '1rem', 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    fontWeight: '700'
                                }}
                            >
                                {isProcessing ? 'Processing...' : 'Log In'}
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>or</span>
                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleAuth}
                                className="btn"
                                disabled={isProcessing}
                                style={{ 
                                    padding: '0.85rem', 
                                    background: 'white', 
                                    color: '#1f2937',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    border: 'none',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
                                {isProcessing ? 'Connecting...' : 'Continue with Google'}
                            </button>
                        </div>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
                        <button
                            onClick={continueAsGuest}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseOver={(e) => e.target.style.color = 'var(--accent-primary)'}
                            onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
                        >
                            <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '0.5rem' }}></i>Explore as Guest
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Login;
