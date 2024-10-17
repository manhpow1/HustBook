import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000/api',
    // Add any default headers or configurations here
});

export default axiosInstance;