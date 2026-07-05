/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { getAccess, setAccess, clearAccess } from '../services/tokenStore';

// Auth state context — token, login, logout, register
// Only re-renders consumers on login/logout, not on profile data changes
const AuthStateContext = createContext();

// User profile context — user object and loading flag
// Consumers re-render when profile loads or updates
const UserContext = createContext();

// Combined hook for components that need everything (backward-compatible)
export const useAuth = () => {
    const auth = useContext(AuthStateContext);
    const profile = useContext(UserContext);
    return { ...auth, ...profile };
};

// Granular hooks for optimized consumers
export const useToken = () => useContext(AuthStateContext);
export const useUser = () => useContext(UserContext);

export const AuthProvider = ({ children }) => {
    // S4: the access token lives in memory (tokenStore), never in localStorage.
    // The only localStorage 'access' is the parent→child impersonation override.
    const [token, setToken] = useState(getAccess());
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const doLogout = useCallback(() => {
        api.post('/api/auth/logout/').catch(() => { /* cookie clear is best-effort */ });
        clearAccess();
        localStorage.removeItem('parent_access');
        localStorage.removeItem('parent_refresh');
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
    }, []);

    const fetchUser = useCallback(async () => {
        try {
            const res = await api.get('/api/auth/profile/');
            setUser(res.data);
        } catch (err) {
            console.error('Failed to fetch user profile', err);
            doLogout();
        } finally {
            setLoading(false);
        }
    }, [doLogout]);

    // Bootstrap: impersonation override wins; otherwise obtain a fresh access
    // token from the httpOnly refresh cookie. No cookie -> logged out.
    useEffect(() => {
        let cancelled = false;
        const boot = async () => {
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                fetchUser();
                return;
            }
            try {
                const res = await api.post('/api/auth/refresh/', {});
                if (cancelled) return;
                setAccess(res.data.access);
                setToken(res.data.access);
                // fetchUser runs on the next effect pass (token changed)
            } catch {
                if (!cancelled) setLoading(false);
            }
        };
        boot();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const login = useCallback(async (username, password) => {
        const res = await api.post('/api/auth/login/', { username, password });
        setAccess(res.data.access);          // memory only — refresh is in the httpOnly cookie
        setToken(res.data.access);
        setUser(res.data.user);
        return res.data;
    }, []);

    const register = useCallback(async (userData) => {
        const res = await api.post('/api/auth/register/', userData);
        return res.data;
    }, []);

    const logout = useCallback(() => doLogout(), [doLogout]);

    return (
        <AuthStateContext.Provider value={{ token, login, register, logout }}>
            <UserContext.Provider value={{ user, loading }}>
                {children}
            </UserContext.Provider>
        </AuthStateContext.Provider>
    );
};
