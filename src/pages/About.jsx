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
                    We're building the trust infrastructure for Malaysia's conviction economy.
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
                        <i className="fa-solid fa-circle-info"></i> Every activity here is proof that people choose conviction over convenience — when they can see it.
                    </p>
                </div>
            </div>

            {/* Seen, Verified, Valued Framework */}
            <div className="glass-card" style={{ marginTop: '2rem' }}>
                <h3 style={{ color: '#fff', marginBottom: '1.5rem', textAlign: 'center' }}>
                    What We Do
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-eye" style={{ color: 'var(--primary)' }}></i>
                        </div>
                        <div>
                            <h4 style={{ color: '#fff', margin: '0 0 0.3rem' }}>Seen</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                We work directly with founders to make their real work legible — not by adding spin, but by bridging the gap between brilliant execution and clear communication.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-shield-halved" style={{ color: 'var(--accent-success)' }}></i>
                        </div>
                        <div>
                            <h4 style={{ color: '#fff', margin: '0 0 0.3rem' }}>Verified</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                A living verification system grounded in international standards (ISO53001), evaluating businesses across five dimensions. Not a marketing badge — a transparent, annually-renewed signal.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-heart" style={{ color: 'var(--accent-primary)' }}></i>
                        </div>
                        <div>
                            <h4 style={{ color: '#fff', margin: '0 0 0.3rem' }}>Valued</h4>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                Every check-in and verified purchase is recorded — not as surveillance, but as proof. Proof that conviction-driven businesses can compete, and that people choose purpose when they can see it.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '2.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.25rem' }}>The Manifesto</h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Good businesses are losing. Not because they're wrong — but because no one can see them. We're changing that.</p>
            </div>

            {/* Why We Exist - Acumen Gap & Greenwashing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Bridging the Acumen Gap</h4>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', margin: 0 }}>
                        Many for-good founders are brilliant at their craft but struggle to communicate their impact. We bridge that gap by making their conviction legible to the market.
                    </p>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                    <h4 style={{ color: 'var(--accent-success)', marginBottom: '0.75rem' }}>Displacing Greenwashing</h4>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', margin: 0 }}>
                        Anyone can claim to be "sustainable." We replace marketing spin with a transparent, audited signal that can't be bought or faked.
                    </p>
                </div>
            </div>

            {/* The Grading Paradigms - ISO53001 Style */}
            <div className="glass-card detail-section" style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                    <i className="fa-solid fa-shield-halved fa-2x" style={{ color: 'var(--accent-success)' }}></i>
                    <h3 style={{ color: '#ffffff', margin: 0 }}>TheBFG.Team Living Standard<br /><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Powered by ISO53001</span></h3>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', lineHeight: '1.7' }}>
                    Anyone can claim to be "for good." We built a verification system grounded in international standards that evaluates businesses across 5 stakeholder paradigms — from <strong style={{color: 'var(--accent-success)'}}>A (Paradigm-Defining)</strong> to <strong style={{color: 'var(--accent)'}}>D (Exploitative)</strong>. The result is a transparent signal, not a marketing badge. 
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

                {/* Living Signal Distinction */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: '1.6' }}>
                        <strong style={{ color: 'var(--accent-success)' }}>A Living Signal, not a one-time certification.</strong> Unlike static rating systems, BFG grades are renewed annually. Consumer feedback and real-world observations continuously inform the audit process. This means the signal always reflects the current state of a business's conviction.
                    </p>
                </div>
            </div>

            {/* Participation */}
            <div className="glass-card detail-section" style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <h3 style={{ color: '#ffffff', marginBottom: '1rem' }}>How Participation Works</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    A check-in says: I found a business that cares, and I want the world to know. A purchase says: I'm putting my money where my conviction is.
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flex: 1, minWidth: '140px' }}>
                        <div style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}><i className="fa-solid fa-qrcode"></i></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Support</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>I See You</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', flex: 1, minWidth: '140px' }}>
                        <div style={{ fontSize: '1.2rem', color: 'var(--accent-success)', marginBottom: '0.5rem' }}><i className="fa-solid fa-receipt"></i></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Purchase</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>I Choose You</div>
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
