import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';

const About = () => {
    const [stats, setStats] = useState({ gdpPenetration: '0%' });
    const [showManifesto, setShowManifesto] = useState(false);

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
                <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '1rem', color: '#fff' }}>The 30% Goal</h1>
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

            {/* Task 7: For-Good vs Conviction-Driven Definitions */}
            <div className="glass-card" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ padding: '0.5rem' }}>
                    <h4 style={{ color: 'var(--accent-success)', marginBottom: '0.75rem', fontSize: '1.1rem' }}>For-Good Businesses</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                        Enterprises prioritizing positive externalities over pure profit; rejecting short-termism.
                    </p>
                </div>
                <div style={{ padding: '0.5rem' }}>
                    <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Conviction-Driven Founders</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                        People who decided on an outcome — a fairer supply chain, a healthier community, a cleaner environment — and then built a business as the means to get there. The business is the vehicle. The conviction is the engine.
                    </p>
                </div>
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', margin: 0, fontStyle: 'italic', textAlign: 'center' }}>
                        "These founders don't need charity. They need to be seen, verified, and valued — on equal footing with every other business in the market."
                    </p>
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

                {/* Task 2: Trust Signal Comparison Table */}
                <div style={{ marginTop: '2.5rem' }}>
                    <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>How We Compare</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                        The BFG Network is not merely another certification — it is the Relational Trust Infrastructure for the conviction economy.
                    </p>
                    
                    <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Criterion</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>ESG Ratings</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>B Corp</th>
                                    <th style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--accent-primary)', fontWeight: 'bold' }}>theBFG.team</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 'bold' }}>Primary Audience</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Investors & Regulators</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Consumers & Investors</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Relational Networks</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 'bold' }}>Logic</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Risk Management</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Holistic Performance</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Conviction Alignment</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 'bold' }}>Frequency</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Annual</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Triennial (3-Year)</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Annual + Living Signal</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 'bold' }}>Verification</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Opaque Analyst Review</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Third-Party (B Lab)</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Relational Accountability</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>Market Signal</td>
                                    <td style={{ padding: '0.75rem' }}>Quantitative Score</td>
                                    <td style={{ padding: '0.75rem' }}>Composite Badge</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Five-Letter Grading String</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <p style={{ margin: '0 0 0.25rem' }}>• Traditional models prioritize data over relationships.</p>
                        <p style={{ margin: '0 0 0.25rem' }}>• Certifications often focus on past performance rather than directional intent.</p>
                        <p style={{ margin: 0 }}>• High entry costs for existing frameworks exclude smaller conviction-driven enterprises.</p>
                    </div>
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

            {/* Task 1: Full Manifesto (Collapsible) */}
            <div className="glass-card" style={{ marginTop: '1.5rem', padding: 0, overflow: 'hidden', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <button 
                    onClick={() => setShowManifesto(!showManifesto)}
                    style={{ 
                        width: '100%', 
                        padding: '1.5rem', 
                        background: 'none', 
                        border: 'none', 
                        color: '#fff', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer' 
                    }}
                >
                    <h3 style={{ margin: 0 }}>Read the Full Manifesto</h3>
                    <i className={`fa-solid fa-chevron-${showManifesto ? 'up' : 'down'}`}></i>
                </button>

                {showManifesto && (
                    <div className="slide-up" style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <section>
                                <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>The Problem No One Talks About</h4>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                    The world is full of for-good businesses that are invisible to the people who want them to succeed. We call this the Acumen Gap. Founders who have the conviction to build something better often lack the resources to prove it to a market that has been trained to be cynical by decades of greenwashing.
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                    When conviction is invisible, convenience wins. When convenience wins, the status quo remains unchallenged.
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                    The result? Brilliant, necessary enterprises fail—not because their model was wrong, but because their signal was too weak to be heard over the noise of corporate marketing.
                                </p>
                            </section>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                            <section>
                                <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>What We Believe</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem', margin: 0 }}>
                                        <strong>For-Good:</strong> An enterprise that prioritizes positive externalities—the health of the community, the dignity of the worker, the restoration of the environment—over the maximization of short-term profit.
                                    </p>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem', margin: 0 }}>
                                        <strong>Conviction-Driven:</strong> A founder who has decided on an outcome and built a business as the means to achieve it. For them, the business is the vehicle; the conviction is the engine.
                                    </p>
                                </div>
                            </section>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                            <section>
                                <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>Why This Matters to You</h4>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                    Every time you spend a Ringgit, you are voting for the kind of world you want to live in. But you can't vote for what you can't see.
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                    TheBFG.Team exists to give you sight. We provide the infrastructure of trust that allows you to find, verify, and value the businesses that share your convictions.
                                </p>
                            </section>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                            <section>
                                <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>What We Do</h4>
                                <ul style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem', paddingLeft: '1.2rem' }}>
                                    <li><strong>Seen:</strong> We make the invisible work of for-good founders legible to the market.</li>
                                    <li><strong>Verified:</strong> We provide a rigorous, transparent audit of conviction based on the ISO53001 standard.</li>
                                    <li><strong>Valued:</strong> We create a network where your support is recorded as proof that conviction-driven businesses can win.</li>
                                </ul>
                            </section>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                            <section>
                                <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>The World We're Building Toward</h4>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                    We are building toward a Malaysia where for-good businesses account for 30% of the national GDP. A world where "business as usual" means business that is good for everyone.
                                </p>
                            </section>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                            <section>
                                <h4 style={{ color: '#fff', marginBottom: '0.75rem' }}>An Invitation</h4>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                                    This isn't a platform you sign up for and forget. It's a network you participate in. You just need to start choosing—consciously, visibly—to support the businesses that are trying to make things better.
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.7', fontSize: '0.95rem', fontWeight: 'bold' }}>
                                    Accept the invitation. Join the movement.
                                </p>
                            </section>

                            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--accent-primary)', fontStyle: 'italic', marginTop: '1rem' }}>
                                "Making For-Good and Conviction-Driven Businesses be Seen, Verified, and Valued."
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default About;
