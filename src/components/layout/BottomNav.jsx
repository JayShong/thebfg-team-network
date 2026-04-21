import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav id="bottom-nav">
            <button 
                className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => navigate('/')}
            >
                <i className="fa-solid fa-chart-pie"></i>
                <span>Home</span>
            </button>
            <button 
                className={`nav-item ${location.pathname === '/directory' ? 'active' : ''}`}
                onClick={() => navigate('/directory')}
            >
                <i className="fa-solid fa-store"></i>
                <span>Directory</span>
            </button>
            
            <button 
                className={`nav-item ${location.pathname === '/initiatives' ? 'active' : ''}`}
                onClick={() => navigate('/initiatives')}
            >
                <i className="fa-solid fa-hand-holding-heart"></i>
                <span>Initiatives</span>
            </button>

            <button 
                className={`nav-item ${location.pathname === '/privileges' ? 'active' : ''}`}
                onClick={() => navigate('/privileges')}
            >
                <i className="fa-solid fa-gem"></i>
                <span>Privileges</span>
            </button>
            
            <button 
                className={`nav-item scan-btn ${location.pathname === '/scan' ? 'active' : ''}`}
                onClick={() => navigate('/scan')}
            >
                <div className="scan-btn-inner">
                    <i className="fa-solid fa-qrcode"></i>
                </div>
                <span>Scan</span>
            </button>
        </nav>
    );
};

export default BottomNav;
