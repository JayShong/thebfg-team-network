import React, { useState, useEffect, useRef } from 'react';
import useBusinesses from '../hooks/useBusinesses';
import BusinessCard from '../components/business/BusinessCard';

const Directory = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    
    // Server-side paginated hook
    const { businesses, loading, loadingMore, error, hasMore, loadMore } = useBusinesses(searchQuery, activeFilter);
    
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

    return (
        <div style={{ width: '100%', paddingBottom: '3rem' }}>
            {/* Header & Impact Stats */}
            <div className="page-header" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>Directory</h1>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Discover humanistic businesses</p>
            </div>
            
            {/* Search Bar */}
            <div className="search-bar" style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <i className="fa-solid fa-search" style={{ color: 'var(--text-secondary)' }}></i>
                <input 
                    type="text" 
                    placeholder="Search paradigm businesses..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-modern"
                    style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', marginLeft: '10px', padding: 0 }}
                />
            </div>

            {/* Category Filters */}
            <div className="filters" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '1rem 0', scrollbarWidth: 'none', paddingBottom: '1.5rem' }}>
                <button 
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', width: 'auto', borderRadius: 'var(--radius-full)', background: activeFilter === 'all' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)' }}
                    onClick={() => setActiveFilter('all')}
                >
                    All
                </button>
                <button 
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', width: 'auto', borderRadius: 'var(--radius-full)', background: activeFilter === 'fnb' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)' }}
                    onClick={() => setActiveFilter('fnb')}
                >
                    F&B
                </button>
                <button 
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', width: 'auto', borderRadius: 'var(--radius-full)', background: activeFilter === 'retail' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)' }}
                    onClick={() => setActiveFilter('retail')}
                >
                    Retail
                </button>
                <button 
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', width: 'auto', borderRadius: 'var(--radius-full)', background: activeFilter === 'services' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)' }}
                    onClick={() => setActiveFilter('services')}
                >
                    Services
                </button>
            </div>

            {/* Business List Container */}
            <div id="biz-list" className="business-list" style={{ display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
                {loading && businesses.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
                        <p style={{ marginTop: '1rem' }}>Loading network entities...</p>
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--accent)' }}>
                        <i className="fa-solid fa-triangle-exclamation fa-2x"></i>
                        <p>Error loading businesses. Check your connection.</p>
                    </div>
                )}

                {!loading && businesses.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <p>No paradigm businesses match your search.</p>
                    </div>
                )}

                {businesses.map((biz, index) => {
                    if (businesses.length === index + 1) {
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
