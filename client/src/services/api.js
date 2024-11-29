import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/api';

const apiService = {
    // Authentication APIs
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
    async changePassword(currentPassword, newPassword) {
        return axiosInstance.post(API_ENDPOINTS.CHANGE_PASSWORD, {
            password: currentPassword,
            new_password: newPassword
        });
    },
    // Post APIs
    async createPost(postData) {
        return axiosInstance.post(API_ENDPOINTS.ADD_POST, postData);
    },
    async getPost(postId) {
        return axiosInstance.get(API_ENDPOINTS.GET_POST(postId));
    },
    async updatePost(postId, postData) {
        return axiosInstance.put(API_ENDPOINTS.UPDATE_POST(postId), postData);
    },
    async deletePost(postId) {
        return axiosInstance.delete(API_ENDPOINTS.DELETE_POST(postId));
    },
    async reportPost(postId, reason, details) {
        return axiosInstance.post(API_ENDPOINTS.REPORT_POST(postId), { reason, details });
    },
    async likePost(postId) {
        return axiosInstance.post(API_ENDPOINTS.LIKE_POST(postId));
    },
    async getListPosts(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_POSTS, { params });
    },
    // Comment APIs
    async addComment(postId, content) {
        return axiosInstance.post(API_ENDPOINTS.ADD_COMMENT(postId), { content });
    },
    async getComments(postId, params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_COMMENTS(postId), { params });
    },
    // Search APIs
    async search(keyword, index = 0, count = 20) {
        return axiosInstance.post(API_ENDPOINTS.SEARCH, { keyword, index, count });
    },
    async getSavedSearches(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_SAVED_SEARCH, { params });
    },
    async deleteSavedSearch(searchId, all = false) {
        return axiosInstance.delete(API_ENDPOINTS.DELETE_SAVED_SEARCH(searchId), { params: { all: all ? '1' : '0' } });
    },
    // Friend APIs
    async getRequestedFriends(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_REQUESTED_FRIENDS, { params });
    },
    async getUserFriends(params = {}) {
        return axiosInstance.post(API_ENDPOINTS.GET_USER_FRIENDS, params);
    },
    async setAcceptFriend(userId, isAccept) {
        return axiosInstance.post(API_ENDPOINTS.SET_ACCEPT_FRIEND, { user_id: userId, is_accept: isAccept });
    },
    async getListSuggestedFriends(index = 0, count = 20) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_SUGGESTED_FRIENDS, { params: { index, count } });
    },
    async sendFriendRequest(userId) {
        return axiosInstance.post(API_ENDPOINTS.SET_REQUEST_FRIEND, { user_id: userId });
    },
    async getListBlocks(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_BLOCKS, { params });
    },
    async unblockUser(userId) {
        return axiosInstance.post(API_ENDPOINTS.UNBLOCK_USER, { user_id: userId });
    },
    // Notification APIs
    async getPushSettings() {
        return axiosInstance.get(API_ENDPOINTS.GET_PUSH_SETTINGS);
    },
    async updatePushSettings(settings) {
        return axiosInstance.put(API_ENDPOINTS.UPDATE_PUSH_SETTINGS, settings);
    },
    async checkNewItems(lastId, categoryId = '0') {
        return axiosInstance.post(API_ENDPOINTS.CHECK_NEW_ITEM, { last_id: lastId, category_id: categoryId });
    },
    // Video APIs
    async getListVideos(params = {}) {
        return axiosInstance.post(API_ENDPOINTS.GET_LIST_VIDEOS, params);
    },
    // File Upload
    async upload(url, formData, onUploadProgress) {
        return axiosInstance.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
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