import axios from 'axios';
import { handleError } from '../utils/errorHandler';
import { useUserStore } from '../stores/userStore';
import Cookies from 'js-cookie';
import logger from './logging';

// Constants
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms
const MAX_RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT = 30000; // 30 seconds

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    timeout: REQUEST_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-CSRF-Token'
});

// Token refresh state
let isRefreshing = false;
let failedQueue = [];
let retryCount = 0;

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Check if token needs refresh
const shouldRefreshToken = () => {
    const token = Cookies.get('accessToken');
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        return Date.now() > exp - REFRESH_THRESHOLD;
    } catch (error) {
        logger.error('Error parsing token:', error);
        return false;
    }
};

let csrfToken = null;

// Request interceptor
axiosInstance.interceptors.request.use(
    async config => {
        // Add current timestamp to prevent caching
        config.params = {
            ...config.params,
            _t: Date.now()
        };

        // Set authorization header
        const accessToken = Cookies.get('accessToken');
        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // Set CSRF token for mutations
        if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
            if (csrfToken) {
                config.headers['X-CSRF-Token'] = csrfToken;
            }
        }

        // Check if token needs to be refreshed before request
        if (shouldRefreshToken() && !config.url.includes('refresh-token')) {
            try {
                const userStore = useUserStore();
                await userStore.refreshToken();
                const newToken = Cookies.get('accessToken');
                if (newToken) {
                    config.headers['Authorization'] = `Bearer ${newToken}`;
                }
            } catch (error) {
                logger.error('Error refreshing token:', error);
            }
        }

        return config;
    },
    error => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    response => {
        // Capture CSRF token from response headers
        const newCsrfToken = response.headers['x-csrf-token'];
        if (newCsrfToken) {
            csrfToken = newCsrfToken;
        }
        return response;
    },
    async error => {
        const originalRequest = error.config;
        const userStore = useUserStore();

        // If error is not due to authentication or already retried, reject
        if (!error.response || 
            error.response.status !== 401 || 
            originalRequest._retry || 
            retryCount >= MAX_RETRY_ATTEMPTS) {
            handleError(error);
            return Promise.reject(error);
        }

        // If already refreshing, queue the request
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then(token => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return axiosInstance(originalRequest);
                })
                .catch(err => {
                    return Promise.reject(err);
                });
        }

        try {
            isRefreshing = true;
            originalRequest._retry = true;
            retryCount++;

            const refreshToken = Cookies.get('refreshToken');
            if (!refreshToken) {
                await userStore.logout();
                throw new Error('No refresh token available');
            }

            // Attempt to refresh token
            const response = await axios.post(
                `${axiosInstance.defaults.baseURL}/api/auth/refresh-token`,
                { refreshToken },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.code === '1000') {
                const { token: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

                // Update cookies and headers
                Cookies.set('accessToken', newAccessToken, {
                    secure: true,
                    sameSite: 'strict',
                    expires: 1/96 // 15 minutes
                });
                
                Cookies.set('refreshToken', newRefreshToken, {
                    secure: true,
                    sameSite: 'strict',
                    expires: 7 // 7 days
                });

                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

                // Process queued requests
                processQueue(null, newAccessToken);

                // Retry original request
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return axiosInstance(originalRequest);
            } else {
                throw new Error(response.data.message || 'Failed to refresh token');
            }
        } catch (err) {
            processQueue(err, null);
            await userStore.logout();
            handleError(err);
            return Promise.reject(err);
        } finally {
            isRefreshing = false;
            if (retryCount >= MAX_RETRY_ATTEMPTS) {
                retryCount = 0;
                await userStore.logout();
            }
        }
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

export default axiosInstance;
