import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api'; // Import as default
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
            const fetchedComments = Array.isArray(response?.data) ? response.data : [];

            console.debug('Fetched comments:', fetchedComments);

            // Filter out comments from blocked users
            const filteredComments = fetchedComments.filter(
                (comment) => comment.user?.name !== 'Blocked User'
            );

            console.debug('Filtered comments:', filteredComments);

            if (filteredComments.length === 0) {
                console.debug('No more comments. Setting hasMoreComments to false.');
                hasMoreComments.value = false;
            } else {
                comments.value.push(...filteredComments);
                pageIndex.value += 1;
            }
            return filteredComments;
        } catch (error) {
            console.error('Error in fetchComments:', error);
            handleError(error, router); // Use the error handler
            return [];
        } finally {
            loadingComments.value = false;
        }
    };

    const addComment = async (postId, content) => {
        try {
            const response = await apiService.addComment(postId, content);
            const newComment = response.data;

            console.debug('New comment from API:', newComment);

            // Add the new comment to the beginning of the comments array
            comments.value.unshift(newComment);
            console.debug('Updated comments in store:', comments.value);
            return newComment;
        } catch (error) {
            console.error('Failed to add comment:', error);
            throw error; // Rethrow to be handled in the component
        }
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
            fetchComments(postId);
        }
    };

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
}
);