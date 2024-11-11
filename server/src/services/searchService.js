const { collections, queryDocuments } = require('../config/database');
const logger = require('../utils/logger');

const searchPosts = async (userId, keyword, index, count) => {
    try {
        // Normalize the keyword (remove extra spaces, convert to lowercase)
        const normalizedKeyword = keyword.trim().toLowerCase();

        // Query posts from Firebase
        const query = queryDocuments(collections.posts, (ref) =>
            ref.where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .offset(parseInt(index))
                .limit(parseInt(count))
        );

        const posts = await query;

        // Filter posts based on normalized keyword
        const matchingPosts = posts.filter(post => {
            const content = post.content?.toLowerCase() || '';
            return content.includes(normalizedKeyword);
        });

        // Format response data
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
                avatar: post.avatar || ''
            },
            described: post.content || ''
        }));
    } catch (error) {
        logger.error('Search service error:', error);
        throw error;
    }
};

module.exports = { searchPosts };