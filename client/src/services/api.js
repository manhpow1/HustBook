import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/api';

const apiService = {
    // Generic GET method
    async get(url, config = {}) {
        return axiosInstance.get(url, config);
    },

    async post(url, data, config = {}) {
        return axiosInstance.post(url, data, config);
    },

    async put(url, data, config = {}) {
        return axiosInstance.put(url, data, config);
    },

    async delete(url, config = {}) {
        return axiosInstance.delete(url, config);
    },

    // Post-related API calls
    async getPost(postId) {
        return axiosInstance.get(API_ENDPOINTS.GET_POST(postId));
    },

    async likePost(postId) {
        return axiosInstance.post(API_ENDPOINTS.LIKE_POST(postId));
    },

    async createPost(postData) {
        return axiosInstance.post(API_ENDPOINTS.ADD_POST, postData);
    },

    async updatePost(postId, postData) {
        return axiosInstance.put(API_ENDPOINTS.UPDATE_POST(postId), postData);
    },

    async deletePost(postId) {
        return axiosInstance.delete(API_ENDPOINTS.DELETE_POST(postId));
    },

    async reportPost(postId, reason, details) {
        return axiosInstance.post(API_ENDPOINTS.REPORT_POST(postId), {
            reason,
            details,
        });
    },

    async getListPosts(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_POSTS, { params });
    },

    // Comment-related API calls
    async addComment(postId, content) {
        return axiosInstance.post(API_ENDPOINTS.ADD_COMMENT(postId), { content });
    },

    async getComments(postId, index = 0, count = 10) {
        const url = API_ENDPOINTS.GET_COMMENTS(postId);
        return axiosInstance.get(url, { params: { index, count } });
    },

    // Auth-related API calls
    async login(data) {
        return axiosInstance.post(API_ENDPOINTS.LOGIN, data);
    },

    async register(data) {
        return axiosInstance.post(API_ENDPOINTS.SIGNUP, data);
    },

    async logout() {
        return axiosInstance.post(API_ENDPOINTS.LOGOUT);
    },

    async getVerifyCode(data) {
        return axiosInstance.post(API_ENDPOINTS.GET_VERIFY_CODE, data);
    },

    async verifyCode(data) {
        return axiosInstance.post(API_ENDPOINTS.CHECK_VERIFY_CODE, data);
    },

    async refreshToken(refreshToken) {
        return axiosInstance.post(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken });
    },

    async getUserProfile() {
        return axiosInstance.get(API_ENDPOINTS.GET_USER_PROFILE);
    },

    async changePassword(currentPassword, newPassword) {
        return axiosInstance.post(API_ENDPOINTS.CHANGE_PASSWORD, {
            password: currentPassword,
            new_password: newPassword
        });
    },

    async checkNewItems(lastId, categoryId = '0') {
        return axiosInstance.post(API_ENDPOINTS.CHECK_NEW_ITEM, {
            last_id: lastId,
            category_id: categoryId,
        });
    },

    async search(keyword, user_id, index = 0, count = 20) {
        return axiosInstance.post(API_ENDPOINTS.SEARCH, {
            params: { keyword, user_id, index, count },
        });
    },

    async getSavedSearches(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_SAVED_SEARCH, { params });
    },

    async deleteSavedSearch(searchId, all = false) {
        return axiosInstance.delete(API_ENDPOINTS.DELETE_SAVED_SEARCH(searchId), { params: { all: all ? '1' : '0' } });
    },

    async getRequestedFriends(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_REQUESTED_FRIENDS, { params });
    },

    async getUserFriends(params = {}) {
        return axiosInstance.post(API_ENDPOINTS.GET_USER_FRIENDS, params);
    },

    async getListSuggestedFriends(index = 0, count = 20) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_SUGGESTED_FRIENDS, {
            params: { index, count },
        });
    },

    async getListVideos(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_VIDEOS, { params });
    },

    async setAcceptFriend(userId, isAccept) {
        return axiosInstance.post(API_ENDPOINTS.SET_ACCEPT_FRIEND, {
            user_id: userId,
            is_accept: isAccept,
        });
    },

    async sendFriendRequest(userId) {
        return axiosInstance.post(API_ENDPOINTS.SET_REQUEST_FRIEND, { user_id: userId });
    },

    async getListBlocks(params) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_BLOCKS, { params });
    },

    async unblockUser(userId) {
        return axiosInstance.post(API_ENDPOINTS.UNBLOCK_USER, { user_id: userId });
    },

    async getPushSettings() {
        return axiosInstance.get(API_ENDPOINTS.GET_PUSH_SETTINGS);
    },

    async updatePushSettings(settings) {
        return axiosInstance.post(API_ENDPOINTS.UPDATE_PUSH_SETTINGS, settings);
    },

    // File upload
    async upload(url, formData, onUploadProgress) {
        return axiosInstance.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                onUploadProgress(percentCompleted);
            },
        });
    },
};

export function setAuthHeaders(token, deviceToken) {
    if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axiosInstance.defaults.headers.common['Authorization'];
    }

    if (deviceToken) {
        axiosInstance.defaults.headers.common['X-Device-Token'] = deviceToken;
    } else {
        delete axiosInstance.defaults.headers.common['X-Device-Token'];
    }
};

export default apiService;