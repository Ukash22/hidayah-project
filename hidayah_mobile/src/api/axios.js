import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import CONFIG from '../config';

const axiosInstance = axios.create({
    baseURL: CONFIG.API_BASE_URL,
});

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const isLoginOrRefresh = originalRequest?.url?.includes('/api/auth/login/') ||
            originalRequest?.url?.includes('/api/auth/refresh/');

        if (error.response?.status === 401 && !isLoginOrRefresh && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = await SecureStore.getItemAsync('refresh');
                if (refreshToken) {
                    const res = await axios.post(
                        `${CONFIG.API_BASE_URL}/api/auth/refresh/`,
                        { refresh: refreshToken },
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                    const newAccess = res.data.access;
                    await SecureStore.setItemAsync('access', newAccess);
                    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
                    return axiosInstance(originalRequest);
                }
            } catch (refreshError) {
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
