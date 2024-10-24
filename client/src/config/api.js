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
    DELETE_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    REPORT_POST: (postId) => `${API_BASE_URL}/posts/${postId}/report-post`,
    LIKE_POST: (postId) => `${API_BASE_URL}/posts/${postId}/like`,

    // Comment Endpoints (Nested Under Posts)
    ADD_COMMENT: (postId) => `${API_BASE_URL}/posts/${postId}/comment`,
    GET_COMMENTS: (postId, index = 0, count = 10) => `${API_BASE_URL}/posts/${postId}/comments?index=${index}&count=${count}`,

    // Separate Comment Endpoints for Updates and Deletions (If Needed)
    UPDATE_COMMENT: `${API_BASE_URL}/comments`,
    DELETE_COMMENT: `${API_BASE_URL}/comments`,

    // User-Specific Posts
    GET_USER_POSTS: (userId) => `${API_BASE_URL}/posts/user/${userId}`,
};