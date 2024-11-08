import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import axiosInstance from './axiosInstance';
import { handleError } from '../utils/errorHandler'; // Ensure handleError is imported
import router from '../router';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});

// Initialize auth headers
let authHeaders = {};

// Request interceptor to set auth headers
api.interceptors.request.use(config => {
    if (authHeaders.Authorization) {
        config.headers['Authorization'] = authHeaders.Authorization;
    }

    if (authHeaders['X-Device-Token']) {
        config.headers['X-Device-Token'] = authHeaders['X-Device-Token'];
    }
    return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
    response => response,
    error => {
        try {
            handleError(error, router);
        } catch (e) {
            console.error('Error in handleError:', e);
        }
        return Promise.reject(error);
    }
);

const apiService = {
    // Generic GET method
    async get(url, config = {}) {
        try {
            return await api.get(url, config);
        } catch (error) {
            handleError(error, router);
            throw error;
        }
    },

    // Generic POST method
    async post(url, data, config = {}) {
        try {
            return await api.post(url, data, config);
        } catch (error) {
            handleError(error, router);
            throw error;
        }
    },

    // Generic PUT method
    async put(url, data, config = {}) {
        try {
            return await api.put(url, data, config);
        } catch (error) {
            handleError(error, router);
            throw error;
        }
    },

    // Generic DELETE method
    async delete(url, config = {}) {
        try {
            return await api.delete(url, config);
        } catch (error) {
            handleError(error, router);
            throw error;
        }
    },

    // Post-related API calls
    getPost(postId) {
        return this.get(API_ENDPOINTS.GET_POST(postId));
    },

    likePost(postId) {
        return this.post(API_ENDPOINTS.LIKE_POST(postId));
    },

    createPost(postData) {
        return this.post(API_ENDPOINTS.ADD_POST, postData);
    },

    updatePost(postId, postData) {
        return this.put(`${API_ENDPOINTS.UPDATE_POST}/${postId}`, postData);
    },

    deletePost(postId) {
        return this.delete(`${API_ENDPOINTS.DELETE_POST}/${postId}`);
    },

    reportPost(postId, reason, details) {
        return axiosInstance.post(API_ENDPOINTS.REPORT_POST(postId), {
            reason,
            details,
        });
    },
    getListPosts(params = {}) {
        return this.get(API_ENDPOINTS.GET_LIST_POSTS, { params });
    },

    // Comment-related API calls
    addComment(postId, content) {
        return this.post(API_ENDPOINTS.ADD_COMMENT(postId), { content });
    },

    updateComment(id, data) {
        return this.put(`${API_ENDPOINTS.UPDATE_COMMENT}/${id}`, data);
    },

    deleteComment(id) {
        return this.delete(`${API_ENDPOINTS.DELETE_COMMENT}/${id}`);
    },

    getComments(postId, index = 0, count = 10) {
        const url = API_ENDPOINTS.GET_COMMENTS(postId, index, count);
        return this.get(url);
    },

    // User-related API calls
    getUserProfile() {
        return this.get(API_ENDPOINTS.GET_USER_PROFILE);
    },

    updateUserProfile(userData) {
        return this.put(API_ENDPOINTS.UPDATE_USER_PROFILE, userData);
    },

    // Auth-related API calls
    login(credentials) {
        return this.post(API_ENDPOINTS.LOGIN, credentials);
    },

    register(userData) {
        return this.post(API_ENDPOINTS.REGISTER, userData);
    },

    logout() {
        return this.post(API_ENDPOINTS.LOGOUT);
    },

    getVerifyCode(phonenumber) {
        return this.post(API_ENDPOINTS.GET_VERIFY_CODE, { phonenumber });
    },

    checkVerifyCode(phonenumber, code) {
        return this.post(API_ENDPOINTS.CHECK_VERIFY_CODE, { phonenumber, code_verify: code });
    },

    checkNewItems(lastId, categoryId = '0') {
        return this.post(API_ENDPOINTS.CHECK_NEW_ITEM, { last_id: lastId, category_id: categoryId });
    },

    // File upload
    upload(url, formData, onUploadProgress) {
        return api.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': authHeaders.Authorization
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onUploadProgress(percentCompleted);
            }
        });
    },

    // Expose the setAuthHeaders function
    setAuthHeaders(token, deviceToken) {
        authHeaders = {
            'Authorization': token ? `Bearer ${token}` : undefined,
            'X-Device-Token': deviceToken || undefined,
        };
    },
};

export default apiService;