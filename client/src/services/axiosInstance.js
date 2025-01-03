import axios from 'axios';
import { useErrorHandler } from '@/utils/errorHandler';
import Cookies from 'js-cookie';
import logger from './logging';
import router from '@/router';

// Constants
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms
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

// Token refresh state
let isRefreshing = false;
let failedQueue = [];
let retryCount = 0;
/*
let csrfToken = null;

const getCsrfToken = async () => {
    try {
        const response = await axios.get(`${axiosInstance.defaults.baseURL}/api/auth/csrf-token`);
        return response.data.csrfToken;
    } catch (error) {
        logger.error('Error fetching CSRF token:', error);
        throw error;
    }
};
*/

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
        const exp = payload.exp * 1000;
        return Date.now() > exp - REFRESH_THRESHOLD;
    } catch (error) {
        logger.error('Error parsing token:', error);
        return false;
    }
};

// Request interceptor
axiosInstance.interceptors.request.use(
    async config => {
        const { useUserStore } = await import('@/stores/userStore'); // Lazy import
        const userStore = useUserStore();

        const accessToken = Cookies.get('accessToken');
        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
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

        if (shouldRefreshToken() && !config.url.includes('refresh-token')) {
            try {
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

        if (
            !error.response ||
            error.response.status !== 401 ||
            originalRequest._retry ||
            retryCount >= MAX_RETRY_ATTEMPTS
        ) {
            handleError(error);
            return Promise.reject(error);
        }

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

            /*
            const newCsrfToken = await getCsrfToken();
            csrfToken = newCsrfToken;
            */

            const response = await axios.post(
                `${axiosInstance.defaults.baseURL}/api/auth/refresh-token`,
                { refreshToken },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        // 'X-CSRF-Token': newCsrfToken,
                    },
                }
            );

            if (response.data.code === '1000') {
                const { token: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

                Cookies.set('accessToken', newAccessToken, {
                    secure: true,
                    sameSite: 'strict',
                    expires: 1 / 96,
                });

                Cookies.set('refreshToken', newRefreshToken, {
                    secure: true,
                    sameSite: 'strict',
                    expires: 7,
                });

                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);

                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                // originalRequest.headers['X-CSRF-Token'] = newCsrfToken;

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

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const { useUserStore } = await import('@/stores/userStore'); // Lazy import
        const userStore = useUserStore();
        if (error.response?.status === 401) {
            await userStore.clearAuthState();
            router.push('/login');
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
