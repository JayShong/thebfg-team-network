import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AuthModal = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isSignUp, setIsSignUp] = useState(false);
    
    const { login, signup, mockLogin } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        setError('');
        
        try {
            if (isSignUp) {
                await signup(email, password);
            } else {
                await login(email, password);
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Authentication failed. Please check credentials.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="modal" style={{ display: 'flex', zIndex: 2000 }}>
            <div className="modal-content glass-card slide-up" style={{ padding: '2rem', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <i className="fa-solid fa-leaf text-gradient"></i> Conviction Gateway
                    </h2>
                    <button onClick={onClose} className="icon-btn" style={{ background: 'none', border: 'none', fontSize: '1.25rem' }}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
                
                <p style={{color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6'}}>
                    {isSignUp ? 'Establish your digital identity to join the network.' : 'Authenticate to securely rejoin the Conviction Network.'}
                </p>
 
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <i className="fa-solid fa-envelope" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', opacity: 0.7 }}></i>
                            <input 
                                type="email" 
                                className="input-modern"
                                placeholder="name@email.com" 
                                required 
                                style={{ paddingLeft: '2.75rem' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <i className="fa-solid fa-lock" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', opacity: 0.7 }}></i>
                            <input 
                                type="password" 
                                className="input-modern"
                                placeholder="••••••••" 
                                required 
                                style={{ paddingLeft: '2.75rem' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#fca5a5', fontSize: '0.85rem', textAlign: 'center' }}>
                            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i> {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={isProcessing} 
                        className="btn btn-primary mt-2" 
                        style={{ width: '100%', height: '52px', fontSize: '1.1rem', marginTop: '0.5rem' }}
                    >
                        {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : (isSignUp ? 'Initialize Profile' : 'Enter Gate')}
                    </button>
 
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            {isSignUp ? 'Already part of the network?' : 'New to the conviction network?'}
                        </p>
                        <button 
                            type="button" 
                            onClick={() => setIsSignUp(!isSignUp)} 
                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'none', marginBottom: '1rem' }}
                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                        >
                            {isSignUp ? 'Log in here' : 'Register your profile'}
                        </button>

                        <div style={{ padding: '1rem', background: 'rgba(255,184,77,0.05)', borderRadius: '12px', border: '1px dashed rgba(255,184,77,0.2)', marginTop: '1rem' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Development Mode:</p>
                            <button 
                                type="button"
                                onClick={() => {
                                    mockLogin();
                                    onClose();
                                }}
                                className="btn btn-secondary" 
                                style={{ width: '100%', fontSize: '0.85rem', borderColor: 'rgba(255,184,77,0.3)', color: '#ffb84d' }}
                            >
                                <i className="fa-solid fa-user-shield"></i> Mock Business Owner Login
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;
