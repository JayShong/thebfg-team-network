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
        if (requiredRole === 'merchant' || requiredRole === 'auditor') {
            return <RestrictedAccess requiredRole={requiredRole === 'merchant' ? 'Merchant Assistant' : 'Auditor'} />;
        }
    }
 
    // 2. Check for Authenticated User Roles
    if (currentUser) {
        if (requiredRole === 'superadmin' && !currentUser.isSuperAdmin) {
            return <RestrictedAccess requiredRole="Superadmin Governance" />;
        }

        if (requiredRole === 'merchant' && !currentUser.isSuperAdmin && !currentUser.isCustomerSuccess) {
            return <RestrictedAccess requiredRole="Merchant Operations" />;
        }
 
        if (requiredRole === 'auditor' && !currentUser.isSuperAdmin && !currentUser.isAuditor) {
            return <RestrictedAccess requiredRole="Auditor" />;
        }

        if (requiredRole === 'customerSuccess' && !currentUser.isSuperAdmin && !currentUser.isCustomerSuccess) {
            return <RestrictedAccess requiredRole="Customer Success" />;
        }
    }
 
    // If no role is required or user meets the requirements, render the children
    return children;
};

export default ProtectedRoute;
