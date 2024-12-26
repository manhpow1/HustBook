import { sendResponse } from '../utils/responseHandler.js';
import searchValidator from '../validators/searchValidator.js';
import searchService from '../services/searchService.js';
import { createError } from '../utils/customError.js';

class SearchController {
    async search(req, res, next) {
        try {
            // Filter out internal query parameters and parse numbers
            const { _t, ...cleanQuery } = req.query;
            // Don't validate if no search parameters provided
            if (!cleanQuery.keyword) {
                sendResponse(res, '9994', 'No data or end of list data');
                return;
            }

            const { error, value } = searchValidator.validateSearch({
                ...cleanQuery,
                index: parseInt(cleanQuery.index || '0'),
                count: parseInt(cleanQuery.count || '20')
            });
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { keyword, index, count } = value;
            const userId = req.user.uid;

            const matchingPosts = await searchService.searchPosts(userId, keyword, index, count);

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
            const { error, value } = searchValidator.validateGetSavedSearch(req.query);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { index, count } = value;
            const userId = req.user.uid;

            const savedSearches = await searchService.getSavedSearches(userId, index, count);

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
            const { error } = searchValidator.validateDeleteSavedSearch(req.params, req.query);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { searchId } = req.params;
            const { all } = req.query;
            const userId = req.user.uid;

            await searchService.deleteSavedSearch(userId, searchId, all === '1');

            sendResponse(res, '1000');
        } catch (error) {
            next(error);
        }
    }
}

export default new SearchController();
