import { defineStore } from 'pinia';
import { ref, reactive, toRefs } from 'vue';
import { openDB } from 'idb';
import apiService from '../services/api';
import { useErrorHandler } from '@/utils/errorHandler';
import { db } from '../config/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import logger from '../services/logging';

export const useCommentStore = defineStore('comment', () => {
    const state = reactive({
        comments: [],
        loadingComments: false,
        commentError: null,
        hasMoreComments: true,
        pageIndex: 0,
        lastVisible: null
    })
    const { handleError } = useErrorHandler();

    const dbPromise = openDB('comments-store', 1, {
        upgrade(db) {
            db.createObjectStore('comments', { keyPath: 'commentId' });
            db.createObjectStore('offline-comments', { keyPath: 'tempId' });
        },
    });

    const fetchComments = async (postId, limit = 20, lastVisible = null) => {
        state.loadingComments = true
        state.commentError = null

        try {
            const response = await apiService.getComments(postId, {
                params: {
                    limit,
                    lastVisible
                }
            })

            if (response.data?.code !== '1000') {
                throw new Error(response.data?.message || 'Failed to fetch comments')
            }

            const { comments, lastVisible: newLastVisible } = response.data.data

            const validComments = comments?.filter(comment => 
                comment && comment.commentId && comment.content && comment.user
            ) || []

            if (!lastVisible) {
                state.comments = validComments
            } else {
                state.comments.push(...validComments)
            }

            state.lastVisible = newLastVisible
            state.hasMoreComments = comments.length === limit

            return comments
        } catch (error) {
            logger.error('Error in fetchComments:', error)
            state.commentError = 'Failed to fetch comments'
            throw error
        } finally {
            state.loadingComments = false
        }
    }

    const addComment = async (postId, content) => {
        try {
            if (!navigator.onLine) {
                return await addOfflineComment(postId, content)
            }

            const response = await apiService.addComment(postId, content);

            // Kiểm tra response code từ server
            if (response.data.code !== '1000') {
                throw new Error(response.data.message || 'Failed to add comment')
            }

            // Tạo comment mới với dữ liệu từ response
            const newComment = {
                commentId: response.data.commentId,
                content: content,
                created: new Date().toISOString(),
                like: 0,
                isLiked: false,
                user: {
                    userId: response.data.userId,
                    userName: response.data.userName,
                    avatar: response.data.avatar || ''
                }
            }

            state.comments.unshift(newComment)
            return newComment
        } catch (error) {
            if (!navigator.onLine) {
                return await addOfflineComment(postId, content)
            }
            throw error
        }
    }

    const addOfflineComment = async (postId, content) => {
        const offlineComment = {
            tempId: Date.now().toString(),
            postId,
            content,
            createdAt: new Date().toISOString(),
            isOffline: true
        };
        state.comments.unshift(offlineComment);

        const idb = await dbPromise;
        await idb.add('offline-comments', offlineComment);

        return offlineComment;
    };

    const updateComment = async (postId, commentId, content) => {
        try {
            const response = await apiService.updateComment(postId, commentId, content);
            const updatedComment = response.data;
            // Validate and sanitize the updated comment
            const sanitizedComment = sanitizeComment(updatedComment);
            const index = state.comments.findIndex(c => c.commentId === commentId);
            if (index !== -1) {
                state.comments[index] = sanitizedComment;
            }
            return sanitizedComment;
        } catch (error) {
            console.error('Failed to update comment:', error);
            throw error;
        }
    };

    const deleteComment = async (postId, commentId) => {
        try {
            await apiService.deleteComment(postId, commentId);
            state.comments = state.comments.filter(c => c.commentId !== commentId);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            throw error;
        }
    };

    const resetComments = () => {
        state.comments = [];
        state.pageIndex = 0;
        state.lastVisible = null;
        state.hasMoreComments = true;
        state.commentError = null;
        state.lastVisible = null;
    };

    const prefetchComments = async (postId) => {
        if (state.comments.length === 0 && !state.loadingComments) {
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
                const sanitizedComment = sanitizeComment(syncedComment);
                await idb.delete('offline-comments', comment.tempId);
                await idb.add('comments', sanitizedComment);

                const index = state.comments.findIndex(c => c.tempId === comment.tempId);
                if (index !== -1) {
                    state.comments[index] = sanitizedComment; // Safely update the synced comment
                }
                // Add synced comment to Firestore
                await addDoc(collection(db, 'comments', comment.postId, 'commentList'), sanitizedComment);
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
                    const newComment = { commentId: change.doc.id, ...change.doc.data() };
                    if (!state.comments.some(comment => comment.commentId === newComment.commentId)) {
                        state.comments.unshift(newComment);
                    }
                }
            });
        }, (error) => {
            console.error('Error in realtime comments:', error);
            state.commentError = 'Failed to setup realtime comments';
        });
        return unsubscribe;
    };

    function sanitizeComment(comment) {
        const allowedKeys = ['commentId', 'postId', 'content', 'createdAt', 'userId', 'isOffline'];
        return Object.keys(comment).reduce((sanitized, key) => {
            if (allowedKeys.includes(key)) {
                sanitized[key] = comment[key];
            }
            return sanitized;
        }, {});
    }

    return {
        ...toRefs(state),
        fetchComments,
        addComment,
        updateComment,
        deleteComment,
        resetComments,
        prefetchComments,
        syncOfflineComments,
        setupRealtimeComments,
    }
});
