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
        lastVisible: null,
        totalComments: 0
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
            });

<<<<<<< HEAD
            const responseData = response?.data?.data;
            
            // Validate response structure
            if (!responseData || typeof responseData !== 'object') {
                logger.error('Invalid response format:', { responseData });
                throw new Error('Invalid response format: missing data object');
            }

            // Ensure comments is an array, even if empty
            const comments = Array.isArray(responseData.comments) ? responseData.comments : [];
            
            if (!Array.isArray(responseData.comments)) {
                logger.warn('Comments field is not an array, defaulting to empty array', {
                    type: typeof responseData.comments,
                    value: responseData.comments
                });
            }

            const newLastVisible = responseData.lastVisible;
            const totalComments = responseData.totalComments || 0;

            // Validate and sanitize each comment
            const validComments = [];
            const invalidComments = [];

            for (const comment of comments) {
                try {
                    // Basic structure check
                    if (!comment || typeof comment !== 'object') {
                        throw new Error('Comment must be an object');
                    }

                    // Required fields validation
                    const requiredFields = {
                        commentId: 'string',
                        content: 'string',
                        created: 'string',
                        user: 'object'
                    };

                    for (const [field, type] of Object.entries(requiredFields)) {
                        if (!comment[field]) {
                            throw new Error(`Missing required field: ${field}`);
                        }
                        if (type === 'object' && typeof comment[field] !== 'object') {
                            throw new Error(`Invalid ${field}: must be an object`);
                        }
                        if (type === 'string' && typeof comment[field] !== 'string') {
                            throw new Error(`Invalid ${field}: must be a string`);
                        }
                    }

                    // User object validation
                    if (!comment.user.userId || typeof comment.user.userId !== 'string') {
                        throw new Error('Invalid or missing user.userId');
                    }
                    if (!comment.user.userName || typeof comment.user.userName !== 'string') {
                        throw new Error('Invalid or missing user.userName');
                    }

                    // Sanitize and normalize the comment object
                    const sanitizedComment = {
                        commentId: comment.commentId,
                        content: comment.content.trim(),
                        created: comment.created,
                        like: parseInt(comment.like || 0),
                        isLiked: Boolean(comment.isLiked),
                        user: {
                            userId: comment.user.userId,
                            userName: comment.user.userName,
                            avatar: comment.user.avatar || ''
                        }
                    };

                    validComments.push(sanitizedComment);
                } catch (error) {
                    invalidComments.push({
                        comment,
                        error: error.message
                    });
                    logger.warn('Invalid comment data:', { 
                        error: error.message,
                        comment: JSON.stringify(comment)
                    });
                }
            }

            if (invalidComments.length > 0) {
                logger.warn('Found invalid comments:', { 
                    total: comments.length,
                    invalid: invalidComments.length,
                    details: invalidComments
                });
            }

            if (validComments.length === 0 && comments.length > 0) {
                logger.error('No valid comments found in response');
                throw new Error('No valid comments found in response data');
            }

            logger.debug('Fetched comments:', {
                total: comments.length,
                valid: validComments.length,
                lastVisible: newLastVisible
            })
=======
            if (response.data?.code !== '1000') {
                throw new Error(response.data?.message || 'Failed to fetch comments')
            }

            const { comments, lastVisible: newLastVisible, totalComments } = response.data.data

            const validComments = comments?.filter(comment => 
                comment && comment.commentId && comment.content && comment.user
            ) || []
>>>>>>> parent of ccbdb56 (debug)

            if (!lastVisible) {
                state.comments = validComments
            } else {
                state.comments.push(...validComments)
            }

            state.lastVisible = newLastVisible
            state.hasMoreComments = comments.length === limit
            state.totalComments = totalComments || 0

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
        
        if (offlineComments.length === 0) {
            return [];
        }

        logger.debug('Syncing offline comments:', { count: offlineComments.length });
        const syncResults = [];

        for (const comment of offlineComments) {
            try {
                const response = await apiService.addComment(comment.postId, comment.content);
                if (!response?.data) {
                    throw new Error('Invalid response format');
                }

                const syncedComment = sanitizeComment(response.data);
                
                // Remove from offline storage
                await idb.delete('offline-comments', comment.tempId);
                
                // Store in local cache
                await idb.add('comments', syncedComment);
                
                // Add to Firestore
                await addDoc(collection(db, 'comments', comment.postId, 'commentList'), syncedComment);
                
                syncResults.push(syncedComment);
                
                logger.debug('Comment synced successfully:', { commentId: syncedComment.commentId });
            } catch (error) {
                logger.error('Failed to sync comment:', error);
            }
        }

        // Batch update state after all syncs complete
        if (syncResults.length > 0) {
            state.comments = [...syncResults, ...state.comments];
        }

        return syncResults;
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
