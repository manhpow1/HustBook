import axios from 'axios';
import { handleError } from '../utils/errorHandler';
import { useUserStore } from '../stores/userStore';
import Cookies from 'js-cookie';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
});

// Request interceptor to set Authorization header
axiosInstance.interceptors.request.use(
    (config) => {
        const accessToken = Cookies.get('accessToken');
        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        } else {
            delete config.headers['Authorization'];
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Token refreshing logic
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor to handle 401 errors and refresh tokens
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const userStore = useUserStore();
        const originalRequest = error.config;

        // If the error is not due to authentication, reject it
        if (!error.response || error.response.status !== 401) {
            handleError(error);
            return Promise.reject(error);
        }

        // Prevent infinite loops
        if (originalRequest._retry) {
            handleError(error);
            return Promise.reject(error);
        }

        // If already refreshing, queue the request
        if (isRefreshing) {
            return new Promise(function (resolve, reject) {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return axiosInstance(originalRequest);
                })
                .catch((err) => {
                    return Promise.reject(err);
                });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const currentRefreshToken = Cookies.get('refreshToken');

        if (!currentRefreshToken) {
            await userStore.logout();
            return Promise.reject(error);
        }

        try {
            const response = await axios.post(`${axiosInstance.defaults.baseURL}/api/auth/refresh-token`, {
                refreshToken: currentRefreshToken,
            });

            if (response.data.code === '1000') {
                const { token: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

                // Update tokens in cookies
                Cookies.set('accessToken', newAccessToken, { secure: true, sameSite: 'strict' });
                Cookies.set('refreshToken', newRefreshToken, { secure: true, sameSite: 'strict' });

                // Update Authorization header
                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);

                originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
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
        }
    }
);

export default axiosInstance;