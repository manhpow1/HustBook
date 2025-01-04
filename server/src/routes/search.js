/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search related endpoints
 */
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import searchController from '../controllers/searchController.js';
const router = Router();

/**
 * @swagger
 * /search/posts:
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
 *                       content:
 *                         type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: No data or end of list
 */
router.get('/posts', authenticateToken, searchController.searchPosts);

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

/**
 * @swagger
 * /search/users:
 *   get:
 *     summary: Search users by keyword
 *     description: Search for users by their username. Results exclude blocked users and the current user.
 *     tags:
 *       - Search
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword for username
 *         example: "john"
 *       - in: query
 *         name: index
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Starting index for pagination
 *         example: 0
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results per page
 *         example: 20
 *     responses:
 *       200:
 *         description: List of users matching the search criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 message:
 *                   type: string
 *                   example: "OK"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: User ID
 *                         example: "user123"
 *                       userName:
 *                         type: string
 *                         description: Username
 *                         example: "john_doe"
 *                       avatar:
 *                         type: string
 *                         description: URL to user's avatar
 *                         example: "https://example.com/avatar.jpg"
 *                       email:
 *                         type: string
 *                         description: User's email address
 *                         example: "john@example.com"
 *                       same_friends:
 *                         type: integer
 *                         description: Number of mutual friends
 *                         example: 5
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1002"
 *                 message:
 *                   type: string
 *                   example: "Parameter is not enough"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "9998"
 *                 message:
 *                   type: string
 *                   example: "Token is invalid"
 *       404:
 *         description: No users found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "9994"
 *                 message:
 *                   type: string
 *                   example: "No data or end of list data"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "9999"
 *                 message:
 *                   type: string
 *                   example: "Exception error"
 */
router.get('/users', authenticateToken, searchController.searchUsers);

export default router;