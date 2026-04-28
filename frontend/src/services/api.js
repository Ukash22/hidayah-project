import axios from 'axios';

const getBaseUrl = () => {
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
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper for auth headers
export const getAuthHeader = () => {
    const token = localStorage.getItem('access');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

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
