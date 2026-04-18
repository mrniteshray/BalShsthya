
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, isAuthenticated } = useSelector((state) => state.user);

    // 1. Not Authenticated -> Redirect to Sign In
    if (!isAuthenticated || !user) {
        return <Navigate to="/signin" replace />;
    }

    // 2. Role Check (if roles are specified)
    if (allowedRoles.length > 0) {
        // Backend normalizes to 'doctor', 'parents', 'user'. Ensure we check against lowercase.
        const userRole = (user.role || '').toLowerCase();
        const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!hasAccess) {
            // User is logged in but doesn't have permission -> Redirect to Home
            return <Navigate to="/" replace />;
        }
    }

    // 3. Authorized -> Render content
    return <Outlet />;
};

export default ProtectedRoute;
