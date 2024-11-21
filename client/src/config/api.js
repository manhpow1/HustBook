const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
    // Authentication Endpoints
    CHECK_VERIFY_CODE: `${API_BASE_URL}/auth/check_verify_code`,
    GET_VERIFY_CODE: `${API_BASE_URL}/auth/get_verify_code`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    AUTH_CHECK: `${API_BASE_URL}/auth/check`,
    CHANGE_INFO_AFTER_SIGNUP: `${API_BASE_URL}/auth/change_info_after_signup`,
    // Post Endpoints
    ADD_POST: `${API_BASE_URL}/posts`,
    GET_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    UPDATE_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    DELETE_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    REPORT_POST: (postId) => `${API_BASE_URL}/posts/${postId}/report-post`,
    LIKE_POST: (postId) => `${API_BASE_URL}/posts/${postId}/like`,
    GET_LIST_POSTS: `${API_BASE_URL}/posts/get_list_posts`,
    // Comment Endpoints (Nested Under Posts)
    ADD_COMMENT: (postId) => `${API_BASE_URL}/posts/${postId}/comment`,
    GET_COMMENTS: (postId) => `${API_BASE_URL}/posts/${postId}/comments`,
    // User-Specific Posts
    GET_USER_POSTS: (userId) => `${API_BASE_URL}/posts/user/${userId}`,
    // Notification Endpoint
    CHECK_NEW_ITEM: `${API_BASE_URL}/notifications/check_new_item`,
    // Search Endpoint
    SEARCH: `${API_BASE_URL}/search/search`,
    GET_SAVED_SEARCH: `${API_BASE_URL}/search/get_saved_search`,
    DELETE_SAVED_SEARCH: (searchId) => `${API_BASE_URL}/search/del_saved_search/${searchId}`,
    // Friend Endpoints
    GET_REQUESTED_FRIENDS: `${API_BASE_URL}/friends/get_requested_friends`,
    GET_USER_FRIENDS: `${API_BASE_URL}/get_user_friends`,
    // Video Endpoints
    GET_LIST_VIDEOS: `${API_BASE_URL}/get_list_videos`,
};
