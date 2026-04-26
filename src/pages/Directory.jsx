import React, { useState, useEffect, useRef } from 'react';
import useBusinesses from '../hooks/useBusinesses';
import BusinessCard from '../components/business/BusinessCard';
import { db } from '../services/firebase';

const Directory = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [paradigmFilters, setParadigmFilters] = useState([]); // Array of 's', 'e', 'c', 'soc', 'env'
    const [featuredBusiness, setFeaturedBusiness] = useState(null);

    // Server-side paginated hook
    const { businesses, loading, loadingMore, error, hasMore, loadMore } = useBusinesses(searchQuery, activeFilter);

    // Fetch Featured Business (H2-3)
    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const snap = await db.collection('businesses')
                    .where('featured', '==', true)
                    .limit(1)
                    .get();
                if (!snap.empty) {
                    setFeaturedBusiness({ id: snap.docs[0].id, ...snap.docs[0].data() });
                }
            } catch (e) {
                console.warn("Featured business fetch failed", e);
            }
        };
        fetchFeatured();
    }, []);

    // Client-side filtering for Conviction Paradigms (H2-2)
    const filteredBusinesses = businesses.filter(biz => {
        if (paradigmFilters.length === 0) return true;
        if (!biz.score || typeof biz.score !== 'object') return false;
        // Business must have A or B in ALL selected paradigms
        return paradigmFilters.every(p => biz.score[p] === 'A' || biz.score[p] === 'B');
    });

    // Intersection Observer for Infinite Scroll
    const observer = useRef();
    const lastElementRef = (node) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        });
        if (node) observer.current.observe(node);
    };

    const toggleParadigm = (p) => {
        setParadigmFilters(prev => 
            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
        );
    };

    return (
        <div style={{ width: '100%', paddingBottom: '3rem' }}>
            {/* Header & Impact Stats */}
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>The Network</h1>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Businesses that chose purpose. Verified by us. Chosen by you.</p>
            </div>

            {/* Featured Section (H2-3) */}
            {featuredBusiness && (
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: '700', 
                        color: 'var(--accent-primary)', 
                        textTransform: 'uppercase', 
                        letterSpacing: '1px', 
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <i className="fa-solid fa-star"></i> Featured Conviction
                    </div>
                    <div 
                        className="glass-card" 
                        style={{ 
                            padding: '1.5rem', 
                            border: '1px solid var(--accent-primary)44',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0,0,0,0.4))'
                        }}
                    >
                        <BusinessCard business={featuredBusiness} />
                        {featuredBusiness.featuredNote && (
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Spotlight Note:</strong> {featuredBusiness.featuredNote}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="search-bar" style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <i className="fa-solid fa-search" style={{ color: 'var(--text-secondary)' }}></i>
                <input
                    type="text"
                    placeholder="Search for-good businesses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-modern"
                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', marginLeft: '10px', padding: 0 }}
                />
            </div>

            {/* Category Filters */}
            <div className="filters" style={{
                display: 'flex',
                gap: '0.6rem',
                flexWrap: 'wrap',
                padding: '1rem 0',
                paddingBottom: '1.5rem'
            }}>
                {[
                    { id: 'all', label: 'All' },
                    { id: 'arts', label: 'Arts' },
                    { id: 'support', label: 'Biz Support' },
                    { id: 'fnb', label: 'Cafe & Dining' },
                    { id: 'community', label: 'Community' },
                    { id: 'climate', label: 'Ecological Stewardship' },
                    { id: 'education', label: 'Talent' },
                    { id: 'finance', label: 'Finance' },
                    { id: 'foodsystems', label: 'Food Systems' },
                    { id: 'gifts', label: 'Gifts & Crafts' },
                    { id: 'health', label: 'Health' },
                    { id: 'housing', label: 'Housing' },
                    { id: 'manufacturing', label: 'Manufacturing' },
                    { id: 'personal', label: 'Personal Support' },
                    { id: 'pets', label: 'Pets' },
                    { id: 'repairs', label: 'Repairs & Sharing' },
                    { id: 'events', label: 'Social Events' },
                    { id: 'sports', label: 'Sports' },
                    { id: 'nature', label: 'Nature' },
                    { id: 'mobility', label: 'Mobility' }
                ].map(cat => (
                    <button
                        key={cat.id}
                        className={`filter-btn ${activeFilter === cat.id ? 'active' : ''}`}
                        style={{
                            padding: '0.5rem 1.2rem',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            borderRadius: 'var(--radius-full)',
                            background: activeFilter === cat.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                            color: activeFilter === cat.id ? 'white' : 'var(--text-secondary)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                        onClick={() => setActiveFilter(cat.id)}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Paradigm Filters (H2-2) */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingBottom: '1.5rem' }}>
                {[
                    { id: 's', label: 'Strong Shareholders' },
                    { id: 'e', label: 'Strong Employees' },
                    { id: 'c', label: 'Strong Customers' },
                    { id: 'soc', label: 'Strong Society' },
                    { id: 'env', label: 'Strong Environment' }
                ].map(p => (
                    <button
                        key={p.id}
                        onClick={() => toggleParadigm(p.id)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.7rem',
                            whiteSpace: 'nowrap',
                            borderRadius: 'var(--radius-md)',
                            background: paradigmFilters.includes(p.id) ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                            color: paradigmFilters.includes(p.id) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: `1px solid ${paradigmFilters.includes(p.id) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
                            fontWeight: paradigmFilters.includes(p.id) ? '700' : '400',
                            transition: 'all 0.2s'
                        }}
                    >
                        {paradigmFilters.includes(p.id) && <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i>}
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Business List Container */}
            <div id="biz-list" className="business-list" style={{ display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
                {loading && businesses.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
                        <p style={{ marginTop: '1rem' }}>Finding businesses that care...</p>
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--accent)' }}>
                        <i className="fa-solid fa-triangle-exclamation fa-2x"></i>
                        <p>Error loading businesses. Check your connection.</p>
                    </div>
                )}

                {!loading && filteredBusinesses.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <p>
                            {paradigmFilters.length > 0 
                                ? "No loaded businesses match these strict conviction criteria. Try clearing some paradigm filters."
                                : "No businesses found. Try a different search — the network is growing every day."}
                        </p>
                    </div>
                )}

                {filteredBusinesses.map((biz, index) => {
                    if (filteredBusinesses.length === index + 1) {
                        return (
                            <div ref={lastElementRef} key={biz.id}>
                                <BusinessCard business={biz} />
                            </div>
                        );
                    } else {
                        return <BusinessCard key={biz.id} business={biz} />;
                    }
                })}

                {loadingMore && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Directory;
