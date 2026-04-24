import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import InitiativeCard from '../components/initiatives/InitiativeCard';

/**
 * FUTURE ROADMAP:
 * Joining or contributing to campaigns directly through the platform is planned for a future release.
 * Currently, user participation is inferred by general network activity (check-ins/purchases).
 */

const Initiatives = () => {
    const [initiatives, setInitiatives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageStack, setPageStack] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const PAGE_SIZE = 3;

    const fetchInitiatives = async (direction = 'next') => {
        setLoading(true);
        try {
            let query = db.collection('initiatives').orderBy('createdAt', 'desc');

            if (direction === 'next' && pageStack.length > 0) {
                // Use the last visible document from the current initiatives to startAfter
                const lastVisible = pageStack[pageStack.length - 1].lastDoc;
                if (lastVisible) query = query.startAfter(lastVisible);
            } else if (direction === 'prev') {
                const prevPage = pageStack[pageStack.length - 2];
                if (prevPage) {
                    query = query.startAt(prevPage.firstDoc);
                }
                // pop the current page from stack
                setPageStack(prev => prev.slice(0, -1));
            }

            // Fetch PAGE_SIZE + 1 to check if there's a next page
            const snapshot = await query.limit(PAGE_SIZE + 1).get();
            
            if (!snapshot.empty) {
                const docs = snapshot.docs;
                const isMore = docs.length > PAGE_SIZE;
                const itemsToDisplay = isMore ? docs.slice(0, PAGE_SIZE) : docs;
                
                const loaded = itemsToDisplay.map(doc => ({ id: doc.id, ...doc.data() }));
                setInitiatives(loaded);
                setHasMore(isMore);

                if (direction === 'next') {
                    setPageStack(prev => [...prev, { 
                        firstDoc: docs[0], 
                        lastDoc: itemsToDisplay[itemsToDisplay.length - 1] 
                    }]);
                }
            } else {
                setInitiatives([]);
                setHasMore(false);
            }
        } catch (e) {
            console.error("Failed fetching initiatives", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitiatives();
    }, []);

    const activeInitiatives = initiatives.filter(i => i.status !== 'past' && (!i.endDate || new Date(i.endDate) >= new Date()));
    const pastInitiatives = initiatives.filter(i => i.status === 'past' || (i.endDate && new Date(i.endDate) < new Date()));

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Initiatives</h1>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Discover platform-wide impact campaigns</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        className="btn btn-secondary" 
                        disabled={loading || pageStack.length <= 1} 
                        onClick={() => fetchInitiatives('prev')}
                        style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                    >
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        disabled={loading || !hasMore} 
                        onClick={() => fetchInitiatives('next')}
                        style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                    >
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Loading Campaigns...
                </div>
            ) : (
                <>
                    {activeInitiatives.length > 0 && (
                        <h3 style={{ marginTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Active Campaigns</h3>
                    )}
                    {activeInitiatives.map(init => <InitiativeCard key={init.id} initiative={init} />)}

                    {pastInitiatives.length > 0 && (
                        <>
                            <h3 style={{ marginTop: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', opacity: 0.7 }}>Historical Record</h3>
                            <div style={{ opacity: 0.7 }}>
                                {pastInitiatives.map(init => <InitiativeCard key={init.id} initiative={init} />)}
                            </div>
                        </>
                    )}

                    {initiatives.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <i className="fa-solid fa-flag fa-3x" style={{ opacity: 0.2, marginBottom: '1rem' }}></i>
                            <p>End of record. No more initiatives found.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Initiatives;
