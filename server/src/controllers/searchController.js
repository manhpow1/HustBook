const { sendResponse, handleError } = require('../utils/responseHandler');
const validateSearch = require('../validators/searchValidator');
const { searchPosts } = require('../services/searchService');
const logger = require('../utils/logger');

const search = async (req, res, next) => {
    try {
        // Validate request parameters
        const { error } = validateSearch(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { keyword, user_id, index = 0, count = 20 } = req.body;

        // Call the search service
        const matchingPosts = await searchPosts(user_id, keyword, index, count);

        if (matchingPosts.length === 0) {
            return sendResponse(res, '9994'); // No data found
        }

        sendResponse(res, '1000', matchingPosts);
    } catch (error) {
        logger.error('Search controller error:', error);
        handleError(error, req, res, next);
    }
};

module.exports = { search };