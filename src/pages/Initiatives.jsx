import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../services/firebase';
import InitiativeCard from '../components/initiatives/InitiativeCard';

/**
 * FUTURE ROADMAP:
 * Joining or contributing to campaigns directly through the platform is planned for a future release.
 * Currently, user participation is inferred by general network activity (check-ins/purchases).
 */

const Initiatives = () => {
    const [initiatives, setInitiatives] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const observer = useRef();
    const PAGE_SIZE = 5;

    const fetchInitiatives = useCallback(async () => {
        if (loading || !hasMore) return;
        
        setLoading(true);
        console.log("INFINITE_SCROLL: Fetching initiatives...");
        try {
            let query = db.collection('initiatives').orderBy('createdAt', 'desc');

            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }

            const snapshot = await query.limit(PAGE_SIZE).get();
            
            if (!snapshot.empty) {
                const newInitiatives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setInitiatives(prev => [...prev, ...newInitiatives]);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                
                // If we got fewer items than PAGE_SIZE, we've reached the end
                if (snapshot.docs.length < PAGE_SIZE) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Failed fetching initiatives", e);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, lastDoc]);

    // Intersection Observer for infinite scroll
    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchInitiatives();
            }
        }, { threshold: 0.5 });
        
        if (node) observer.current.observe(node);
    }, [loading, hasMore, fetchInitiatives]);

    useEffect(() => {
        fetchInitiatives();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeInitiatives = initiatives.filter(i => i.status !== 'past' && (!i.endDate || new Date(i.endDate) >= new Date()));
    const pastInitiatives = initiatives.filter(i => i.status === 'past' || (i.endDate && new Date(i.endDate) < new Date()));

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Initiatives</h1>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Discover platform-wide impact campaigns</p>
            </div>

            <div className="initiatives-container">
                {activeInitiatives.length > 0 && (
                    <>
                        <h3 style={{ marginTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>Active Campaigns</h3>
                        {activeInitiatives.map(init => <InitiativeCard key={init.id} initiative={init} />)}
                    </>
                )}

                {pastInitiatives.length > 0 && (
                    <>
                        <h3 style={{ marginTop: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', opacity: 0.7 }}>Historical Record</h3>
                        <div style={{ opacity: 0.7 }}>
                            {pastInitiatives.map(init => <InitiativeCard key={init.id} initiative={init} />)}
                        </div>
                    </>
                )}

                {/* Loading / End of List Indicator */}
                <div 
                    ref={lastElementRef} 
                    style={{ 
                        textAlign: 'center', 
                        padding: '2rem', 
                        color: 'var(--text-secondary)',
                        marginTop: '1rem'
                    }}
                >
                    {loading ? (
                        <div className="loading-shimmer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}></i>
                            <span style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>LOADING IMPACT...</span>
                        </div>
                    ) : (
                        !hasMore && initiatives.length > 0 && (
                            <div style={{ opacity: 0.5, fontSize: '0.8rem' }}>
                                <i className="fa-solid fa-flag-checkered" style={{ marginBottom: '0.5rem' }}></i>
                                <p>You've reached the foundation of the network record.</p>
                            </div>
                        )
                    )}

                    {!loading && initiatives.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <i className="fa-solid fa-flag fa-3x" style={{ opacity: 0.2, marginBottom: '1rem' }}></i>
                            <p>No initiatives found yet. Stay tuned for future impact.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Initiatives;
