const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
    CHECK_VERIFY_CODE: `${API_BASE_URL}/auth/check_verify_code`,
    GET_VERIFY_CODE: `${API_BASE_URL}/auth/get_verify_code`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    AUTH_CHECK: `${API_BASE_URL}/auth/check`,
    CHANGE_INFO_AFTER_SIGNUP: `${API_BASE_URL}/auth/change_info_after_signup`,
};