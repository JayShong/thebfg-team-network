import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Newsreel from './Newsreel';
import BottomNav from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout = () => {
    const { currentUser, isGuest, isSyncing, syncRoles, logout } = useAuth();
    const navigate = useNavigate();

    const handleRefresh = async () => {
        const result = await syncRoles();
        if (result.success) {
            console.log("✅ Roles synchronized successfully.");
        } else {
            console.error("❌ Sync failed:", result.error);
        }
    };

    return (
        <div id="app-container">
            <Newsreel />
            
            <header className="glass-header">
                <div className="logo">
                    <i className="fa-brands fa-leafygreen" style={{color: 'var(--accent-primary)'}}></i>
                    TheBFG.Team
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="icon-btn" onClick={handleRefresh} title="Verify Identity Rights" disabled={isSyncing}>
                        <i className={`fa-solid ${isSyncing ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                    </button>
                    <button className="icon-btn" onClick={() => navigate('/about')} title="Our Manifesto">
                        <i className="fa-solid fa-info-circle"></i>
                    </button>
                    <button className="icon-btn" onClick={() => navigate('/profile')} title="Account Details">
                        <i className="fa-solid fa-user-circle"></i>
                    </button>
                </div>
            </header>

            <main className="view active" style={{ display: 'block', paddingBottom: '90px' }}>
                <Outlet />
            </main>

            <BottomNav />
        </div>
    );
};

export default MainLayout;
