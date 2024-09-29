import { defineStore } from 'pinia'
import apiService from '../services/api'

export const usePostStore = defineStore('post', {
    state: () => ({
        posts: [],
    }),
    actions: {
        async fetchPosts(page) {
            const response = await apiService.get('/posts/get_list_posts', {
                params: { page, limit: 10 }
            })
            return response.data.data
        },
        async likePost(postId) {
            await apiService.likePost(postId)
        },
    },
})