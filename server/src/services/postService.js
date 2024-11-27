const Post = require('../models/Post');
const admin = require('firebase-admin');
const { db } = require('../config/firebase');
const { getBoundingBox, getDistance } = require('../utils/geoUtils');
const { collections, createDocument, getDocument, updateDocument, deleteDocument } = require('../config/database');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

const createPost = async (userId, content, images) => {
    try {
        const postData = new Post({ userId, content, images }).toJSON();
        const postId = await createDocument(collections.posts, postData);
        return postId;
    } catch (error) {
        logger.error('Error in createPost service:', error);
        throw createError('9999', 'Exception error');
    }
};

const getPost = async (postId) => {
    try {
        const post = await getDocument(collections.posts, postId);
        return post ? new Post(post) : null;
    } catch (error) {
        logger.error('Error in getPost service:', error);
        throw createError('9999', 'Exception error');
    }
};

const updatePost = async (postId, userId, content, images) => {
    try {
        const existingPost = await getPost(postId);
        if (!existingPost || existingPost.userId !== userId) {
            throw createError('9992', 'Post not found or unauthorized');
        }

        const updatedPost = new Post({
            ...existingPost,
            content,
            images,
            updatedAt: new Date(),
        }).toJSON();

        await updateDocument(collections.posts, postId, updatedPost);
        return updatedPost;
    } catch (error) {
        logger.error('Error in updatePost service:', error);
        if (error.code) {
            throw error;
        }
        throw createError('9999', 'Exception error');
    }
};

const deletePost = async (postId) => {
    try {
        await deleteDocument(collections.posts, postId);
    } catch (error) {
        logger.error('Error in deletePost service:', error);
        throw createError('9999', 'Exception error');
    }
};

const checkUserLike = async (postId, userId) => {
    try {
        const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);
        const likeDoc = await likeRef.get();
        return likeDoc.exists;
    } catch (error) {
        logger.error('Error in checkUserLike service:', error);
        throw createError('9999', 'Exception error');
    }
};

const toggleLike = async (postId, userId) => {
    try {
        const isLiked = await checkUserLike(postId, userId);
        await db.runTransaction(async (transaction) => {
            const postRef = db.collection(collections.posts).doc(postId);
            const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);

            if (isLiked) {
                transaction.update(postRef, { likes: admin.firestore.FieldValue.increment(-1) });
                transaction.delete(likeRef);
            } else {
                transaction.update(postRef, { likes: admin.firestore.FieldValue.increment(1) });
                transaction.set(likeRef, { userId, postId, createdAt: new Date() });
            }
        });
    } catch (error) {
        logger.error('Error in toggleLike service:', error);
        throw createError('9999', 'Exception error');
    }
};

const addComment = async (postId, userId, content) => {
    try {
        const batch = db.batch();
        const commentData = {
            userId,
            postId,
            content,
            createdAt: new Date(),
        };
        const commentRef = db.collection(collections.comments).doc();
        batch.set(commentRef, commentData);
        batch.update(db.collection(collections.posts).doc(postId), {
            comments: admin.firestore.FieldValue.increment(1),
        });
        await batch.commit();
        return commentRef.id;
    } catch (error) {
        logger.error('Error in addComment service:', error);
        throw createError('9999', 'Exception error');
    }
};

const getComments = async (postId, limit = 20, startAfterDoc = null) => {
    try {
        let query = db.collection(collections.comments)
            .where('postId', '==', postId)
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (startAfterDoc) {
            query = query.startAfter(startAfterDoc);
        }

        const snapshot = await query.get();

        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return {
            comments,
            lastVisible,
        };
    } catch (error) {
        logger.error('Error in getComments service:', error);
        throw createError('9999', 'Exception error');
    }
};

const getUserPosts = async (userId, limit = 20, startAfterDoc = null) => {
    try {
        let query = db.collection(collections.posts)
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc');

        query = query.limit(limit);

        if (startAfterDoc) {
            query = query.startAfter(startAfterDoc);
        }

        const snapshot = await query.get();

        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return {
            posts,
            lastVisible,
        };
    } catch (error) {
        logger.error('Error in getUserPosts service:', error);
        throw createError('9999', 'Exception error');
    }
};

const reportPost = async (postId, userId, reason, details) => {
    try {
        const reportData = {
            postId,
            userId,
            reason,
            details: details || '',
            createdAt: new Date(),
            status: 'pending',
        };
        await createDocument(collections.reports, reportData);
        // Optionally, notify admins or handle further logic
    } catch (error) {
        logger.error('Error in reportPost service:', error);
        throw createError('9999', 'Exception error');
    }
};

const getListPosts = async ({
    userId,
    inCampaign,
    campaignId,
    latitude,
    longitude,
    lastVisible,
    limit = 20,
}) => {
    try {
        let query = db.collection(collections.posts)
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (inCampaign === '1' && campaignId) {
            query = query.where('campaignId', '==', campaignId);
        }

        if (latitude && longitude) {
            const radiusKm = 10;
            const bounds = getBoundingBox(latitude, longitude, radiusKm);
            query = query.where('location.latitude', '>=', bounds.minLat)
                .where('location.latitude', '<=', bounds.maxLat);
        }

        if (lastVisible) {
            query = query.startAfter(lastVisible);
        }

        const snapshot = await query.get();

        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const authorIds = [...new Set(posts.map(post => post.userId))];
        const authorDocs = await db.collection(collections.users).where('__name__', 'in', authorIds).get();
        const authorMap = new Map(authorDocs.docs.map(doc => [doc.id, doc.data()]));

        const likeChecks = posts.map(post => checkUserLike(post.id, userId));
        const likeResults = await Promise.all(likeChecks);
        const newLastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        const postsWithDetails = posts.map((post, index) => {
            let postWithDetails = {
                ...post,
                isLiked: likeResults[index],
                author: {
                    id: post.userId,
                    ...authorMap.get(post.userId),
                },
            };

            if (latitude && longitude && post.location) {
                const distance = getDistance(
                    latitude,
                    longitude,
                    post.location.latitude,
                    post.location.longitude
                );
                if (distance <= 10) {
                    postWithDetails.distance = distance.toFixed(2);
                } else {
                    return null;
                }
            }

            return postWithDetails;
        }).filter(Boolean);

        return {
            posts: postsWithDetails,
            lastVisible: newLastVisible,
        };
    } catch (error) {
        logger.error('Error in getListPosts service:', error);
        throw createError('9999', 'Exception error');
    }
};

module.exports = {
    createPost,
    getPost,
    updatePost,
    deletePost,
    checkUserLike,
    toggleLike,
    addComment,
    getComments,
    getUserPosts,
    reportPost,
    getListPosts,
};