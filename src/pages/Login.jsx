import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const { joinMovement, continueAsGuest, sendPasswordReset } = useAuth();
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

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsProcessing(true);

        try {
            if (remember) {
                localStorage.setItem('bfg_remembered_email', email);
            } else {
                localStorage.removeItem('bfg_remembered_email');
            }
            
            // This now handles both existing login AND new registration automatically
            await joinMovement(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Authentication failed. Please check credentials.');
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
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={isProcessing}
                            style={{ padding: '1rem', marginTop: '0.5rem' }}
                        >
                            {isProcessing ? 'Processing...' : 'Join the Movement'}
                        </button>
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
