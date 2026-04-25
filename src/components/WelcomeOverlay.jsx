import React from 'react';

const WelcomeOverlay = ({ onDismiss }) => {
    return (
        <div className="welcome-overlay" onClick={onDismiss}>
            <div className="welcome-icon">
                <i className="fa-solid fa-leaf text-gradient"></i>
            </div>
            <h1>Good businesses are losing. You're here to change that.</h1>
            <p>
                Every support you give, every purchase you log — it's proof that conviction-driven 
                businesses can win. Welcome to the movement.
            </p>
            <div className="welcome-cta">
                <button 
                    onClick={onDismiss}
                    className="btn btn-primary"
                    style={{ 
                        padding: '1rem 2.5rem', 
                        border: 'none', 
                        fontSize: '1rem',
                        borderRadius: '50px',
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--primary))'
                    }}
                >
                    Let's Begin
                </button>
            </div>
        </div>
    );
};

export default WelcomeOverlay;
