const Post = require('../models/Post');
const { db } = require('../config/firebase');
const { collections, createDocument, getDocument, updateDocument, deleteDocument, queryDocuments } = require('../config/database');
const { paginateQuery } = require('../utils/pagination');

// Create a new post
const createPost = async (userId, content, images) => {
    const postData = new Post({ userId, content, images }).toJSON();
    return await createDocument(collections.posts, postData);
};

// Get a specific post
const getPost = async (postId) => {
    const post = await getDocument(collections.posts, postId);
    return post ? new Post(post) : null;
};

// Update an existing post
const updatePost = async (postId, userId, content, images) => {
    const existingPost = await getPost(postId);
    if (!existingPost || existingPost.userId !== userId) {
        return null;
    }

    const updatedPost = new Post({
        ...existingPost,
        content,
        images,
        updatedAt: new Date(),
    }).toJSON();

    return await updateDocument(collections.posts, postId, updatedPost);
};

// Delete a post
const deletePost = async (postId) => {
    return await deleteDocument(collections.posts, postId);
};

const checkUserLike = async (postId, userId) => {
    const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);
    const likeDoc = await likeRef.get();
    return likeDoc.exists;
};

// Like a post using Firestore transaction
const likePost = async (postId, userId, transaction) => {
    const postRef = db.collection(collections.posts).doc(postId);
    const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);

    transaction.update(postRef, { likes: db.FieldValue.increment(1) });
    transaction.set(likeRef, { userId, postId, createdAt: new Date() });
};

// Unlike a post using Firestore batch
const unlikePost = async (postId, userId, transaction) => {
    const postRef = db.collection(collections.posts).doc(postId);
    const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);

    transaction.update(postRef, { likes: db.FieldValue.increment(-1) });
    transaction.delete(likeRef);
};

// Add a comment to a post
const addComment = async (postId, userId, content) => {
    const batch = db.batch();
    const commentData = {
        userId,
        postId,
        content,
        createdAt: new Date()
    };
    const commentRef = db.collection(collections.comments).doc();
    // Prepare a batch operation to save the comment and update the post's comment count
    batch.set(commentRef, commentData);
    batch.update(db.collection(collections.posts).doc(postId), {
        comments: db.FieldValue.increment(1)
    });
    await batch.commit();
    return commentRef.id;  // Returns the ID of the newly added comment
};

// Retrieve comments for a post with pagination
const getComments = async (postId, index, count) => {
    try {
        return await queryDocuments('comments', (query) =>
            query
                .where('postId', '==', postId)
                .orderBy('createdAt', 'desc')
                .offset(index)
                .limit(count)
        );
    } catch (error) {
        throw new Error('Database error fetching comments.');
    }
};

// Retrieve posts by a specific user with pagination
const getUserPosts = async (userId, page = 1, limit = 20) => {
    const query = db.collection(collections.posts)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc');
    return await paginateQuery(query, page, limit);
};

// Report a post for inappropriate content
const reportPost = async (postId, userId, reason, details) => {
    const reportData = {
        postId,
        userId,
        reason,
        details: details || '',
        createdAt: new Date(),
        status: 'pending', // Status can be 'pending', 'under review', or 'resolved'
    };
    await createDocument(collections.reports, reportData);
    await notifyAdmins(`Post ${postId} reported for ${reason}`);
    return await createDocument(collections.reports, reportData);
};

const runTransactionWithRetry = async (transactionFn, retries = 3) => {
    while (retries > 0) {
        try {
            return await db.runTransaction(transactionFn);
        } catch (error) {
            if (retries === 1) throw error; // Throw if no retries left
            retries--;
        }
    }
};

module.exports = {
    createPost,
    getPost,
    updatePost,
    deletePost,
    checkUserLike,
    likePost,
    unlikePost,
    addComment,
    getComments,
    getUserPosts,
    reportPost,
    runTransactionWithRetry,
};
