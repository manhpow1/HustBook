import axios from 'axios'
import { useUserStore } from '../stores/userStore'
import { API_ENDPOINTS } from '../config/api'
import axiosInstance from './axiosInstance'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
})

api.interceptors.request.use(config => {
    const userStore = useUserStore()

    if (userStore.token) {
        config.headers['Authorization'] = `Bearer ${userStore.token}`
    }

    if (userStore.deviceToken) {
        config.headers['X-Device-Token'] = userStore.deviceToken
    }

    return config
})

api.interceptors.response.use(
    response => response,
    error => {
        try {
            handleError(error);
        } catch (e) {
            console.error('Error in handleError:', e);
        }
        return Promise.reject(error);
    }
);

const apiService = {
    async get(url, config = {}) {
        try {
            return await api.get(url, config)
        } catch (error) {
            handleError(error)
            throw error
        }
    },

    async post(url, data, config = {}) {
        try {
            return await api.post(url, data, config)
        } catch (error) {
            handleError(error)
            throw error
        }
    },

    async put(url, data, config = {}) {
        try {
            return await api.put(url, data, config)
        } catch (error) {
            handleError(error)
            throw error
        }
    },

    async delete(url, config = {}) {
        try {
            return await api.delete(url, config)
        } catch (error) {
            handleError(error)
            throw error
        }
    },

    // Post-related API calls
    getPost(postId) {
        return api.get(API_ENDPOINTS.GET_POST(postId));
    },

    likePost(postId) {
        return this.post(API_ENDPOINTS.LIKE_POST(postId)); // Pass postId here
    },

    createPost(postData) {
        return this.post(API_ENDPOINTS.CREATE_POST, postData)
    },

    updatePost(postId, postData) {
        return this.put(`${API_ENDPOINTS.UPDATE_POST}/${postId}`, postData)
    },

    deletePost(postId) {
        return this.delete(`${API_ENDPOINTS.DELETE_POST}/${postId}`)
    },

    reportPost(postId, reason, details) {
        return axiosInstance.post(API_ENDPOINTS.REPORT_POST(postId), {
            reason,
            details,
        });
    },

    // Comment-related API calls
    addComment(postId, content) {
        return this.post(API_ENDPOINTS.ADD_COMMENT(postId), { content });
    },

    updateComment(id, data) {
        return this.put(`${API_ENDPOINTS.UPDATE_COMMENT}/${id}`, data)
    },

    deleteComment(id) {
        return this.delete(`${API_ENDPOINTS.DELETE_COMMENT}/${id}`)
    },

    getComments(postId, lastCommentId, limit = 10) {
        return this.get(`${API_ENDPOINTS.GET_COMMENTS}/${postId}/comments`, {
            params: {
                last_id: lastCommentId,
                limit
            }
        })
    },

    // User-related API calls
    getUserProfile() {
        return this.get(API_ENDPOINTS.GET_USER_PROFILE)
    },

    updateUserProfile(userData) {
        return this.put(API_ENDPOINTS.UPDATE_USER_PROFILE, userData)
    },

    // Auth-related API calls
    login(credentials) {
        return this.post(API_ENDPOINTS.LOGIN, credentials)
    },

    register(userData) {
        return this.post(API_ENDPOINTS.REGISTER, userData)
    },

    logout() {
        return this.post(API_ENDPOINTS.LOGOUT)
    },

    getVerifyCode(phonenumber) {
        return this.post(API_ENDPOINTS.GET_VERIFY_CODE, { phonenumber })
    },

    checkVerifyCode(phonenumber, code) {
        return this.post(API_ENDPOINTS.CHECK_VERIFY_CODE, { phonenumber, code_verify: code })
    },

    // File upload
    upload(url, formData, onUploadProgress) {
        const userStore = useUserStore()
        return axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${userStore.token}`
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                onUploadProgress(percentCompleted)
            }
        })
    },
}

export default apiService