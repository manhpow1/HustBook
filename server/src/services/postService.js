const { db } = require('../config/firebase');
const { collections, createDocument, getDocument, updateDocument, deleteDocument, queryDocuments } = require('../config/database');
const { paginateQuery } = require('../utils/pagination');

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

const updatePost = async (postId, userId, content, images) => {
    const post = await getPost(postId);
    if (!post || post.userId !== userId) {
        return null;
    }

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

const likePost = async (postId, userId, transaction) => {
    const postRef = db.collection(collections.posts).doc(postId);
    const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);

    transaction.update(postRef, { likes: db.FieldValue.increment(1) });
    transaction.set(likeRef, { userId, postId, createdAt: new Date() });
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

const getPostComments = async (postId, page = 1, limit = 20) => {
    const query = db.collection(collections.comments)
        .where('postId', '==', postId)
        .orderBy('createdAt', 'desc');

    return await paginateQuery(query, page, limit);
};

const getUserPosts = async (userId, page = 1, limit = 20) => {
    const query = db.collection(collections.posts)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc');

    return await paginateQuery(query, page, limit);
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