import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/firebase';

export const useBusinesses = (searchQuery = '', activeFilter = 'all') => {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    
    // Track pagination state
    const lastVisible = useRef(null);
    const PAGE_SIZE = 10;

    const fetchBusinesses = useCallback(async (isLoadMore = false) => {
        if (!isLoadMore) {
            setLoading(true);
            lastVisible.current = null;
        } else {
            setLoadingMore(true);
        }

        try {
            let query = db.collection('businesses');

            // 1. Apply Server-Side Filters
            if (activeFilter !== 'all') {
                const industryMap = {
                    'arts': 'Arts & Culture',
                    'support': 'Business Support Services',
                    'fnb': 'Cafe and Restaurants',
                    'community': 'Community',
                    'climate': 'Ecological Stewardship',
                    'education': 'Education & Talent',
                    'finance': 'Finance',
                    'foodsystems': 'Food Systems',
                    'gifts': 'Gifts & Crafts',
                    'health': 'Health & Wellness',
                    'housing': 'Housing & Living',
                    'manufacturing': 'Manufacturing & Logistics',
                    'personal': 'Personal Support Services',
                    'pets': 'Pets',
                    'repairs': 'Repairs, Recycling & Sharing',
                    'events': 'Social Events',
                    'sports': 'Sports',
                    'nature': 'Tourism & Nature',
                    'mobility': 'Transportation & Mobility'
                };
                query = query.where('industry', '==', industryMap[activeFilter]);
            }

            // 2. Apply Search (Smart Local Fallback for Case-Insensitivity)
            if (searchQuery.trim()) {
                const term = searchQuery.trim().toLowerCase();
                
                // For staff/portal use or smaller directories, we fetch a larger batch 
                // and filter locally to bypass Firestore's case-sensitivity limitations.
                const snapshot = await query.limit(100).get(); 
                const allLoaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                const filtered = allLoaded.filter(biz => 
                    biz.name?.toLowerCase().includes(term) || 
                    biz.id?.toLowerCase().includes(term) ||
                    biz.founder?.toLowerCase().includes(term)
                );

                setBusinesses(filtered);
                setHasMore(false); // Search results are usually contained in the batch
            } else {
                // Default logic for browsable directory (Ordered by newest first)
                // This ensures businesses without a 'smiles' score yet are NOT hidden.
                query = query.orderBy('createdAt', 'desc');
                
                if (isLoadMore && lastVisible.current) {
                    query = query.startAfter(lastVisible.current);
                }

                const snapshot = await query.limit(PAGE_SIZE).get();
                const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                lastVisible.current = snapshot.docs[snapshot.docs.length - 1];
                setHasMore(snapshot.docs.length === PAGE_SIZE);

                if (isLoadMore) {
                    setBusinesses(prev => [...prev, ...loaded]);
                } else {
                    setBusinesses(loaded);
                }
            }
            
            setLoading(false);
            setLoadingMore(false);
        } catch (err) {
            console.error("Directory fetch failed:", err);
            setError(err);
            setLoading(false);
            setLoadingMore(false);
        }
    }, [searchQuery, activeFilter]);

    // Re-fetch when filters change
    useEffect(() => {
        fetchBusinesses(false);
    }, [fetchBusinesses]);

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchBusinesses(true);
        }
    };

    return { businesses, loading, loadingMore, error, hasMore, loadMore };
};

export default useBusinesses;
