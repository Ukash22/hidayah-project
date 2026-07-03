/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';

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
    const [token, setToken] = useState(localStorage.getItem('access'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const doLogout = useCallback(() => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
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

    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const login = useCallback(async (username, password) => {
        const res = await api.post('/api/auth/login/', { username, password });
        localStorage.setItem('access', res.data.access);
        localStorage.setItem('refresh', res.data.refresh);
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
