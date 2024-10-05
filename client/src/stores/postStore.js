import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'
import { formatNumber } from '../utils/numberFormat'
import { handleError } from '../utils/errorHandler'

export const usePostStore = defineStore('post', () => {
    const posts = ref([])
    const currentPost = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const comments = ref([])
    const loadingComments = ref(false)
    const commentError = ref(null)
    const hasMorePosts = ref(true)

    const formattedLikes = computed(() => formatNumber(currentPost.value?.like || 0))
    const formattedComments = computed(() => formatNumber(currentPost.value?.comment || 0))

    async function fetchPosts() {
        loading.value = true
        try {
            const response = await apiService.get(API_ENDPOINTS.GET_POSTS)
            posts.value = response.data.data
        } catch (error) {
            handleError(error)
        } finally {
            loading.value = false
        }
    }

    async function fetchPost(id) {
        loading.value = true
        error.value = null
        try {
            const response = await api.get(`/posts/${id}`)
            currentPost.value = response.data.data
        } catch (err) {
            console.error('Error fetching post:', err)
            error.value = 'Failed to load post'
        } finally {
            loading.value = false
        }
    }

    async function createPost(postData) {
        loading.value = true
        error.value = null
        try {
            const response = await api.post('/posts', postData)
            posts.value.unshift(response.data.data)
            return response.data
        } catch (err) {
            console.error('Error creating post:', err)
            error.value = 'Failed to create post'
            throw err
        } finally {
            loading.value = false
        }
    }

    async function likePost(id) {
        try {
            await api.post(`/posts/${id}/like`)
            const post = posts.value.find(p => p.id === id)
            if (post) {
                post.likes++
                post.isLiked = true
            }
            if (currentPost.value && currentPost.value.id === id) {
                currentPost.value.likes++
                currentPost.value.isLiked = true
            }
        } catch (err) {
            console.error('Error liking post:', err)
            throw err
        }
    }

    async function fetchComments(postId) {
        loadingComments.value = true
        commentError.value = null
        try {
            const response = await api.get(`/posts/${postId}/comments`)
            comments.value = response.data.data
        } catch (err) {
            console.error('Error fetching comments:', err)
            commentError.value = 'Failed to load comments'
        } finally {
            loadingComments.value = false
        }
    }

    async function addComment(postId, content) {
        try {
            const response = await api.post(`/posts/${postId}/comments`, { content })
            comments.value.unshift(response.data.data)
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value.comment++
            }
        } catch (err) {
            console.error('Error adding comment:', err)
            throw err
        }
    }

    async function fetchPostsByHashtag(hashtag, loadMore = false) {
        if (!loadMore) {
            loading.value = true
            posts.value = []
        }
        error.value = null
        try {
            const response = await api.get(`/posts/hashtag/${hashtag}`, { params: { page: loadMore ? posts.value.length / 10 + 1 : 1 } })
            posts.value = loadMore ? [...posts.value, ...response.data.data] : response.data.data
            hasMorePosts.value = response.data.data.length === 10 // Assuming 10 posts per page
        } catch (err) {
            console.error('Error fetching posts by hashtag:', err)
            error.value = 'Failed to load posts'
        } finally {
            loading.value = false
        }
    }

    return {
        posts,
        currentPost,
        loading,
        error,
        comments,
        loadingComments,
        commentError,
        hasMorePosts,
        formattedLikes,
        formattedComments,
        fetchPosts,
        fetchPost,
        createPost,
        likePost,
        fetchComments,
        addComment,
        fetchPostsByHashtag
    }
})