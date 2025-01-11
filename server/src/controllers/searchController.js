import { sendResponse } from '../utils/responseHandler.js';
import searchValidator from '../validators/searchValidator.js';
import searchService from '../services/searchService.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';

class SearchController {
    async searchPosts(req, res, next) {
        try {
            const { ...cleanQuery } = req.query;
            logger.debug('Search controller received query:', cleanQuery);

            if (!cleanQuery.keyword) {
                logger.debug('No keyword provided, returning empty results');
                return sendResponse(res, '1000', []);
            }

            // Split keyword thành array ngay từ đầu
            const searchWords = decodeURIComponent(cleanQuery.keyword)
                .trim()
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 0);

            logger.debug('Search controller processing:', {
                originalKeyword: cleanQuery.keyword,
                searchWords
            });

            const { error, value } = searchValidator.validateSearchPosts({
                ...cleanQuery,
                keyword: searchWords, // Truyền array thay vì string
                index: parseInt(cleanQuery.index || '0'),
                count: parseInt(cleanQuery.count || '20')
            });

            if (error) {
                console.error('Validation error:', error.details);
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const userId = req.user.userId;
            logger.debug('Calling search service with:', {
                userId,
                searchWords,
                index: value.index,
                count: value.count
            });

            const matchingPosts = await searchService.searchPosts(userId, searchWords, value.index, value.count);

            logger.debug('Search results:', {
                resultCount: matchingPosts.length,
                firstPost: matchingPosts[0]?.postId
            });

            if (matchingPosts.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            sendResponse(res, '1000', matchingPosts);
        } catch (error) {
            console.error('Search controller error:', error);
            next(error);
        }
    }

    async searchUsers(req, res, next) {
        try {
            const { error, value } = searchValidator.validateSearchUsers({
                ...req.query,
                index: parseInt(req.query.index || '0'),
                count: parseInt(req.query.count || '20')
            });

            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { keyword, index, count } = value;
            const userId = req.user.userId;

            const users = await searchService.searchUsers(userId, keyword, index, count);

            if (users.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            sendResponse(res, '1000', users);
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
            const userId = req.user.userId;
            const savedSearches = await searchService.getSavedSearches(userId, index, count);

            return sendResponse(res, '1000', {
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
            const userId = req.user.userId;

            await searchService.deleteSavedSearch(userId, searchId, all === '1');

            sendResponse(res, '1000');
        } catch (error) {
            next(error);
        }
    }
}

export default new SearchController();
