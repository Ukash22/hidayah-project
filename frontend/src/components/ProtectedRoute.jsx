import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, token } = useAuth();

    if (loading || (token && !user)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-primary font-bold animate-pulse">Hidayah Security Checking...</p>
                </div>
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const userRole = (user?.role || '').toUpperCase();
    const normalizedAllowedRoles = (allowedRoles || []).map(r => (r || '').toUpperCase());

    if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(userRole)) {
        // Redirect to their own dashboard based on role
        if (userRole === 'ADMIN') return <Navigate to="/admin" replace />;
        if (userRole === 'TUTOR') return <Navigate to="/tutor" replace />;
        if (userRole === 'PARENT') return <Navigate to="/parent" replace />;
        if (userRole === 'STUDENT') return <Navigate to="/student" replace />;
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
