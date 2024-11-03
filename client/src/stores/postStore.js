import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '../services/api'
import { formatNumber } from '../utils/numberFormat'
import { handleError } from '../utils/errorHandler'
import { API_ENDPOINTS } from '../config/api'
import { useRouter } from 'vue-router'

export const usePostStore = defineStore('post', () => {
    const posts = ref([])
    const currentPost = ref(null)
    const loading = ref(false)
    const error = ref(null)
    const comments = ref([])
    const loadingComments = ref(false)
    const commentError = ref(null)
    const hasMoreComments = ref(true)
    const pageIndex = ref(0)
    const hasMorePosts = ref(true)
    const lastId = ref(null)
    const router = useRouter()

    const formattedLikes = computed(() => {
        const likes = currentPost.value?.likes || 0
        return formatNumber(Math.max(likes, 0)) // Ensure no negative values
    })
    const formattedComments = computed(() => formatNumber(currentPost.value?.comment || 0))

    async function fetchPosts(params = {}) {
        if (!hasMorePosts.value) return;

        loading.value = true
        error.value = null
        try {
            const response = await apiService.getListPosts({
                ...params,
                last_id: lastId.value,
                index: posts.value.length,
                count: 10
            })
            if (response.data.code === '1000') {
                const newPosts = response.data.data.posts
                posts.value.push(...newPosts)
                lastId.value = response.data.data.last_id
                hasMorePosts.value = newPosts.length === 10
            } else {
                throw new Error(response.data.message || 'Failed to load posts')
            }
        } catch (err) {
            await handleError(err, router)
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
            await handleError(err, router)

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

    async function fetchComments(postId, count = 10) {
        try {
            loadingComments.value = true;
            const response = await apiService.post(API_ENDPOINTS.GET_COMMENTS(postId), {
                id: postId,
                index: pageIndex.value,
                count
            });

            if (response.data.code === '1000') {
                const newComments = response.data.data;
                if (newComments.length < count) {
                    hasMoreComments.value = false; // No more comments to load
                }
                comments.value.push(...newComments); // Append new comments
                pageIndex.value += 1;
            } else {
                throw new Error(response.data.message || 'Failed to load comments');
            }
        } catch (error) {
            commentError.value = error.message;
            await handleError(error, router);
        } finally {
            loadingComments.value = false;
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

    function resetComments() {
        comments.value = [];
        pageIndex.value = 0;
        hasMoreComments.value = true;
    }

    function resetPosts() {
        posts.value = []
        lastId.value = null
        hasMorePosts.value = true
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
        hasMoreComments,
        formattedLikes,
        formattedComments,
        pageIndex,
        resetPosts,
        resetComments,
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