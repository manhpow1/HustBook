import { defineStore } from 'pinia';
import { ref } from 'vue';
import { openDB } from 'idb';
import apiService from '../services/api';
import { handleError } from '../utils/errorHandler';
import { database } from '../config/firebase';
import { ref as dbRef, onChildAdded, off } from 'firebase/database';

export const useCommentStore = defineStore('comment', () => {
    const comments = ref([]);
    const loadingComments = ref(false);
    const commentError = ref(null);
    const hasMoreComments = ref(true);
    const pageIndex = ref(0);

    const dbPromise = openDB('comments-store', 1, {
        upgrade(db) {
            db.createObjectStore('comments', { keyPath: 'id' });
            db.createObjectStore('offline-comments', { keyPath: 'tempId' });
        },
    });

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

            const db = await dbPromise;
            const tx = db.transaction('comments', 'readwrite');
            fetchedComments.forEach(comment => tx.store.put(comment));
            await tx.done;

            return filteredComments;
        } catch (error) {
            console.error('Error in fetchComments:', error);
            handleError(error, router);
            return [];
        } finally {
            loadingComments.value = false;
        }
    };

    const addComment = async (postId, content) => {
        try {
            if (!navigator.onLine) {
                return await addOfflineComment(postId, content);
            }

            const response = await apiService.addComment(postId, content);
            const newComment = response.data;

            console.debug('New comment from API:', newComment);

            comments.value.unshift(newComment);
            console.debug('Updated comments in store:', comments.value);

            const db = await dbPromise;
            await db.add('comments', newComment);

            return newComment;
        } catch (error) {
            if (!navigator.onLine) {
                return await addOfflineComment(postId, content);
            }
            console.error('Failed to add comment:', error);
            throw error;
        }
    };

    const addOfflineComment = async (postId, content) => {
        const offlineComment = {
            tempId: Date.now(),
            postId,
            content,
            createdAt: new Date().toISOString(),
            isOffline: true
        };
        comments.value.unshift(offlineComment);

        const db = await dbPromise;
        await db.add('offline-comments', offlineComment);

        return offlineComment;
    };

    const updateComment = async (postId, commentId, content) => {
        const response = await apiService.updateComment(postId, commentId, content);
        const index = comments.value.findIndex(c => c.id === commentId);
        if (index !== -1) {
            comments.value[index] = response.data;
        }
    };

    const deleteComment = async (postId, commentId) => {
        await apiService.deleteComment(postId, commentId);
        comments.value = comments.value.filter(c => c.id !== commentId);
    };

    const resetComments = () => {
        comments.value = [];
        pageIndex.value = 0;
        hasMoreComments.value = true;
    };

    const prefetchComments = async (postId) => {
        if (comments.value.length === 0 && !loadingComments.value) {
            await fetchComments(postId);
        }
    };

    const syncOfflineComments = async () => {
        const db = await dbPromise;
        const offlineComments = await db.getAll('offline-comments');

        for (const comment of offlineComments) {
            try {
                const response = await apiService.addComment(comment.postId, comment.content);
                const syncedComment = response.data;

                await db.delete('offline-comments', comment.tempId);
                await db.add('comments', syncedComment);

                const index = comments.value.findIndex(c => c.tempId === comment.tempId);
                if (index !== -1) {
                    comments.value[index] = syncedComment;
                }
            } catch (error) {
                console.error('Failed to sync comment:', error);
            }
        }
    };

    const setupRealtimeComments = (postId) => {
        const commentsRef = dbRef(database, `comments/${postId}`);
        const callback = (snapshot) => {
            const newComment = snapshot.val();
            if (!comments.value.some(comment => comment.id === newComment.id)) {
                comments.value.unshift(newComment);
            }
        };
        onChildAdded(commentsRef, callback);

        return () => off(commentsRef, 'child_added', callback);
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
        syncOfflineComments,
        setupRealtimeComments,
    };
});