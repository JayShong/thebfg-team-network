import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/firebase';

export const useInitiatives = () => {
    const [initiatives, setInitiatives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    
    // Track pagination state
    const lastVisible = useRef(null);
    const PAGE_SIZE = 5; // Initiatives are bigger cards, so smaller page size

    const fetchInitiatives = useCallback(async (isLoadMore = false) => {
        if (!isLoadMore) {
            setLoading(true);
            lastVisible.current = null;
        } else {
            setLoadingMore(true);
        }

        try {
            let query = db.collection('initiatives').orderBy('createdAt', 'desc');

            if (isLoadMore && lastVisible.current) {
                query = query.startAfter(lastVisible.current);
            }

            const snapshot = await query.limit(PAGE_SIZE).get();

            const loaded = [];
            snapshot.forEach((doc) => {
                loaded.push({ id: doc.id, ...doc.data() });
            });

            // Update pagination anchor
            lastVisible.current = snapshot.docs[snapshot.docs.length - 1];
            setHasMore(snapshot.docs.length === PAGE_SIZE);

            if (isLoadMore) {
                setInitiatives(prev => [...prev, ...loaded]);
            } else {
                setInitiatives(loaded);
            }
            
            setLoading(false);
            setLoadingMore(false);
        } catch (err) {
            console.error("Initiatives fetch failed:", err);
            setError(err);
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchInitiatives(false);
    }, [fetchInitiatives]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchInitiatives(true);
        }
    };

    return { initiatives, loading, loadingMore, error, hasMore, loadMore };
};

export default useInitiatives;
