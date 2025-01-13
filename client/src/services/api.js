import axiosInstance from './axiosInstance';
import { API_ENDPOINTS } from '../config/api';

// Helper to set/remove auth headers
export function setAuthHeaders(token) {
    if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete axiosInstance.defaults.headers.common['Authorization'];
    }
}

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

    // Generic PATCH method
    async patch(url, data, config = {}) {
        return axiosInstance.patch(url, data, config);
    },

    // Generic DELETE method
    async delete(url, config = {}) {
        return axiosInstance.delete(url, config);
    },

    // ─────────────────────────────────────────────────────────
    // AUTHENTICATION APIs
    // ─────────────────────────────────────────────────────────
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

    async changePassword(currentPassword, newPassword) {
        return axiosInstance.post(API_ENDPOINTS.CHANGE_PASSWORD, {
            password: currentPassword,
            new_password: newPassword,
        });
    },

    /**
     * Forgot Password
     * - If only phoneNumber is provided, request a reset code
     * - If phoneNumber, code, and newPassword are provided, finalize reset
     */
    async forgotPassword(data) {
        return axiosInstance.post(API_ENDPOINTS.FORGOT_PASSWORD, data);
    },

    /**
     * Check if current token is valid (server-side).
     */
    async authCheck() {
        return axiosInstance.get(API_ENDPOINTS.AUTH_CHECK);
    },

    /**
     * Change user info after signup (e.g., username, avatar) 
     */
    async changeInfoAfterSignup(data) {
        return this.post(API_ENDPOINTS.CHANGE_INFO_AFTER_SIGNUP, data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // ─────────────────────────────────────────────────────────
    // USER PROFILE APIs
    // ─────────────────────────────────────────────────────────
    // Profile Methods
    async getProfile(userId = null) {
        const url = API_ENDPOINTS.GET_PROFILE(userId);
        return this.get(url);
    },

    async updateProfile(userId, formData) {
        const url = API_ENDPOINTS.UPDATE_PROFILE(userId);
        return this.put(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Legacy methods maintained for backward compatibility
    async getUserInfo(userId = null) {
        const url = API_ENDPOINTS.GET_USER_INFO(userId);
        return axiosInstance.get(url);
    },

    async setUserInfo(data) {
        return this.put(API_ENDPOINTS.SET_USER_INFO, data, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // ─────────────────────────────────────────────────────────
    // POST APIs
    // ─────────────────────────────────────────────────────────
    async createPost(postData, config) {
        return axiosInstance.post(API_ENDPOINTS.ADD_POST, postData, {
            ...config,
            headers: {
                ...config?.headers,
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    async getPost(postId) {
        return this.get(API_ENDPOINTS.GET_POST(postId));
    },

    async updatePost(postId, postData) {
        const formData = new FormData();
        formData.append('content', postData.content);

        // Handle existing images
        if (postData.existingImages?.length) {
            formData.append('existingImages', JSON.stringify(postData.existingImages));
        }

        // Handle new image files
        if (postData.media?.length) {
            postData.media.forEach(file => {
                if (typeof file === 'string') return; // Skip existing image URLs
                formData.append('images', file);
            });
        }

        return this.patch(API_ENDPOINTS.UPDATE_POST(postId), formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    async deletePost(postId) {
        return this.delete(API_ENDPOINTS.DELETE_POST(postId));
    },

    async reportPost(postId, reason, details) {
        return axiosInstance.post(API_ENDPOINTS.REPORT_POST(postId), { reason, details });
    },

    async likePost(postId) {
        return this.post(API_ENDPOINTS.LIKE_POST(postId));
    },

    async getListPosts(params = {}) {
        return this.get(API_ENDPOINTS.GET_LIST_POSTS(), { params });
    },

    /**
     * Get posts by a specific user
     */
    async getUserPosts(userId, params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_USER_POSTS(userId), { params });
    },

    // ─────────────────────────────────────────────────────────
    // COMMENT APIs
    // ─────────────────────────────────────────────────────────
    async addComment(postId, content) {
        return this.post(API_ENDPOINTS.ADD_COMMENT(postId), { content });
    },

    async getComments(postId, params = {}) {
        return this.get(API_ENDPOINTS.GET_COMMENTS(postId), { params });
    },

    // ─────────────────────────────────────────────────────────
    // SEARCH APIs
    // ─────────────────────────────────────────────────────────
    async searchPosts(keyword, index = 0, count = 20) {
        return axiosInstance.get(API_ENDPOINTS.SEARCH_POSTS, {
            params: {  // Thêm params object
                keyword,
                index,
                count
            }
        });
    },

    async searchUsers(keyword, index = 0, count = 20) {
        return axiosInstance.get(API_ENDPOINTS.SEARCH_USERS, { params: { keyword, index, count } });
    },

    async getSavedSearches(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_SAVED_SEARCH, { params });
    },

    async deleteSavedSearch(searchId, all = false) {
        return axiosInstance.delete(API_ENDPOINTS.DELETE_SAVED_SEARCH(searchId), {
            params: { all: all ? '1' : '0' },
        });
    },

    getTrendingHashtags: async (count = 10) => {
        return axiosInstance.get('/trending-hashtags', { params: { count } });
    },

    saveSearch: async (searchData) => {
        return axiosInstance.post('/save-search', searchData);
    },

    // ─────────────────────────────────────────────────────────
    // FRIEND APIs
    // ─────────────────────────────────────────────────────────
    async getRequestedFriends(params = {}) {
        return axiosInstance.get(API_ENDPOINTS.GET_REQUESTED_FRIENDS, { params });
    },

    async getUserFriends(params = {}) {
        // Might be GET or POST depending on backend. Currently using POST:
        return axiosInstance.get(API_ENDPOINTS.GET_USER_FRIENDS, params);
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

    // ─────────────────────────────────────────────────────────
    // NOTIFICATION APIs
    // ─────────────────────────────────────────────────────────
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
        return axiosInstance.get(API_ENDPOINTS.GET_NOTIFICATIONS, { params: { index, count } });
    },

    async setReadNotification(notificationId) {
        return axiosInstance.patch(API_ENDPOINTS.SET_READ_NOTIFICATION(notificationId));
    },

    async deleteNotification(notificationId) {
        return axiosInstance.delete(API_ENDPOINTS.DELETE_NOTIFICATION(notificationId));
    },

    // ─────────────────────────────────────────────────────────
    // VIDEO APIs
    // ─────────────────────────────────────────────────────────
    async getListVideos(params = {}) {
        return axiosInstance.post(API_ENDPOINTS.GET_LIST_VIDEOS, params);
    },

    // ─────────────────────────────────────────────────────────
    // CHAT APIs
    // ─────────────────────────────────────────────────────────
    async createConversation(partnerId) {
        return this.post(API_ENDPOINTS.CREATE_CONVERSATIONS, { partnerId });
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

    // ─────────────────────────────────────────────────────────
    // FILE UPLOAD
    // ─────────────────────────────────────────────────────────
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

export default apiService;
