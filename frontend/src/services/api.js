import axios from 'axios';

const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_BASE_URL || 'https://hidayah-backend-zgix.onrender.com';
    
    // Ensure URL is absolute by checking for protocol
    if (url && !url.startsWith('http')) {
        url = `https://${url}`;
    }
    
    // Remove trailing slash if present
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    if (import.meta.env.DEV) {
        console.log(`[API] Base URL: ${cleanUrl}`);
    }
    
    return cleanUrl;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper for auth headers
export const getAuthHeader = () => {
    const token = localStorage.getItem('access');
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
        const token = localStorage.getItem('access');
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
            const refreshToken = localStorage.getItem('refresh');
            
            if (refreshToken) {
                try {
                    const res = await axios.post(`${getBaseUrl()}/api/auth/refresh/`, { refresh: refreshToken });
                    const newAccess = res.data.access;
                    localStorage.setItem('access', newAccess);
                    
                    // Update headers
                    api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
                    
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh failed
                    localStorage.removeItem('access');
                    localStorage.removeItem('refresh');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
