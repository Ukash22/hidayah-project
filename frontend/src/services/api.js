import axios from 'axios';
import { getAccess, setAccess, clearAccess, isImpersonating } from './tokenStore';

const getBaseUrl = () => {
    // Dev: use relative URLs so requests go through the Vite proxy (same
    // origin as the page). This keeps the S4 refresh cookie first-party —
    // no SameSite/Secure cross-host edge cases on reloads.
    if (import.meta.env.DEV) return '';

    let url = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com';

    // Ensure URL is absolute by checking for protocol
    if (url && !url.startsWith('http')) {
        url = `https://${url}`;
    }

    // Remove trailing slash if present
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true, // S4: carries the httpOnly refresh cookie
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper for auth headers
export const getAuthHeader = () => {
    const token = getAccess();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Normalise list responses: some endpoints return bare arrays, paginated
// ones return { count, next, previous, results }. Always get an array back.
export const asList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
};

// Extract a human-readable message from any API error shape:
// {error}, {detail}, DRF field-error dicts, or a fallback for network errors.
export const getApiError = (err, fallback = 'Something went wrong. Please try again.') => {
    const data = err?.response?.data;
    if (!data) return err?.request ? 'Network error — please check your connection.' : fallback;
    if (typeof data === 'string') return data.includes('<html') ? fallback : data;
    if (data.error) return typeof data.error === 'string' ? data.error : fallback;
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    // DRF validation dict: { field: ["msg"], ... }
    if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
            const val = data[firstKey];
            const msg = Array.isArray(val) ? val[0] : val;
            if (typeof msg === 'string') return `${firstKey}: ${msg}`;
        }
    }
    return fallback;
};

// Attach the current access token on every request. This makes the instance
// safe to use from any component regardless of AuthContext effect ordering.
api.interceptors.request.use((config) => {
    if (!config.headers.Authorization) {
        const token = getAccess();
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for token refresh (moved from AuthContext for consistency)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Don't refresh on login or refresh endpoints
        if (originalRequest.url.includes('/api/auth/login/') || originalRequest.url.includes('/api/auth/refresh/')) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // During impersonation the cookie belongs to the PARENT — refreshing
            // would silently swap the session back, so don't try.
            if (isImpersonating()) return Promise.reject(error);

            try {
                // S4: refresh comes from the httpOnly cookie, not from storage.
                const res = await axios.post(`${getBaseUrl()}/api/auth/refresh/`, {}, { withCredentials: true });
                const newAccess = res.data.access;
                setAccess(newAccess);
                api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
                originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
                return api(originalRequest);
            } catch (refreshError) {
                clearAccess();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
