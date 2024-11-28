const { collections, queryDocuments, createDocument, deleteDocument } = require('../config/database');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');
const { db } = require('../config/firebase');

const searchPosts = async (userId, keyword, index, count) => {
    try {
        const normalizedKeyword = keyword.trim().toLowerCase();

        const query = queryDocuments(collections.posts, (ref) =>
            ref.orderBy('createdAt', 'desc')
                .offset(parseInt(index))
                .limit(parseInt(count))
        );

        const posts = await query;

        const matchingPosts = posts.filter(post => {
            const content = post.content?.toLowerCase() || '';
            return content.includes(normalizedKeyword);
        });

        await createDocument(collections.savedSearches, {
            userId,
            keyword,
            created: new Date(),
        });

        return matchingPosts.map(post => ({
            id: post.id,
            image: post.images?.[0] || '',
            video: post.video || '',
            like: post.likes?.toString() || '0',
            comment: post.comments?.toString() || '0',
            is_liked: post.isLiked ? '1' : '0',
            author: {
                id: post.userId,
                username: post.username || '',
                avatar: post.avatar || '',
            },
            described: post.content || '',
        }));
    } catch (error) {
        logger.error('Search service error:', error);
        throw createError('9999', 'Exception error');
    }
};

const getSavedSearches = async (userId, index, count) => {
    try {
        const query = queryDocuments(collections.savedSearches, (ref) =>
            ref.where('userId', '==', userId)
                .orderBy('created', 'desc')
                .offset(index)
                .limit(count)
        );

        const savedSearches = await query;

        return savedSearches.map(search => ({
            id: search.id,
            keyword: search.keyword,
            created: search.created.toDate(),
        }));
    } catch (error) {
        logger.error('Get saved searches service error:', error);
        throw createError('9999', 'Exception error');
    }
};

const deleteSavedSearch = async (userId, searchId, deleteAll) => {
    try {
        if (deleteAll) {
            // Use batch operation to delete all saved searches atomically
            const savedSearchesSnapshot = await db.collection(collections.savedSearches)
                .where('userId', '==', userId)
                .get();

            if (savedSearchesSnapshot.empty) {
                throw createError('9994', 'No saved searches to delete');
            }

            const batch = db.batch();
            savedSearchesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } else {
            // Delete a single saved search
            const savedSearchRef = db.collection(collections.savedSearches).doc(searchId);
            const savedSearchDoc = await savedSearchRef.get();

            if (!savedSearchDoc.exists || savedSearchDoc.data().userId !== userId) {
                throw createError('1004', 'Saved search not found or not authorized');
            }
            await savedSearchRef.delete();
        }
    } catch (error) {
        logger.error('Delete saved search service error:', error);
        if (error.code) {
            throw error;
        }
        throw createError('9999', 'Exception error');
    }
};

module.exports = {
    searchPosts,
    getSavedSearches,
    deleteSavedSearch,
};