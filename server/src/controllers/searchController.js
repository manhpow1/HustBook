const { sendResponse, handleError } = require('../utils/responseHandler');
const { validateSearch, validateGetSavedSearch, validateDeleteSavedSearch } = require('../validators/searchValidator');
const { searchPosts, getSavedSearches, deleteSavedSearch } = require('../services/searchService');
const logger = require('../utils/logger');

const search = async (req, res, next) => {
    try {
        // Validate request parameters
        const { error } = validateSearch(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { user_id, keyword, index = 0, count = 20 } = req.body;

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

const getSavedSearch = async (req, res, next) => {
    try {
        const { error, value } = validateGetSavedSearch(req.query);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { index, count } = value;
        const userId = req.user.uid; // Assuming the user ID is attached to the request by the auth middleware

        const savedSearches = await getSavedSearches(userId, index, count);

        if (savedSearches.length === 0) {
            return sendResponse(res, '9994'); // No data or end of list data
        }

        sendResponse(res, '1000', {
            data: savedSearches.map(search => ({
                id: search.id,
                keyword: search.keyword,
                created: search.created.toISOString()
            }))
        });
    } catch (error) {
        logger.error('Error in getSavedSearch controller:', error);
        handleError(error, req, res, next);
    }
};

const deleteSavedSearches = async (req, res, next) => {
    try {
        const { error } = validateDeleteSavedSearch(req.params, req.query);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { search_id } = req.params;
        const { all } = req.query;
        const userId = req.user.uid;

        await deleteSavedSearch(userId, search_id, all === '1');

        sendResponse(res, '1000');
    } catch (error) {
        logger.error('Error in deleteSavedSearch controller:', error);
        handleError(error, req, res, next);
    }
};

module.exports = {
    search,
    getSavedSearch,
    deleteSavedSearches,
};