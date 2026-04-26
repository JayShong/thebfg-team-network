import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RestrictedAccess from '../../pages/RestrictedAccess';

/**
 * ProtectedRoute component handles role-based access control (RBAC).
 * It ensures that only users with the appropriate permissions can view specific routes.
 */
const ProtectedRoute = ({ children, requiredRole, allowStaff = false }) => {
    const { currentUser, isGuest, isClaimsResolving } = useAuth();

    if (isClaimsResolving && !isGuest) {
        return (
            <div style={{ height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <i className="fa-solid fa-shield-halved fa-spin fa-3x" style={{ color: 'var(--accent-primary)', opacity: 0.5 }}></i>
            </div>
        );
    }

    // 1. Check for Guest Access
    if (isGuest) {
        if (requiredRole && requiredRole !== 'member') {
            return <RestrictedAccess requiredRole={requiredRole} />;
        }
    }

    // 2. Check for Authenticated User Roles
    if (currentUser) {
        // Superadmins bypass everything
        if (currentUser.isSuperAdmin) return children;

        const roleRequirements = {
            superadmin: currentUser.isSuperAdmin,
            customerSuccess: currentUser.isCustomerSuccess,
            auditor: currentUser.isAuditor,
            member: true
        };

        // Check if role is satisfied
        let isAuthorized = !requiredRole || roleRequirements[requiredRole];

        // 3. STAFF OVERRIDE: Allow Business Owners/Managers/Crews to access Business portals
        if (!isAuthorized && allowStaff && requiredRole === 'customerSuccess') {
            if (currentUser.isBusinessStaff || currentUser.isOwner) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return <RestrictedAccess requiredRole={requiredRole} />;
        }
    }

    return children;
};

export default ProtectedRoute;
