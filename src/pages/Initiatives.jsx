import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import InitiativeCard from '../components/initiatives/InitiativeCard';

const Initiatives = () => {
    const [initiatives, setInitiatives] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitiatives = async () => {
            try {
                const snapshot = await db.collection('initiatives').get();
                const loaded = [];
                snapshot.forEach(doc => {
                    loaded.push({ id: doc.id, ...doc.data() });
                });
                setInitiatives(loaded);
            } catch (e) {
                console.error("Failed fetching initiatives", e);
            } finally {
                setLoading(false);
            }
        };
        fetchInitiatives();
    }, []);

    const activeInitiatives = initiatives.filter(i => i.status !== 'past' && (!i.endDate || new Date(i.endDate) >= new Date()));
    const pastInitiatives = initiatives.filter(i => i.status === 'past' || (i.endDate && new Date(i.endDate) < new Date()));

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Initiatives</h1>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Discover platform-wide impact campaigns</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Loading Campaigns...
                </div>
            ) : (
                <>
                    <h3 style={{ marginTop: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Active Campaigns</h3>
                    {activeInitiatives.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No active campaigns available right now.</p>
                    ) : (
                        activeInitiatives.map(init => <InitiativeCard key={init.id} initiative={init} />)
                    )}

                    {pastInitiatives.length > 0 && (
                        <>
                            <h3 style={{ marginTop: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', opacity: 0.7 }}>Past Initiatives</h3>
                            <div style={{ opacity: 0.7 }}>
                                {pastInitiatives.map(init => <InitiativeCard key={init.id} initiative={init} />)}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default Initiatives;
