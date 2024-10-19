const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
    CHECK_VERIFY_CODE: `${API_BASE_URL}/auth/check_verify_code`,
    GET_VERIFY_CODE: `${API_BASE_URL}/auth/get_verify_code`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    AUTH_CHECK: `${API_BASE_URL}/auth/check`,
    CHANGE_INFO_AFTER_SIGNUP: `${API_BASE_URL}/auth/change_info_after_signup`,
    ADD_POST: `${API_BASE_URL}/posts`,
    GET_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    LIKE_POST: `${API_BASE_URL}/posts/like_post`,
    DELETE_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    ADD_COMMENT: `${API_BASE_URL}/posts/add_comment`,
    UPDATE_COMMENT: `${API_BASE_URL}/comments`,
    DELETE_COMMENT: `${API_BASE_URL}/comments`,
    GET_COMMENTS: `${API_BASE_URL}/posts`,
    REPORT_POST: (postId) => `${API_BASE_URL}/posts/${postId}/report`,
};