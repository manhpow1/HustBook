// src/services/postService.js

const { db } = require('../config/firebaseConfig');
const { collections, createDocument, getDocument, updateDocument, deleteDocument, queryDocuments } = require('../config/database');

const createPost = async (userId, content, images) => {
    const postData = {
        userId,
        content,
        images: images || [],
        createdAt: new Date(),
        likes: 0,
        comments: 0
    };

    return await createDocument(collections.posts, postData);
};

const getPost = async (postId) => {
    return await getDocument(collections.posts, postId);
};

const updatePost = async (postId, content, images) => {
    const updateData = {
        content,
        images: images || [],
        updatedAt: new Date()
    };

    return await updateDocument(collections.posts, postId, updateData);
};

const deletePost = async (postId) => {
    return await deleteDocument(collections.posts, postId);
};

const likePost = async (postId, userId) => {
    const batch = db.batch();

    const postRef = db.collection(collections.posts).doc(postId);
    batch.update(postRef, { likes: db.FieldValue.increment(1) });

    const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);
    batch.set(likeRef, { userId, postId, createdAt: new Date() });

    await batch.commit();
};

const unlikePost = async (postId, userId) => {
    const batch = db.batch();

    const postRef = db.collection(collections.posts).doc(postId);
    batch.update(postRef, { likes: db.FieldValue.increment(-1) });

    const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);
    batch.delete(likeRef);

    await batch.commit();
};

const addComment = async (postId, userId, content) => {
    const batch = db.batch();

    const commentData = {
        userId,
        postId,
        content,
        createdAt: new Date()
    };

    const commentRef = db.collection(collections.comments).doc();
    batch.set(commentRef, commentData);

    const postRef = db.collection(collections.posts).doc(postId);
    batch.update(postRef, { comments: db.FieldValue.increment(1) });

    await batch.commit();

    return commentRef.id;
};

const getPostComments = async (postId, lastCommentId = null, limit = 20) => {
    let query = db.collection(collections.comments)
        .where('postId', '==', postId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

    if (lastCommentId) {
        const lastComment = await getDocument(collections.comments, lastCommentId);
        query = query.startAfter(lastComment.createdAt);
    }

    const comments = await queryDocuments(query);
    return comments;
};

const getUserPosts = async (userId, lastPostId = null, limit = 20) => {
    let query = db.collection(collections.posts)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

    if (lastPostId) {
        const lastPost = await getDocument(collections.posts, lastPostId);
        query = query.startAfter(lastPost.createdAt);
    }

    const posts = await queryDocuments(query);
    return posts;
};

module.exports = {
    createPost,
    getPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    addComment,
    getPostComments,
    getUserPosts
};