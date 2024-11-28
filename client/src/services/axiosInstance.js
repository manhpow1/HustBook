import axios from 'axios';
import router from '../router';
import { handleError } from '../utils/errorHandler';
import { useUserStore } from '../stores/userStore';
import VueCookies from 'vue-cookies';

// Initialize VueCookies
VueCookies.config('7d'); // Set default cookie expiration to 7 days (adjust as needed)

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:3000/api',
});

// Request interceptor to set auth headers
axiosInstance.interceptors.request.use(
    (config) => {
        const accessToken = VueCookies.get('accessToken');
        const deviceToken = VueCookies.get('deviceToken');
        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        if (deviceToken) {
            config.headers['X-Device-Token'] = deviceToken;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
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

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const userStore = useUserStore();
        const originalRequest = error.config;

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
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

            try {
                const newToken = await userStore.refreshAccessToken();
                if (newToken) {
                    originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
                    processQueue(null, newToken);
                    return axiosInstance(originalRequest);
                } else {
                    processQueue(new Error('Refresh token expired'), null);
                    await userStore.logout();
                    return Promise.reject(error);
                }
            } catch (err) {
                processQueue(err, null);
                await userStore.logout();
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        // Handle other errors
        try {
            handleError(error, router);
        } catch (e) {
            console.error('Error in handleError:', e);
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;