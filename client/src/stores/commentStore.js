import { defineStore } from 'pinia';
import { ref } from 'vue';
import { openDB } from 'idb';
import apiService from '../services/api';
import { useErrorHandler } from '@/utils/errorHandler';
import { db } from '../config/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import logger from '../services/logging';

export const useCommentStore = defineStore('comment', () => {
    const comments = ref([]);
    const loadingComments = ref(false);
    const commentError = ref(null);
    const hasMoreComments = ref(true);
    const pageIndex = ref(0);
    const { handleError } = useErrorHandler();

    const dbPromise = openDB('comments-store', 1, {
        upgrade(db) {
            db.createObjectStore('comments', { keyPath: 'id' });
            db.createObjectStore('offline-comments', { keyPath: 'tempId' });
        },
    });

    const fetchComments = async (postId, count = 10, router) => {
        loadingComments.value = true;
        commentError.value = null;

        logger.debug('Fetching comments for postId:', postId);

        try {
            const response = await apiService.getComments(postId, pageIndex.value, count);
            const fetchedComments = Array.isArray(response?.data) ? response.data : [];

            logger.debug('Fetched comments:', fetchedComments);

            // Filter out comments from blocked users
            const filteredComments = fetchedComments.filter(
                (comment) => comment.user?.name !== 'Blocked User'
            );

            logger.debug('Filtered comments:', filteredComments);

            if (filteredComments.length === 0) {
                logger.debug('No more comments. Setting hasMoreComments to false.');
                hasMoreComments.value = false;
            } else {
                comments.value.push(...filteredComments);
                pageIndex.value += 1;
            }

            const idb = await dbPromise;
            const tx = idb.transaction('comments', 'readwrite');
            filteredComments.forEach((comment) => tx.store.put(comment));
            await tx.done;

            return filteredComments;
        } catch (error) {
            logger.error('Error in fetchComments:', error);
            await handleError(error, router);
            commentError.value = 'Failed to fetch comments';
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

            logger.debug('New comment from API:', newComment);

            comments.value.unshift(newComment);
            logger.debug('Updated comments in store:', comments.value);

            const idb = await dbPromise;
            await idb.add('comments', newComment);

            // Add comment to Firestore
            await addDoc(collection(db, 'comments', postId, 'commentList'), newComment);

            return newComment;
        } catch (error) {
            if (!navigator.onLine) {
                return await addOfflineComment(postId, content);
            }
            logger.error('Failed to add comment:', error);
            throw error;
        }
    };

    const addOfflineComment = async (postId, content) => {
        const offlineComment = {
            tempId: Date.now().toString(),
            postId,
            content,
            createdAt: new Date().toISOString(),
            isOffline: true
        };
        comments.value.unshift(offlineComment);

        const idb = await dbPromise;
        await idb.add('offline-comments', offlineComment);

        return offlineComment;
    };

    const updateComment = async (postId, commentId, content) => {
        try {
            const response = await apiService.updateComment(postId, commentId, content);
            const updatedComment = response.data;
            const index = comments.value.findIndex(c => c.id === commentId);
            if (index !== -1) {
                comments.value[index] = updatedComment;
            }
            return updatedComment;
        } catch (error) {
            console.error('Failed to update comment:', error);
            throw error;
        }
    };

    const deleteComment = async (postId, commentId) => {
        try {
            await apiService.deleteComment(postId, commentId);
            comments.value = comments.value.filter(c => c.id !== commentId);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            throw error;
        }
    };

    const resetComments = () => {
        comments.value = [];
        pageIndex.value = 0;
        hasMoreComments.value = true;
        commentError.value = null;
    };

    const prefetchComments = async (postId) => {
        if (comments.value.length === 0 && !loadingComments.value) {
            await fetchComments(postId);
        }
    };

    const syncOfflineComments = async () => {
        const idb = await dbPromise;
        const offlineComments = await idb.getAll('offline-comments');
        for (const comment of offlineComments) {
            try {
                const response = await apiService.addComment(comment.postId, comment.content);
                const syncedComment = response.data;
                await idb.delete('offline-comments', comment.tempId);
                await idb.add('comments', syncedComment);

                const index = comments.value.findIndex(c => c.tempId === comment.tempId);
                if (index !== -1) {
                    comments.value[index] = syncedComment;
                }
                // Add synced comment to Firestore
                await addDoc(collection(db, 'comments', comment.postId, 'commentList'), syncedComment);
            } catch (error) {
                console.error('Failed to sync comment:', error);
            }
        }
    };

    const setupRealtimeComments = (postId) => {
        const commentsRef = collection(db, 'comments', postId, 'commentList');
        const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newComment = { id: change.doc.id, ...change.doc.data() };
                    if (!comments.value.some(comment => comment.id === newComment.id)) {
                        comments.value.unshift(newComment);
                    }
                }
            });
        }, (error) => {
            console.error('Error in realtime comments:', error);
            commentError.value = 'Failed to setup realtime comments';
        });
        return unsubscribe;
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