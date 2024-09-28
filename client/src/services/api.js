import axios from 'axios'
import { useUserState } from '../store/user-state'

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
        return api.post('/posts/get_post', { id: postId })
    },

    likePost(postId) {
        return api.post('/posts/like_post', { postId })
    },

    addComment(postId, content) {
        return api.post('/posts/add_comment', { postId, content })
    },

    updateComment(id, data) {
        return api.put(`/comments/${id}`, data)
    },

    deleteComment(id) {
        return api.delete(`/comments/${id}`)
    },

    getComments(postId, lastCommentId, limit = 10) {
        return api.get(`/posts/${postId}/comments`, {
            params: {
                last_id: lastCommentId,
                limit
            }
        })
    },

    upload(url, formData, onUploadProgress) {
        return api.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: progressEvent => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                if (onUploadProgress) {
                    onUploadProgress(percentCompleted)
                }
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
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Response error:', error.response.data)
            if (error.response.status === 401) {
                // Handle unauthorized access
                // For example, redirect to login page or refresh token
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Request error:', error.request)
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error:', error.message)
        }
        return Promise.reject(error)
    }
)

export default apiService