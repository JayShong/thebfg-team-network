import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AuthModal = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isSignUp, setIsSignUp] = useState(false);
    
    const { login, signup } = useAuth();
    const navigate = useNavigate();

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
            navigate('/profile');
        } catch (err) {
            setError(err.message || 'Authentication failed. Please check credentials.');
        } finally {
            setIsProcessing(false);
        }
    };

    const modalRoot = document.getElementById('root') || document.body;

    return ReactDOM.createPortal(
        <div className="modal" style={{ 
            display: 'flex', 
            zIndex: 4000, 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            padding: '1.5rem'
        }}>
            <div className="modal-content glass-card" style={{ 
                padding: '2rem', 
                border: '1px solid var(--glass-border)', 
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                width: '90%',
                maxWidth: '400px',
                position: 'relative'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <i className="fa-solid fa-leaf text-gradient"></i> Conviction Gateway
                    </h2>
                    <button onClick={() => { onClose(); navigate('/'); }} className="icon-btn" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }}>
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
                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'none' }}
                        >
                            {isSignUp ? 'Log in here' : 'Register your profile'}
                        </button>

                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--glass-border)' }}>
                            <button 
                                type="button"
                                onClick={() => { onClose(); navigate('/'); }}
                                className="guest-cta"
                                style={{ 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    color: 'var(--text-secondary)', 
                                    padding: '0.85rem 1rem', 
                                    borderRadius: '12px', 
                                    fontSize: '0.85rem', 
                                    width: '100%',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }}
                            >
                                <i className="fa-solid fa-ghost"></i> Continue exploring as Guest
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        modalRoot
    );
};

export default AuthModal;
