import axios from 'axios';
import { useErrorHandler } from '@/utils/errorHandler';
import Cookies from 'js-cookie';
import logger from './logging';
import router from '@/router';

// Initialize deviceId first
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
}

// Constants
export const DEVICE_ID = deviceId;
const MAX_RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT = 30000; // 30 seconds
const { handleError } = useErrorHandler();
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
    baseURL: baseURL.toString(),
    timeout: REQUEST_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        //'X-Requested-With': 'XMLHttpRequest',
    },
    // xsrfCookieName: 'XSRF-TOKEN',
    // xsrfHeaderName: 'X-CSRF-Token',
});

// Request retry state
let retryCount = 0;


// Request interceptor
axiosInstance.interceptors.request.use(
    async config => {
        const { useUserStore } = await import('@/stores/userStore'); // Lazy import
        const userStore = useUserStore();

        const accessToken = Cookies.get('accessToken');
        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        if (deviceId) {
            config.headers['Device-ID'] = deviceId;
        }

        // Comment out CSRF token check
        /*
        if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
            try {
                if (!csrfToken) {
                    csrfToken = await getCsrfToken(); 
                }
                config.headers['X-CSRF-Token'] = csrfToken;
            } catch (error) {
                logger.error('Error setting CSRF token:', error);
            }
        }
        */


        return config;
    },
    error => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    response => {
        /*
const newCsrfToken = response.headers['x-csrf-token'];
if (newCsrfToken) {
    csrfToken = newCsrfToken;
}
*/
        response.headers['x-response-time'] = Date.now();
        return response;
    },
    async error => {
        const originalRequest = error.config;
        const { useUserStore } = await import('@/stores/userStore'); // Lazy import
        const userStore = useUserStore();
        /*
                if (
                    error.response?.data?.code === '9998' &&
                    error.response?.data?.message?.includes('CSRF') &&
                    !originalRequest._csrfRetry
                ) {
                    try {
                        originalRequest._csrfRetry = true;
                        csrfToken = await getCsrfToken();
                        originalRequest.headers['X-CSRF-Token'] = csrfToken;
                        return axiosInstance(originalRequest);
                    } catch (retryError) {
                        logger.error('CSRF token refresh failed:', retryError);
                        return Promise.reject(retryError);
                    }
                }
        */

        if (!error.response || error.response.status !== 401) {
            handleError(error);
            return Promise.reject(error);
        }

        // Handle 401 Unauthorized
        Cookies.remove('accessToken', { path: '/' });
        await userStore.logout();
        handleError(error);
        return Promise.reject(error);
    }
);

// Add response timestamp
axiosInstance.interceptors.response.use(
    response => {
        response.headers['x-response-time'] = Date.now();
        return response;
    },
    error => {
        if (error.response) {
            error.response.headers['x-response-time'] = Date.now();
        }
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const { useUserStore } = await import('@/stores/userStore'); // Lazy import
        const userStore = useUserStore();
        if (error.response?.status === 401) {
            // Clear auth cookies
            Cookies.remove('accessToken');
            Cookies.remove('refreshToken');
            
            // Clear auth headers
            delete axiosInstance.defaults.headers.common['Authorization'];
            
            // Clear user state and redirect
            await userStore.clearAuthState();
            router.push('/login');
            
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
