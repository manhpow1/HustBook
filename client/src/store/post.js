// src/stores/postStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiService from '@/services/api'
import { useI18n } from 'vue-i18n'
import logger from '../services/logging'

function useLogger() {
    return logger
}

export const usePostStore = defineStore('post', () => {
    const { t } = useI18n()
    const logger = useLogger()

    // State
    const currentPost = ref(null)
    const comments = ref([])
    const loading = ref(false)
    const error = ref(null)
    const loadingMoreComments = ref(false)
    const commentError = ref(null)
    const lastCommentId = ref(null)
    const hasMoreComments = ref(true)

    // Getters
    const isLiked = computed(() => currentPost.value?.is_liked === '1')

    // Actions
    const fetchPost = async (postId) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.getPost(postId)
            if (response.data.code === '1000') {
                currentPost.value = {
                    ...response.data.data,
                    like: isNaN(parseInt(response.data.data.like)) ? '0' : response.data.data.like,
                    comment: isNaN(parseInt(response.data.data.comment)) ? '0' : response.data.data.comment,
                    is_liked: ['0', '1'].includes(response.data.data.is_liked) ? response.data.data.is_liked : '0',
                    described: response.data.data.described || '',
                    author: {
                        id: response.data.data.author?.id || '',
                        name: response.data.data.author?.name || 'Unknown',
                        avatar: response.data.data.author?.avatar || '/path/to/default/avatar.jpg'
                    },
                    hashtags: response.data.data.hashtags || [],
                    link: response.data.data.link || null
                }
            } else {
                throw new Error(response.data.message)
            }
        } catch (err) {
            handleError(err)
        } finally {
            loading.value = false
        }
    }

    const editPost = async (postId, updatedData) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiService.put(`/posts/edit_post/${postId}`, updatedData)
            if (response.data.code === '1000') {
                // Update the currentPost if it's the one being edited
                if (currentPost.value && currentPost.value.id === postId) {
                    currentPost.value = {
                        ...currentPost.value,
                        ...updatedData,
                        described: updatedData.described || currentPost.value.described,
                        image: updatedData.image || currentPost.value.image,
                        video: updatedData.video || currentPost.value.video,
                        like: updatedData.like || currentPost.value.like,
                        comment: updatedData.comment || currentPost.value.comment,
                        is_liked: updatedData.is_liked || currentPost.value.is_liked,
                        status: updatedData.status || currentPost.value.status,
                        hashtags: updatedData.hashtags || currentPost.value.hashtags,
                        link: updatedData.link || currentPost.value.link
                    }
                }
                return response.data
            } else {
                throw new Error(response.data.message || 'Failed to edit post')
            }
        } catch (err) {
            handleError(err, 'errorEditingPost')
            throw err
        } finally {
            loading.value = false
        }
    }

    const loadMoreComments = async (postId) => {
        if (!hasMoreComments.value || loadingMoreComments.value) return

        loadingMoreComments.value = true
        commentError.value = null
        try {
            const response = await apiService.getComments(postId, lastCommentId.value)
            if (response.data && response.data.data) {
                const newComments = response.data.data
                comments.value = [...comments.value, ...newComments]
                if (newComments.length > 0) {
                    lastCommentId.value = newComments[newComments.length - 1].id
                }
                hasMoreComments.value = newComments.length === 10 // Assuming 10 is the page size
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            handleError(err, 'errorFetchingComments')
        } finally {
            loadingMoreComments.value = false
        }
    }

    const retryLoadComments = async (postId) => {
        commentError.value = null
        await loadMoreComments(postId)
    }

    const likePost = async (postId) => {
        const originalLikeStatus = currentPost.value.is_liked
        const originalLikeCount = parseInt(currentPost.value.like)

        // Optimistic update
        currentPost.value.is_liked = currentPost.value.is_liked === '1' ? '0' : '1'
        currentPost.value.like = (originalLikeCount + (currentPost.value.is_liked === '1' ? 1 : -1)).toString()

        try {
            await apiService.likePost(postId)
        } catch (err) {
            // Revert optimistic update on error
            currentPost.value.is_liked = originalLikeStatus
            currentPost.value.like = originalLikeCount.toString()
            handleError(err, 'errorLikingPost')
        }
    }

    const addComment = async (postId, content) => {
        const tempId = Date.now().toString()
        const tempComment = {
            id: tempId,
            content: content,
            user: { name: 'You', avatar: '/path/to/your/avatar.jpg' },
            created: new Date().toISOString()
        }

        // Optimistic update
        comments.value.unshift(tempComment)
        currentPost.value.comment = (parseInt(currentPost.value.comment) + 1).toString()

        try {
            const response = await apiService.addComment(postId, content)
            const index = comments.value.findIndex(c => c.id === tempId)
            if (index !== -1) {
                comments.value[index] = response.data.data
            }
        } catch (err) {
            // Revert optimistic update on error
            comments.value = comments.value.filter(c => c.id !== tempId)
            currentPost.value.comment = (parseInt(currentPost.value.comment) - 1).toString()
            handleError(err, 'errorAddingComment')
        }
    }

    const updateComment = async (postId, commentId, content) => {
        const originalComment = comments.value.find(c => c.id === commentId)
        const originalContent = originalComment ? originalComment.content : ''

        // Optimistic update
        if (originalComment) {
            originalComment.content = content
        }

        try {
            const response = await apiService.updateComment(commentId, { content })
            const index = comments.value.findIndex(c => c.id === commentId)
            if (index !== -1) {
                comments.value[index] = { ...comments.value[index], ...response.data.data }
            }
        } catch (err) {
            // Revert optimistic update on error
            if (originalComment) {
                originalComment.content = originalContent
            }
            handleError(err, 'errorUpdatingComment')
        }
    }

    const deleteComment = async (postId, commentId) => {
        const originalComments = [...comments.value]
        const originalCommentCount = currentPost.value.comment

        // Optimistic update
        comments.value = comments.value.filter(c => c.id !== commentId)
        currentPost.value.comment = (parseInt(currentPost.value.comment) - 1).toString()

        try {
            await apiService.deleteComment(commentId)
        } catch (err) {
            // Revert optimistic update on error
            comments.value = originalComments
            currentPost.value.comment = originalCommentCount
            handleError(err, 'errorDeletingComment')
        }
    }

    const togglePostContent = (postId) => {
        if (currentPost.value && currentPost.value.id === postId) {
            currentPost.value.showFullContent = !currentPost.value.showFullContent
        }
    }

    // Error handling
    const handleError = (error, customErrorKey = null) => {
        logger.error('Error in postStore:', { error: error.message, customErrorKey })

        if (error.response?.status === 401) {
            error.value = t('errorUnauthorized')
        } else if (error.response?.status === 404) {
            error.value = t('errorNotFound')
        } else if (error.response) {
            error.value = t('errorServer')
        } else if (error.request) {
            error.value = t('errorNetwork')
        } else {
            error.value = t('errorUnknown')
        }

        if (customErrorKey) {
            error.value = t(customErrorKey)
        }
    }

    return {
        currentPost,
        comments,
        loading,
        error,
        loadingMoreComments,
        commentError,
        isLiked,
        editPost,
        fetchPost,
        loadMoreComments,
        retryLoadComments,
        likePost,
        addComment,
        updateComment,
        deleteComment,
        togglePostContent
    }
})