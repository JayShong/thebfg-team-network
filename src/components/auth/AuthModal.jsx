import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AuthModal = ({ onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isSignUp, setIsSignUp] = useState(false);
    
    const { login, signup } = useAuth();

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
        <div className="modal flex-center" style={{ display: 'flex' }}>
            <div className="modal-content glass-card slide-up">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h3><i className="fa-solid fa-leaf" style={{color: 'var(--accent-primary)'}}></i> Conviction Gateway</h3>
                    <button onClick={onClose} style={{background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem'}}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>
                
                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem'}}>
                    {isSignUp ? 'Create a new account to join the network.' : 'Login to safely rejoin the Conviction Network.'}
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Email Address</label>
                        <div className="search-bar" style={{ margin: 0 }}>
                            <i className="fa-solid fa-envelope" style={{color: 'var(--text-secondary)'}}></i>
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                required 
                                style={{width: '100%', background: 'none', border: 'none', color: 'var(--text)', outline: 'none', padding: '0.5rem'}}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Password</label>
                        <div className="search-bar" style={{ margin: 0 }}>
                            <i className="fa-solid fa-lock" style={{color: 'var(--text-secondary)'}}></i>
                            <input 
                                type="password" 
                                placeholder="Password" 
                                required 
                                style={{width: '100%', background: 'none', border: 'none', color: 'var(--text)', outline: 'none', padding: '0.5rem'}}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {error && <div style={{color: 'var(--accent)', fontSize: '0.8rem', textAlign: 'center'}}>{error}</div>}
                    
                    <button type="submit" disabled={isProcessing} className="nav-btn active" style={{width: '100%', justifyContent: 'center', marginTop: '1rem', background: 'var(--primary)', border: 'none'}}>
                        {isProcessing ? 'Authenticating...' : (isSignUp ? 'Initialize Profile' : 'Enter Gate')}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button 
                            type="button" 
                            onClick={() => setIsSignUp(!isSignUp)} 
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            {isSignUp ? 'Already have an account? Login' : 'New to the network? Create account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;
