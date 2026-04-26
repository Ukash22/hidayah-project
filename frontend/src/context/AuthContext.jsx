/* eslint-disable react-refresh/only-export-components */
// eslint-disable-next-line react-refresh/only-export-components
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('access'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    // Global Interceptor — handles token expiry by attempting a silent refresh
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            async error => {
                const originalRequest = error.config;

                // Skip refresh logic for login/refresh endpoints only (not profile)
                const isLoginOrRefresh = originalRequest?.url?.includes('/api/auth/login/') ||
                    originalRequest?.url?.includes('/api/auth/refresh/');
                if (error.response?.status === 401 && !isLoginOrRefresh && !originalRequest._retry) {
                    originalRequest._retry = true;
                    const refreshToken = localStorage.getItem('refresh');
                    if (refreshToken) {
                        try {
                            const res = await axios.post(
                                `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh/`,
                                { refresh: refreshToken },
                                { headers: { 'Content-Type': 'application/json' } }
                            );
                            const newAccess = res.data.access;
                            localStorage.setItem('access', newAccess);
                            setToken(newAccess);
                            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
                            originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
                            // Retry the original failed request with the new token
                            return axios(originalRequest);
                        } catch (_refreshError) {
                            // Refresh also failed — log the user out
                            doLogout();
                        }
                    } else {
                        doLogout();
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const doLogout = () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        setToken(null);
        setUser(null);
        delete axios.defaults.headers.common['Authorization'];
    };

    const fetchUser = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/profile/`);
            setUser(res.data);
        } catch (err) {
            console.error("Failed to fetch user profile", err);
            doLogout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login/`, { username, password });
        localStorage.setItem('access', res.data.access);
        localStorage.setItem('refresh', res.data.refresh);
        setToken(res.data.access);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (userData) => {
        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register/`, userData);
        return res.data;
    };

    const logout = () => doLogout();

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
