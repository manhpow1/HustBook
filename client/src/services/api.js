import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/api';

const apiService = {
    // Generic GET method
    async get(url, config = {}) {
        return axiosInstance.get(url, config);
    },

    // Generic POST method
    async post(url, data, config = {}) {
        return axiosInstance.post(url, data, config);
    },

    // Generic PUT method
    async put(url, data, config = {}) {
        return axiosInstance.put(url, data, config);
    },

    // Generic DELETE method
    async delete(url, config = {}) {
        return axiosInstance.delete(url, config);
    },

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
    async getUserInfo(userId = null) {
        // If userId is provided, use the route with ID, else without ID
        const url = API_ENDPOINTS.GET_USER_INFO(userId);
        return axiosInstance.get(url);
    },
    async setUserInfo(data) {
        return this.put(API_ENDPOINTS.SET_USER_INFO, data);
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
        return axiosInstance.post(API_ENDPOINTS.SET_ACCEPT_FRIEND, { userId, isAccept });
    },
    async getListSuggestedFriends(index = 0, count = 20) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_SUGGESTED_FRIENDS, { params: { index, count } });
    },
    async sendFriendRequest(userId) {
        return axiosInstance.post(API_ENDPOINTS.SET_REQUEST_FRIEND, { userId });
    },
    async getListBlocks(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_LIST_BLOCKS, { params });
    },
    async setBlock(userId, type) {
        return axiosInstance.post(API_ENDPOINTS.SET_BLOCK, { userId, type });
    },
    // Notification APIs
    async getPushSettings() {
        return axiosInstance.get(API_ENDPOINTS.GET_PUSH_SETTINGS);
    },
    async updatePushSettings(settings) {
        return axiosInstance.put(API_ENDPOINTS.UPDATE_PUSH_SETTINGS, settings);
    },
    async checkNewItems(lastId, categoryId = '0') {
        return axiosInstance.post(API_ENDPOINTS.CHECK_NEW_ITEM, { lastId, categoryId });
    },
    async getNotifications(index = 0, count = 20) {
        return axiosInstance.get(API_ENDPOINTS.GET_NOTIFICATIONS, {
            params: { index, count }
        });
    },
    async setReadNotification(notificationId) {
        return axiosInstance.patch(API_ENDPOINTS.SET_READ_NOTIFICATION(notificationId));
    },
    async deleteNotification(notificationId) {
        return axiosInstance.delete(API_ENDPOINTS.DELETE_NOTIFICATION(notificationId));
    },
    // Video APIs
    async getListVideos(params = {}) {
        return axiosInstance.post(API_ENDPOINTS.GET_LIST_VIDEOS, params);
    },
    async getConversations() {
        return this.get(API_ENDPOINTS.GET_CONVERSATIONS);
    },

    async getConversationMessages(conversationId, params = {}) {
        return this.get(API_ENDPOINTS.GET_CONVERSATION_MESSAGES(conversationId), { params });
    },

    async setReadMessage(conversationId) {
        return this.patch(API_ENDPOINTS.SET_READ_MESSAGE(conversationId));
    },

    async deleteMessage(conversationId, messageId) {
        return this.delete(API_ENDPOINTS.DELETE_MESSAGE(conversationId, messageId));
    },

    async deleteConversation(conversationId) {
        return this.delete(API_ENDPOINTS.DELETE_CONVERSATION(conversationId));
    },
    // File Upload
    async upload(url, formData, onUploadProgress) {
        return axiosInstance.post(url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                if (onUploadProgress) {
                    onUploadProgress(percentCompleted);
                }
            },
        });
    },
};

export function setAuthHeaders(token) {
    if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axiosInstance.defaults.headers.common['Authorization'];
    }
};

export default apiService;