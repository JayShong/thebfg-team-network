import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RestrictedAccess from '../../pages/RestrictedAccess';

/**
 * ProtectedRoute component handles role-based access control (RBAC).
 * It ensures that only users with the appropriate permissions can view specific routes.
 * 
 * @param {string} requiredRole - 'admin', 'auditor', or 'member'
 * @param {React.ReactElement} children - The component to render if authorized
 */
const ProtectedRoute = ({ children, requiredRole }) => {
    const { currentUser, isGuest } = useAuth();

    // 1. Check for Guest Access
    if (isGuest) {
        // Guests can only access the Directory, About, and Public Profiles.
        // If they try to access Admin or Audit sections, show restricted access.
        if (requiredRole === 'admin' || requiredRole === 'auditor') {
            return <RestrictedAccess requiredRole={requiredRole === 'admin' ? 'Administrative' : 'Auditor'} />;
        }
    }

    // 2. Check for Authenticated User Roles
    if (currentUser) {
        if (requiredRole === 'admin' && !currentUser.isSuperAdmin && !currentUser.isAdmin) {
            return <RestrictedAccess requiredRole="Administrative" />;
        }

        if (requiredRole === 'auditor' && !currentUser.isSuperAdmin && !currentUser.isAuditor) {
            return <RestrictedAccess requiredRole="Auditor" />;
        }
    }

    // If no role is required or user meets the requirements, render the children
    return children;
};

export default ProtectedRoute;
