const { sendResponse } = require('../utils/responseHandler');
const { validateSearch, validateGetSavedSearch, validateDeleteSavedSearch } = require('../validators/searchValidator');
const { searchPosts, getSavedSearches, deleteSavedSearch } = require('../services/searchService');
const { createError } = require('../utils/customError');

class SearchController {
    async search(req, res, next) {
        try {
            const { error } = validateSearch(req.body);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { keyword, index = 0, count = 20 } = req.body;
            const userId = req.user.uid;

            const matchingPosts = await searchPosts(userId, keyword, index, count);

            if (matchingPosts.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            sendResponse(res, '1000', matchingPosts);
        } catch (error) {
            next(error);
        }
    }

    async getSavedSearch(req, res, next) {
        try {
            const { error, value } = validateGetSavedSearch(req.query);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { index, count } = value;
            const userId = req.user.uid;

            const savedSearches = await getSavedSearches(userId, index, count);

            if (savedSearches.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            sendResponse(res, '1000', {
                data: savedSearches.map(search => ({
                    id: search.id,
                    keyword: search.keyword,
                    created: search.created.toISOString(),
                })),
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteSavedSearches(req, res, next) {
        try {
            const { error } = validateDeleteSavedSearch(req.params, req.query);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { search_id } = req.params;
            const { all } = req.query;
            const userId = req.user.uid;

            await deleteSavedSearch(userId, search_id, all === '1');

            sendResponse(res, '1000');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SearchController();
