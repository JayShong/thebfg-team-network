import React, { useState } from 'react';

const WELCOME_STEPS = [
    {
        title: "The Movement",
        icon: "fa-leaf",
        text: "Good businesses are losing. Not because they're wrong — but because no one can see them. You're here to change that.",
        color: "var(--primary)"
    },
    {
        title: "Making them Seen",
        icon: "fa-eye",
        text: "We work directly with founders to bridge the gap between brilliant execution and clear communication. Every scan makes their impact visible.",
        color: "#3B82F6"
    },
    {
        title: "Making them Verified",
        icon: "fa-shield-halved",
        text: "Our Living Signal is grounded in international standards. It's not a marketing badge — it's transparent, annually-renewed proof of conviction.",
        color: "var(--accent-success)"
    },
    {
        title: "Making them Valued",
        icon: "fa-heart",
        text: "Every check-in is a signal. Every purchase is a vote. Prove that conviction-driven businesses can compete — and win.",
        color: "var(--accent-primary)"
    }
];

const WelcomeOverlay = ({ onDismiss }) => {
    const [step, setStep] = useState(0);
    const current = WELCOME_STEPS[step];

    const nextStep = (e) => {
        e.stopPropagation();
        if (step < WELCOME_STEPS.length - 1) {
            setStep(step + 1);
        } else {
            onDismiss();
        }
    };

    return (
        <div className="welcome-overlay" onClick={onDismiss}>
            <div 
                className="welcome-card glass-card slide-up" 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                    padding: '2.5rem', 
                    maxWidth: '450px', 
                    textAlign: 'center',
                    border: `1px solid ${current.color}44`,
                    boxShadow: `0 20px 40px ${current.color}11`
                }}
            >
                <div className="welcome-icon" style={{ marginBottom: '1.5rem' }}>
                    <i className={`fa-solid ${current.icon}`} style={{ fontSize: '4rem', color: current.color }}></i>
                </div>

                <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#fff' }}>{current.title}</h1>
                
                <p style={{ 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.6', 
                    fontSize: '1rem',
                    marginBottom: '2rem'
                }}>
                    {current.text}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                    <button 
                        onClick={nextStep}
                        className="btn btn-primary"
                        style={{ 
                            padding: '1rem 3rem', 
                            border: 'none', 
                            fontSize: '1.1rem',
                            borderRadius: '50px',
                            background: step === WELCOME_STEPS.length - 1 
                                ? 'linear-gradient(135deg, var(--accent-primary), var(--primary))' 
                                : current.color,
                            width: '100%',
                            boxShadow: `0 10px 20px ${current.color}33`
                        }}
                    >
                        {step === WELCOME_STEPS.length - 1 ? "Begin Your Journey" : "Next"}
                    </button>

                    {/* Step Indicators */}
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        {WELCOME_STEPS.map((_, idx) => (
                            <div 
                                key={idx} 
                                style={{ 
                                    width: idx === step ? '24px' : '8px', 
                                    height: '8px', 
                                    borderRadius: '10px', 
                                    background: idx === step ? current.color : 'rgba(255,255,255,0.2)',
                                    transition: 'all 0.3s ease'
                                }}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeOverlay;

