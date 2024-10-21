import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../services/api';
import { handleError } from '../utils/errorHandler';

export const useCommentStore = defineStore('comment', () => {
    const comments = ref([]);
    const loadingComments = ref(false);
    const commentError = ref(null);
    const hasMoreComments = ref(true);
    const pageIndex = ref(0);

    const fetchComments = async (postId, count = 10, router) => {
        loadingComments.value = true;
        commentError.value = null;

        console.debug('Fetching comments for postId:', postId);

        try {
            const response = await apiService.getComments(postId, pageIndex.value, count);
            console.debug('Comments fetched:', response.data);

            if (response.data.length === 0) {
                hasMoreComments.value = false;
            } else {
                comments.value.push(...response.data);
                pageIndex.value += 1;
            }
        } catch (error) {
            console.debug('Error in fetchComments:', error);
            handleError(error, router);  // Ensure the router is passed correctly
        } finally {
            loadingComments.value = false;
        }
    };


    const addComment = async (postId, content) => {
        const response = await api.post(`/posts/${postId}/comments`, { content });
        comments.value.unshift(response.data);
    };

    const updateComment = async (postId, commentId, content) => {
        const response = await api.put(`/posts/${postId}/comments/${commentId}`, { content });
        const index = comments.value.findIndex(c => c.id === commentId);
        if (index !== -1) {
            comments.value[index] = response.data;
        }
    };

    const deleteComment = async (postId, commentId) => {
        await api.delete(`/posts/${postId}/comments/${commentId}`);
        comments.value = comments.value.filter(c => c.id !== commentId);
    };

    const resetComments = () => {
        comments.value = [];
        pageIndex.value = 0;
        hasMoreComments.value = true;
    };

    const prefetchComments = async (postId) => {
        if (comments.value.length === 0 && !loadingComments.value) {
            fetchComments(postId)
        }
    }

    return {
        comments,
        loadingComments,
        commentError,
        hasMoreComments,
        fetchComments,
        addComment,
        updateComment,
        deleteComment,
        resetComments,
        prefetchComments,
    };
});