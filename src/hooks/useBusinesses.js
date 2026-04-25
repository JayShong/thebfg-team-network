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

            // 2. Apply Server-Side Search (Starts With)
            if (searchQuery.trim()) {
                const term = searchQuery.trim();
                // Firestore "Starts With" pattern
                query = query.where('name', '>=', term)
                             .where('name', '<=', term + '\uf8ff');
            } else {
                // Default sorting by impact if no search
                query = query.orderBy('smiles', 'desc');
            }

            // 3. Apply Pagination
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
                setBusinesses(prev => [...prev, ...loaded]);
            } else {
                setBusinesses(loaded);
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
