const { collections, queryDocuments } = require('../config/database');
const logger = require('../utils/logger');

const checkNewItems = async (lastId, categoryId) => {
    try {
        const query = queryDocuments(collections.posts, (ref) =>
            ref.where('id', '>', lastId)
                .where('category_id', '==', categoryId)
                .orderBy('id', 'asc')
        );

        const newItems = await query;
        return newItems.length;
    } catch (error) {
        logger.error('Error in checkNewItems service:', error);
        throw error;
    }
};

module.exports = {
    checkNewItems
};