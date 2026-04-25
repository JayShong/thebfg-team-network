import React from 'react';
import { useNavigate } from 'react-router-dom';

const RestrictedAccess = ({ requiredRole }) => {
    const navigate = useNavigate();

    return (
        <div style={{ 
            height: '80vh', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            textAlign: 'center',
            padding: '2rem'
        }}>
            <div className="glass-card" style={{ padding: '3rem', maxWidth: '450px', border: '1px solid rgba(255, 87, 87, 0.3)' }}>
                <i className="fa-solid fa-shield-lock" style={{ fontSize: '4rem', color: '#ff5757', marginBottom: '1.5rem' }}></i>
                <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Restricted Access</h1>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    Your current credentials do not have the permissions required to access this section. 
                    {requiredRole && <span> This area requires <strong>{requiredRole}</strong> clearance.</span>}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/')}
                    >
                        <i className="fa-solid fa-house"></i> Return to The Network
                    </button>
                    
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => navigate('/profile')}
                    >
                        Check My Privileges
                    </button>
                </div>
            </div>
            
            <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                TheBFG.Team Conviction Network • Security Protocol v{import.meta.env.VITE_APP_VERSION || '0.95'}
            </p>
        </div>
    );
};

export default RestrictedAccess;
