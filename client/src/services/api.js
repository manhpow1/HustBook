import axios from 'axios'
import { useUserState } from '../store/user-state'
import { API_ENDPOINTS } from '../config/api'

const api = axios.create({
    baseURL: import.meta.env.VUE_APP_API_BASE_URL || 'http://localhost:3000/api'
})

api.interceptors.request.use(config => {
    const { token, deviceToken } = useUserState()

    if (token.value) {
        config.headers['Authorization'] = `Bearer ${token.value}`
    }

    if (deviceToken.value) {
        config.headers['X-Device-Token'] = deviceToken.value
    }

    return config
})

const apiService = {
    get(url, config = {}) {
        return api.get(url, config)
    },

    post(url, data, config = {}) {
        return api.post(url, data, config)
    },

    put(url, data, config = {}) {
        return api.put(url, data, config)
    },

    delete(url, config = {}) {
        return api.delete(url, config)
    },

    getPost(postId) {
        return api.post(API_ENDPOINTS.GET_POST, { id: postId })
    },

    likePost(postId) {
        return api.post(API_ENDPOINTS.LIKE_POST, { postId })
    },

    addComment(postId, content) {
        return api.post(API_ENDPOINTS.ADD_COMMENT, { postId, content })
    },

    updateComment(id, data) {
        return api.put(`${API_ENDPOINTS.UPDATE_COMMENT}/${id}`, data)
    },

    deleteComment(id) {
        return api.delete(`${API_ENDPOINTS.DELETE_COMMENT}/${id}`)
    },

    getComments(postId, lastCommentId, limit = 10) {
        return api.get(`${API_ENDPOINTS.GET_COMMENTS}/${postId}/comments`, {
            params: {
                last_id: lastCommentId,
                limit
            }
        })
    },

    upload: async (url, formData, onUploadProgress) => {
        const { token } = useUserState()
        return axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token.value}`
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                onUploadProgress(percentCompleted)
            }
        })
    },
}

// Error handling middleware
api.interceptors.response.use(
    response => response,
    error => {
        // Handle global errors here
        if (error.response) {
            console.error('Response error:', error.response.data)
            if (error.response.status === 401) {
                // Handle unauthorized access
            }
        } else if (error.request) {
            console.error('Request error:', error.request)
        } else {
            console.error('Error:', error.message)
        }
        return Promise.reject(error)
    }
)

export default apiService