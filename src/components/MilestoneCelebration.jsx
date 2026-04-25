import React, { useState, useEffect } from 'react';

const SUPPORT_MILESTONES = [
    { count: 1, message: "Your first support. This is where it starts." },
    { count: 5, message: "Five times you chose conviction over convenience." },
    { count: 10, message: "Ten supports. You're building a pattern of purpose." },
    { count: 25, message: "Twenty-five. The businesses you support can feel it." },
    { count: 50, message: "Fifty times you said: I see you, and I choose you." },
    { count: 100, message: "A hundred supports. You're not just a customer — you're a movement." }
];

const PURCHASE_MILESTONES = [
    { count: 1, message: "Your first verified purchase. Your money just became a vote." },
    { count: 5, message: "Five times you funded the conviction economy." },
    { count: 10, message: "Ten purchases. You're shifting capital to where it matters." },
    { count: 25, message: "Twenty-five. Founders like this exist because you choose them." },
    { count: 50, message: "Fifty purchases. You're building an economy worth having." },
    { count: 100, message: "A hundred votes cast with your wallet. Legend status." }
];

const DISCOVERY_MILESTONES = [
    { count: 1, message: "First discovery. The network is becoming legible to you." },
    { count: 3, message: "Three unique businesses seen. You're exploring the alternative." },
    { count: 5, message: "Five founders discovered. You're mapping the trust infrastructure." },
    { count: 10, message: "Ten unique spots. You're a true Network Scout." },
    { count: 25, message: "Twenty-five businesses seen. You know the city's heart better than most." }
];

const CONFETTI_COLORS = [
    'rgba(139, 92, 246, 0.8)',  // Violet
    'rgba(59, 130, 246, 0.8)',  // Blue
    'rgba(16, 185, 129, 0.8)',  // Emerald
    'rgba(245, 158, 11, 0.8)', // Amber
    'rgba(236, 72, 153, 0.8)'  // Pink
];

const MilestoneCelebration = ({ count, type = 'support', onDismiss }) => {
    let milestoneList = SUPPORT_MILESTONES;
    let label = "Supports";
    let icon = "fa-star";
    let color = "#F59E0B";

    if (type === 'purchase') {
        milestoneList = PURCHASE_MILESTONES;
        label = "Purchases";
        icon = "fa-receipt";
        color = "var(--accent-success)";
    } else if (type === 'discovery') {
        milestoneList = DISCOVERY_MILESTONES;
        label = "Businesses Seen";
        icon = "fa-binoculars";
        color = "#3B82F6";
    }

    const milestone = milestoneList.find(m => m.count === count);
    const [particles, setParticles] = useState([]);
    
    useEffect(() => {
        if (!milestone) return;

        // Generate confetti particles
        const newParticles = Array.from({ length: 15 }, (_, i) => ({
            id: i,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            delay: `${Math.random() * 0.8}s`,
            size: `${6 + Math.random() * 8}px`
        }));
        setParticles(newParticles);

        // Auto-dismiss after 6 seconds for better reading
        const timer = setTimeout(() => {
            if (onDismiss) onDismiss();
        }, 6000);

        return () => clearTimeout(timer);
    }, [count, type, milestone]);

    if (!milestone) return null;

    return (
        <div className="milestone-overlay" onClick={onDismiss}>
            <div className="milestone-card glass-card slide-up" onClick={e => e.stopPropagation()} style={{ border: `1px solid ${color}44` }}>
                {particles.map(p => (
                    <div 
                        key={p.id} 
                        className="confetti-particle"
                        style={{
                            background: p.color,
                            left: p.left,
                            top: p.top,
                            width: p.size,
                            height: p.size,
                            animationDelay: p.delay
                        }}
                    />
                ))}
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    <i className={`fa-solid ${icon}`} style={{ color: color }}></i>
                </div>
                <div className="milestone-number" style={{ background: `linear-gradient(135deg, ${color}, #fff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {count}
                </div>
                <div className="milestone-label">{label}</div>
                <p className="milestone-message">{milestone.message}</p>
                <button 
                    onClick={onDismiss}
                    className="btn btn-primary"
                    style={{ 
                        marginTop: '1.5rem', 
                        padding: '0.8rem 2.5rem', 
                        border: 'none', 
                        fontSize: '1rem',
                        background: color,
                        borderRadius: '50px'
                    }}
                >
                    Keep Going
                </button>
            </div>
        </div>
    );
};

export { SUPPORT_MILESTONES, PURCHASE_MILESTONES, DISCOVERY_MILESTONES };
export default MilestoneCelebration;

