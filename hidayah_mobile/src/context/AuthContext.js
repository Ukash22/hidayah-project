import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isImpersonating, setIsImpersonating] = useState(false);

    useEffect(() => {
        loadStoredUser();
    }, []);

    const loadStoredUser = async () => {
        try {
            const storedToken = await SecureStore.getItemAsync('access');
            const impersonating = await SecureStore.getItemAsync('is_impersonating');
            
            if (storedToken) {
                setToken(storedToken);
                setIsImpersonating(impersonating === 'true');
                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                await fetchUser();
            }
        } catch (error) {
            console.error("Error loading user context:", error);
            await doLogout();
        } finally {
            setLoading(false);
        }
    };

    const fetchUser = async () => {
        try {
            const res = await axiosInstance.get(`/api/auth/profile/`);
            setUser(res.data);
        } catch (err) {
            console.error("Failed to fetch user profile", err);
            // If we are impersonating and profile fails, try to return to parent
            if (isImpersonating) {
                await exitImpersonation();
            } else {
                await doLogout();
            }
        }
    };

    const login = async (username, password) => {
        const res = await axiosInstance.post(`/api/auth/login/`, { username, password });
        await SecureStore.setItemAsync('access', res.data.access);
        await SecureStore.setItemAsync('refresh', res.data.refresh);
        setToken(res.data.access);
        setUser(res.data.user);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
        return res.data;
    };

    const impersonateChild = async (childId) => {
        try {
            const res = await axiosInstance.post(`/api/parents/dashboard/impersonate_child/`, {
                child_id: childId
            });
            
            // Backup parent tokens
            const parentAccess = await SecureStore.getItemAsync('access');
            const parentRefresh = await SecureStore.getItemAsync('refresh');
            await SecureStore.setItemAsync('parent_access', parentAccess);
            await SecureStore.setItemAsync('parent_refresh', parentRefresh);
            
            // Set child tokens
            await SecureStore.setItemAsync('access', res.data.access);
            await SecureStore.setItemAsync('refresh', res.data.refresh);
            await SecureStore.setItemAsync('is_impersonating', 'true');
            
            setToken(res.data.access);
            setIsImpersonating(true);
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
            await fetchUser();
            return true;
        } catch (err) {
            console.error("Impersonation failed", err);
            throw err;
        }
    };

    const exitImpersonation = async () => {
        try {
            const parentAccess = await SecureStore.getItemAsync('parent_access');
            const parentRefresh = await SecureStore.getItemAsync('parent_refresh');
            
            if (parentAccess) {
                await SecureStore.setItemAsync('access', parentAccess);
                await SecureStore.setItemAsync('refresh', parentRefresh);
                await SecureStore.deleteItemAsync('parent_access');
                await SecureStore.deleteItemAsync('parent_refresh');
                await SecureStore.deleteItemAsync('is_impersonating');
                
                setToken(parentAccess);
                setIsImpersonating(false);
                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${parentAccess}`;
                await fetchUser();
            } else {
                await doLogout();
            }
        } catch (err) {
            console.error("Exit impersonation failed", err);
            await doLogout();
        }
    };

    const doLogout = async () => {
        await SecureStore.deleteItemAsync('access');
        await SecureStore.deleteItemAsync('refresh');
        await SecureStore.deleteItemAsync('parent_access');
        await SecureStore.deleteItemAsync('parent_refresh');
        await SecureStore.deleteItemAsync('is_impersonating');
        setToken(null);
        setUser(null);
        setIsImpersonating(false);
        delete axiosInstance.defaults.headers.common['Authorization'];
    };

    const logout = async () => await doLogout();

    const register = async (data) => {
        const res = await axiosInstance.post(`/api/auth/register/`, data);
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ 
            user, token, loading, isImpersonating, 
            login, logout, register, impersonateChild, exitImpersonation 
        }}>
            {children}
        </AuthContext.Provider>
    );
};
