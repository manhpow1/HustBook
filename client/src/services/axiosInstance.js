import axios from 'axios';
import router from '../router';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:3000/api',
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Logout and redirect to login page on 401
            localStorage.removeItem('token');
            localStorage.removeItem('deviceToken');
            router.push({ name: 'Login', query: { redirect: router.currentRoute.fullPath } });
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;