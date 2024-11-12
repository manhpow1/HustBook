import axios from 'axios';
import router from '../router';
import { handleError } from '../utils/errorHandler';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:3000/api',
});

// Initialize auth headers
let authHeaders = {};

// Request interceptor to set auth headers
axiosInstance.interceptors.request.use((config) => {
    if (authHeaders.Authorization) {
        config.headers['Authorization'] = authHeaders.Authorization;
    }

    if (authHeaders['X-Device-Token']) {
        config.headers['X-Device-Token'] = authHeaders['X-Device-Token'];
    }
    return config;
});

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        try {
            handleError(error, router);
        } catch (e) {
            console.error('Error in handleError:', e);
        }
        return Promise.reject(error);
    }
);

// Expose the setAuthHeaders function
export const setAuthHeaders = (token, deviceToken) => {
    authHeaders = {
        Authorization: token ? `Bearer ${token}` : undefined,
        'X-Device-Token': deviceToken || undefined,
    };
};

export default axiosInstance;
