/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search related endpoints
 */
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import searchController from '../controllers/searchController';
const router = Router();

/**
 * @swagger
 * /search/search:
 *   get:
 *     summary: Search posts by keyword
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         description: Keyword to search for
 *         required: true
 *         schema:
 *           type: string
 *           example: "funny"
 *       - in: query
 *         name: index
 *         description: Pagination start index
 *         required: false
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: count
 *         description: Number of results to return
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of matching posts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "post123"
 *                       image:
 *                         type: string
 *                         example: "http://example.com/image.jpg"
 *                       video:
 *                         type: string
 *                         example: "http://example.com/video.mp4"
 *                       like:
 *                         type: string
 *                         example: "10"
 *                       comment:
 *                         type: string
 *                         example: "5"
 *                       isLiked:
 *                         type: string
 *                         example: "0"
 *                       author:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                       described:
 *                         type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: No data or end of list
 */
router.get('/search', authenticateToken, searchController.search);

/**
 * @swagger
 * /search/get_saved_search:
 *   get:
 *     summary: Get a list of saved searches
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: index
 *         description: Pagination start index
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: count
 *         description: Number of saved searches to return
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Saved searches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "searchId123"
 *                       keyword:
 *                         type: string
 *                         example: "funny"
 *                       created:
 *                         type: string
 *                         example: "2023-10-10T12:00:00Z"
 *       404:
 *         description: No data or end of list data
 */
router.get('/get_saved_search', authenticateToken, searchController.getSavedSearch);

/**
 * @swagger
 * /search/del_saved_search/{searchId}:
 *   delete:
 *     summary: Delete a saved search or all saved searches for the user
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: searchId
 *         description: The ID of the saved search to delete
 *         required: true
 *         schema:
 *           type: string
 *           example: "searchId123"
 *       - in: query
 *         name: all
 *         description: Delete all saved searches if set to '1'
 *         schema:
 *           type: string
 *           enum: [ "0", "1" ]
 *           default: "0"
 *     responses:
 *       200:
 *         description: Saved search(es) deleted successfully
 *       404:
 *         description: Saved search not found or no saved searches to delete
 */
router.delete('/del_saved_search/:searchId', authenticateToken, searchController.deleteSavedSearches);

export default router;