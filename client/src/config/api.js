const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
    // Authentication Endpoints
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    SIGNUP: `${API_BASE_URL}/api/auth/signup`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    GET_VERIFY_CODE: `${API_BASE_URL}/api/auth/get_verify_code`,
    CHECK_VERIFY_CODE: `${API_BASE_URL}/api/auth/check_verify_code`,
    CHANGE_INFO_AFTER_SIGNUP: `${API_BASE_URL}/api/auth/change_info_after_signup`,
    REFRESH_TOKEN: `${API_BASE_URL}/api/auth/refresh-token`,
    AUTH_CHECK: `${API_BASE_URL}/api/auth/check`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change_password`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    GET_USER_INFO: (userId) => userId ? `${API_BASE_URL}/api/users/get_user_info/${userId}` : `${API_BASE_URL}/api/users/get_user_info`,
    SET_USER_INFO: `${API_BASE_URL}/api/users/set_user_info`,
    // Post Endpoints
    ADD_POST: `${API_BASE_URL}/api/posts`,
    GET_POST: (postId) => `${API_BASE_URL}/api/posts/${postId}`,
    UPDATE_POST: (postId) => `${API_BASE_URL}/api/posts/${postId}`,
    DELETE_POST: (postId) => `${API_BASE_URL}/api/posts/${postId}`,
    REPORT_POST: (postId) => `${API_BASE_URL}/api/posts/${postId}/report-post`,
    LIKE_POST: (postId) => `${API_BASE_URL}/api/posts/${postId}/like`,
    GET_LIST_POSTS: `${API_BASE_URL}/api/posts/get_list_posts`,
    // Comment Endpoints
    ADD_COMMENT: (postId) => `${API_BASE_URL}/api/posts/${postId}/comment`,
    GET_COMMENTS: (postId) => `${API_BASE_URL}/api/posts/${postId}/comments`,
    // User-Specific Posts
    GET_USER_POSTS: (userId) => `${API_BASE_URL}/api/posts/user/${userId}`,
    // Notification Endpoints
    CHECK_NEW_ITEM: `${API_BASE_URL}/api/notifications/check_new_item`,
    GET_PUSH_SETTINGS: `${API_BASE_URL}/api/notifications/get_push_settings`,
    UPDATE_PUSH_SETTINGS: `${API_BASE_URL}/api/notifications/set_push_settings`,
    GET_NOTIFICATIONS: `${API_BASE_URL}/api/notifications/get_notification`,
    SET_READ_NOTIFICATION: (notificationId) => `${API_BASE_URL}/api/notifications/${notificationId}/read`,
    DELETE_NOTIFICATION: (notificationId) => `${API_BASE_URL}/api/notifications/${notificationId}`,
    // Search Endpoints
    SEARCH_POSTS: `${API_BASE_URL}/api/search/posts`,
    SEARCH_USERS: `${API_BASE_URL}/api/search/users`,
    GET_SAVED_SEARCH: `${API_BASE_URL}/api/search/get_saved_search`,
    DELETE_SAVED_SEARCH: (searchId) => `${API_BASE_URL}/api/search/del_saved_search/${searchId}`,
    // Friend Endpoints
    GET_REQUESTED_FRIENDS: `${API_BASE_URL}/api/friends/get_requested_friends`,
    GET_USER_FRIENDS: `${API_BASE_URL}/api/friends/get_user_friends`,
    SET_ACCEPT_FRIEND: `${API_BASE_URL}/api/friends/set_accept_friend`,
    GET_LIST_SUGGESTED_FRIENDS: `${API_BASE_URL}/api/friends/get_list_suggested_friends`,
    SET_REQUEST_FRIEND: `${API_BASE_URL}/api/friends/set_request_friend`,
    GET_LIST_BLOCKS: `${API_BASE_URL}/api/friends/get_list_blocks`,
    SET_BLOCK: `${API_BASE_URL}/api/friends/set_block`,
    // Video Endpoints
    GET_LIST_VIDEOS: `${API_BASE_URL}/api/video/get_list_videos`,
    // Chat Endpoints (Updated RESTful)
    GET_CONVERSATIONS: `${API_BASE_URL}/api/conversations`,
    GET_CONVERSATION_MESSAGES: (conversationId) => `${API_BASE_URL}/api/conversations/${conversationId}/messages`,
    SET_READ_MESSAGE: (conversationId) => `${API_BASE_URL}/api/conversations/${conversationId}/messages/read`,
    DELETE_MESSAGE: (conversationId, messageId) => `${API_BASE_URL}/api/conversations/${conversationId}/messages/${messageId}`,
    DELETE_CONVERSATION: (conversationId) => `${API_BASE_URL}/api/conversations/${conversationId}`,
};