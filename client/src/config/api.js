const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
    // Authentication Endpoints
    LOGIN: `${API_BASE_URL}/auth/login`,
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    GET_VERIFY_CODE: `${API_BASE_URL}/auth/get_verify_code`,
    CHECK_VERIFY_CODE: `${API_BASE_URL}/auth/check_verify_code`,
    CHANGE_INFO_AFTER_SIGNUP: `${API_BASE_URL}/auth/change_info_after_signup`,
    REFRESH_TOKEN: `${API_BASE_URL}/auth/refresh-token`,
    AUTH_CHECK: `${API_BASE_URL}/auth/check`,
    CHANGE_PASSWORD: `${API_BASE_URL}/change_password`,
    GET_USER_INFO: (userId) => userId ? `${API_BASE_URL}/users/get_user_info/${userId}` : `${API_BASE_URL}/users/get_user_info`,
    SET_USER_INFO: `${API_BASE_URL}/users/set_user_info`,
    // Post Endpoints
    ADD_POST: `${API_BASE_URL}/posts`,
    GET_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    UPDATE_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    DELETE_POST: (postId) => `${API_BASE_URL}/posts/${postId}`,
    REPORT_POST: (postId) => `${API_BASE_URL}/posts/${postId}/report-post`,
    LIKE_POST: (postId) => `${API_BASE_URL}/posts/${postId}/like`,
    GET_LIST_POSTS: `${API_BASE_URL}/posts/get_list_posts`,
    // Comment Endpoints
    ADD_COMMENT: (postId) => `${API_BASE_URL}/posts/${postId}/comment`,
    GET_COMMENTS: (postId) => `${API_BASE_URL}/posts/${postId}/comments`,
    // User-Specific Posts
    GET_USER_POSTS: (userId) => `${API_BASE_URL}/posts/user/${userId}`,
    // Notification Endpoints
    CHECK_NEW_ITEM: `${API_BASE_URL}/notifications/check_new_item`,
    GET_PUSH_SETTINGS: `${API_BASE_URL}/notifications/get_push_settings`,
    UPDATE_PUSH_SETTINGS: `${API_BASE_URL}/notifications/set_push_settings`,
    GET_NOTIFICATIONS: `${API_BASE_URL}/notifications/get_notification`,
    SET_READ_NOTIFICATION: (notificationId) => `${API_BASE_URL}/notifications/${notificationId}/read`,
    DELETE_NOTIFICATION: (notificationId) => `${API_BASE_URL}/notifications/${notificationId}`,
    // Search Endpoints
    SEARCH: `${API_BASE_URL}/search/search`,
    GET_SAVED_SEARCH: `${API_BASE_URL}/search/get_saved_search`,
    DELETE_SAVED_SEARCH: (searchId) => `${API_BASE_URL}/search/del_saved_search/${searchId}`,
    // Friend Endpoints
    GET_REQUESTED_FRIENDS: `${API_BASE_URL}/friends/get_requested_friends`,
    GET_USER_FRIENDS: `${API_BASE_URL}/friends/get_user_friends`,
    SET_ACCEPT_FRIEND: `${API_BASE_URL}/friends/set_accept_friend`,
    GET_LIST_SUGGESTED_FRIENDS: `${API_BASE_URL}/friends/get_list_suggested_friends`,
    SET_REQUEST_FRIEND: `${API_BASE_URL}/friends/set_request_friend`,
    GET_LIST_BLOCKS: `${API_BASE_URL}/friends/get_list_blocks`,
    SET_BLOCK: `${API_BASE_URL}/friends/set_block`,
    // Video Endpoints
    GET_LIST_VIDEOS: `${API_BASE_URL}/video/get_list_videos`,
    // Chat Endpoints (Updated RESTful)
    GET_CONVERSATIONS: `${API_BASE_URL}/conversations`,
    GET_CONVERSATION_MESSAGES: (conversationId) => `${API_BASE_URL}/conversations/${conversationId}/messages`,
    SET_READ_MESSAGE: (conversationId) => `${API_BASE_URL}/conversations/${conversationId}/messages/read`,
    DELETE_MESSAGE: (conversationId, messageId) => `${API_BASE_URL}/conversations/${conversationId}/messages/${messageId}`,
    DELETE_CONVERSATION: (conversationId) => `${API_BASE_URL}/conversations/${conversationId}`,
};