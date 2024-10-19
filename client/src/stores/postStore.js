import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/api'
import { formatNumber } from '../utils/numberFormat'
import { handleError } from '../utils/errorHandler'
import { API_ENDPOINTS } from '../config/api'

export const usePostStore = defineStore('post', () => {
    const posts = ref([])
    const currentPost = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const comments = ref([])
    const loadingComments = ref(false)
    const commentError = ref(null)
    const hasMorePosts = ref(true)

    const formattedLikes = computed(() => {
        const likes = currentPost.value?.likes || 0
        return formatNumber(Math.max(likes, 0)) // Ensure no negative values
    })
    const formattedComments = computed(() => formatNumber(currentPost.value?.comment || 0))

    async function fetchPosts() {
        loading.value = true
        try {
            const response = await apiService.get(API_ENDPOINTS.GET_POSTS)
            posts.value = response.data.data
        } catch (err) {
            handleError(err)
            error.value = 'Failed to load posts'
        } finally {
            loading.value = false
        }
    }

    async function fetchPost(postId) {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.get(API_ENDPOINTS.GET_POST(postId))
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
            const response = await apiService.post(API_ENDPOINTS.ADD_POST, postData)
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

    async function toggleLike(postId) {
        try {
            const post = posts.value.find(p => p.id === postId)
            const isLiked = post?.is_liked === '1'

            // Optimistic UI update
            if (post) {
                post.is_liked = isLiked ? '0' : '1'
                post.likes += isLiked ? -1 : 1
            }
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value.is_liked = isLiked ? '0' : '1'
                currentPost.value.likes += isLiked ? -1 : 1
            }

            // Call the like API
            await apiService.likePost(postId)
        } catch (err) {
            console.error('Error toggling like:', err)
            handleError(err)

            // Revert the UI update on failure
            const post = posts.value.find(p => p.id === postId)
            if (post) {
                const isLiked = post.is_liked === '1'
                post.is_liked = isLiked ? '0' : '1'
                post.likes += isLiked ? -1 : 1
            }
            if (currentPost.value && currentPost.value.id === postId) {
                const isLiked = currentPost.value.is_liked === '1'
                currentPost.value.is_liked = isLiked ? '0' : '1'
                currentPost.value.likes += isLiked ? -1 : 1
            }
        }
    }

    async function fetchComments(postId) {
        loadingComments.value = true
        commentError.value = null
        try {
            const response = await apiService.get(API_ENDPOINTS.GET_COMMENTS(postId))
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
            const response = await apiService.addComment(postId, content)
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
            const response = await apiService.get(`/posts/hashtag/${hashtag}`, {
                params: { page: loadMore ? posts.value.length / 10 + 1 : 1 }
            })
            posts.value = loadMore ? [...posts.value, ...response.data.data] : response.data.data
            hasMorePosts.value = response.data.data.length === 10
        } catch (err) {
            console.error('Error fetching posts by hashtag:', err)
            error.value = 'Failed to load posts'
        } finally {
            loading.value = false
        }
    }

    async function removePost(postId) {
        try {
            await apiService.deletePost(postId)
            const index = posts.value.findIndex(post => post.id === postId)
            if (index !== -1) {
                posts.value.splice(index, 1)
            }
            if (currentPost.value && currentPost.value.id === postId) {
                currentPost.value = null
            }
        } catch (err) {
            console.error('Error removing post:', err)
            error.value = 'Failed to remove post'
            throw err
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
        toggleLike,
        fetchComments,
        addComment,
        fetchPostsByHashtag,
        removePost,
    }
})