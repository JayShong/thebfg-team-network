import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ allowedRole }) => {
    const { currentUser } = useAuth();

    // Not logged in at all -> send to root/directory (which triggers AuthModal via Outlet / Global state if we implement it, or just root)
    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    // Role-based guarding
    if (allowedRole === 'admin' && !currentUser.isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    if (allowedRole === 'auditor' && !currentUser.isSuperAdmin && !currentUser.isAuditor) {
        return <Navigate to="/" replace />;
    }

    // Pass through to the protected component
    return <Outlet />;
};

export default ProtectedRoute;
