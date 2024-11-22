import axiosInstance, { setAuthHeaders } from './axiosInstance';
import { API_ENDPOINTS } from '../config/api';

const apiService = {
    // Generic GET method
    get(url, config = {}) {
        return axiosInstance.get(url, config);
    },

    post(url, data, config = {}) {
        return axiosInstance.post(url, data, config);
    },

    put(url, data, config = {}) {
        return axiosInstance.put(url, data, config);
    },

    delete(url, config = {}) {
        return axiosInstance.delete(url, config);
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
        return this.put(API_ENDPOINTS.UPDATE_POST(postId), postData);
    },

    deletePost(postId) {
        return this.delete(API_ENDPOINTS.DELETE_POST(postId));
    },

    reportPost(postId, reason, details) {
        return this.post(API_ENDPOINTS.REPORT_POST(postId), {
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

    getComments(postId, index = 0, count = 10) {
        const url = API_ENDPOINTS.GET_COMMENTS(postId);
        return this.get(url, { params: { index, count } });
    },

    // Auth-related API calls
    login(credentials) {
        return this.post(API_ENDPOINTS.LOGIN, credentials);
    },

    register(userData) {
        return this.post(API_ENDPOINTS.SIGNUP, userData);
    },

    logout() {
        return this.post(API_ENDPOINTS.LOGOUT);
    },

    getVerifyCode(phonenumber) {
        return this.post(API_ENDPOINTS.GET_VERIFY_CODE, { phonenumber });
    },

    checkVerifyCode(phonenumber, code) {
        return this.post(API_ENDPOINTS.CHECK_VERIFY_CODE, {
            phonenumber,
            code_verify: code,
        });
    },

    checkNewItems(lastId, categoryId = '0') {
        return this.post(API_ENDPOINTS.CHECK_NEW_ITEM, {
            last_id: lastId,
            category_id: categoryId,
        });
    },

    search(keyword, user_id, index = 0, count = 20) {
        return this.post(API_ENDPOINTS.SEARCH, {
            params: { keyword, user_id, index, count },
        });
    },

    getSavedSearches(params = {}) {
        return this.get(API_ENDPOINTS.GET_SAVED_SEARCH, { params });
    },

    deleteSavedSearch(searchId, all = false) {
        return this.delete(API_ENDPOINTS.DELETE_SAVED_SEARCH(searchId), { params: { all: all ? '1' : '0' } });
    },

    getRequestedFriends(params = {}) {
        return this.get(API_ENDPOINTS.GET_REQUESTED_FRIENDS, { params });
    },

    getUserFriends(params = {}) {
        return this.post(API_ENDPOINTS.GET_USER_FRIENDS, params);
    },

    getListVideos(params = {}) {
        return this.get(API_ENDPOINTS.GET_LIST_VIDEOS, { params });
    },

    setAcceptFriend(userId, isAccept) {
        return this.post(API_ENDPOINTS.SET_ACCEPT_FRIEND, {
            user_id: userId,
            is_accept: isAccept,
        });
    },

    // File upload
    upload(url, formData, onUploadProgress) {
        return api.post(url, formData, {
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

    // Expose the setAuthHeaders function
    setAuthHeaders,
};

export default apiService;