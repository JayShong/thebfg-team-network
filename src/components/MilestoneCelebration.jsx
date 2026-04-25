import React, { useState, useEffect } from 'react';

const MILESTONES = [
    { count: 1, message: "Your first support. This is where it starts." },
    { count: 5, message: "Five times you chose conviction over convenience." },
    { count: 10, message: "Ten supports. You're building a pattern of purpose." },
    { count: 25, message: "Twenty-five. The businesses you support can feel it." },
    { count: 50, message: "Fifty times you said: I see you, and I choose you." },
    { count: 100, message: "A hundred supports. You're not just a customer — you're a movement." },
    { count: 250, message: "Two hundred and fifty. You're proof that conviction works." },
    { count: 500, message: "Five hundred supports. The network is stronger because of you." },
    { count: 1000, message: "One thousand. You've cast a thousand votes for the world you want." }
];

const CONFETTI_COLORS = [
    'rgba(139, 92, 246, 0.8)',  // Violet
    'rgba(59, 130, 246, 0.8)',  // Blue
    'rgba(16, 185, 129, 0.8)',  // Emerald
    'rgba(245, 158, 11, 0.8)', // Amber
    'rgba(236, 72, 153, 0.8)'  // Pink
];

const MilestoneCelebration = ({ count, onDismiss }) => {
    const milestone = MILESTONES.find(m => m.count === count);
    const [particles, setParticles] = useState([]);
    
    useEffect(() => {
        // Generate confetti particles
        const newParticles = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            left: `${15 + Math.random() * 70}%`,
            top: `${20 + Math.random() * 60}%`,
            delay: `${Math.random() * 0.8}s`,
            size: `${6 + Math.random() * 6}px`
        }));
        setParticles(newParticles);

        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
            if (onDismiss) onDismiss();
        }, 5000);

        return () => clearTimeout(timer);
    }, [count]);

    if (!milestone) return null;

    return (
        <div className="milestone-overlay" onClick={onDismiss}>
            <div className="milestone-card" onClick={e => e.stopPropagation()}>
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
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    <i className="fa-solid fa-star" style={{ color: '#F59E0B' }}></i>
                </div>
                <div className="milestone-number">{count}</div>
                <div className="milestone-label">Supports</div>
                <p className="milestone-message">{milestone.message}</p>
                <button 
                    onClick={onDismiss}
                    className="btn btn-primary"
                    style={{ marginTop: '1.5rem', padding: '0.7rem 2rem', border: 'none', fontSize: '0.9rem' }}
                >
                    Keep Going
                </button>
            </div>
        </div>
    );
};

export { MILESTONES };
export default MilestoneCelebration;
