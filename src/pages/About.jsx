import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';

const About = () => {
    const [stats, setStats] = useState({ gdpPenetration: '0%' });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const doc = await db.collection('system').doc('stats').get();
                if (doc.exists) setStats(prev => ({...prev, ...doc.data()}));
            } catch (e) {
                console.warn("Failed retrieving system stats for About page");
            }
        };
        fetchStats();
    }, []);

    const progressWidth = stats.gdpPenetration || "0%";
    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* National Mission Hero */}
            <div className="glass-card slide-up" style={{ 
                marginTop: '1rem', 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15))', 
                border: '1px solid var(--primary)',
                padding: '2rem',
                textAlign: 'center'
            }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '1rem', color: '#fff' }}>The 30% Mission</h1>
                <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
                    Let's make empathy a core part of Malaysia's commercial world.
                </p>
                
                {/* Mission Progress Mockup */}
                <div style={{ marginTop: '2rem', maxWidth: '400px', margin: '2rem auto 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        <span>National Contribution reaching 30% GDP</span>
                        <span>Phase 1</span>
                    </div>
                    <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: progressWidth, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent-success))', borderRadius: '6px' }}></div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.8rem' }}>
                        <i className="fa-solid fa-circle-info"></i> Your activities sends a message that you choose to prioritize empathy over greed.
                    </p>
                </div>
            </div>

            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '2.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.25rem' }}>The Manifesto</h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>A private commercial Conviction Network connecting socially conscious consumers with empathetic businesses.</p>
            </div>

            {/* The Grading Paradigms - ISO53001 Style */}
            <div className="glass-card detail-section" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                    <i className="fa-solid fa-shield-halved fa-2x" style={{ color: 'var(--accent-success)' }}></i>
                    <h3 style={{ color: '#ffffff', margin: 0 }}>TheBFG.Team Living Standard<br /><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Powered by ISO53001</span></h3>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', lineHeight: '1.7' }}>
                    Businesses in the Conviction Network are scored across 5 core paradigms. Each paradigm receives a grade between <strong style={{color: 'var(--accent-success)'}}>A (Leadership)</strong> and <strong style={{color: 'var(--accent)'}}>D (Exploitative)</strong>. 
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1.2rem' }}>
                        <div style={{ color: 'var(--primary)', fontSize: '1.2rem', width: '30px', textAlign: 'center' }}><i className="fa-solid fa-gem"></i></div>
                        <div>
                            <h4 style={{ margin: '0 0 0.3rem', color: '#fff' }}>Shareholder Paradigm</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>Balancing short-term financial survival with the long-term achievement of the humanistic vision.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.2rem' }}>
                        <div style={{ color: 'var(--primary)', fontSize: '1.2rem', width: '30px', textAlign: 'center' }}><i className="fa-solid fa-people-carry-box"></i></div>
                        <div>
                            <h4 style={{ margin: '0 0 0.3rem', color: '#fff' }}>Employee Paradigm</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>Treating employees like co-owners and partners in the mission, rather than just resources.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.2rem' }}>
                        <div style={{ color: 'var(--primary)', fontSize: '1.2rem', width: '30px', textAlign: 'center' }}><i className="fa-solid fa-handshake"></i></div>
                        <div>
                            <h4 style={{ margin: '0 0 0.3rem', color: '#fff' }}>Customer Paradigm</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>Treating customers with transparency and respect, as co-partners driving the same vision.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.2rem' }}>
                        <div style={{ color: 'var(--primary)', fontSize: '1.2rem', width: '30px', textAlign: 'center' }}><i className="fa-solid fa-earth-asia"></i></div>
                        <div>
                            <h4 style={{ margin: '0 0 0.3rem', color: '#fff' }}>Society Paradigm</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>Acting as co-collaborators with the local community, ensuring a balanced cycle of giving and taking.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.2rem' }}>
                        <div style={{ color: 'var(--primary)', fontSize: '1.2rem', width: '30px', textAlign: 'center' }}><i className="fa-solid fa-leaf"></i></div>
                        <div>
                            <h4 style={{ margin: '0 0 0.3rem', color: '#fff' }}>Natural Environment</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>Nurturing the Earth and all non-human life with the same care and conviction as human life.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Participation */}
            <div className="glass-card detail-section" style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>How Participation Works</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    Check-ins are a free way for you to say exploitative businesses got to go. 
                    Your purchases will make the businesses you support to survive and outlast.
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flex: 1, minWidth: '140px' }}>
                        <div style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}><i className="fa-solid fa-qrcode"></i></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Check-In</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Log Visibility</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flex: 1, minWidth: '140px' }}>
                        <div style={{ fontSize: '1.2rem', color: 'var(--accent-success)', marginBottom: '0.5rem' }}><i className="fa-solid fa-receipt"></i></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Verify Spend</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Log Impact</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flex: 1, minWidth: '140px' }}>
                        <div style={{ fontSize: '1.2rem', color: '#F59E0B', marginBottom: '0.5rem' }}><i className="fa-solid fa-medal"></i></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Earn Badges</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Join the Mission</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
