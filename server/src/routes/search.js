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
 *     summary: Search posts
 *     description: Search for posts by keyword(s)
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term or phrase
 *       - in: query
 *         name: index
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Starting index for pagination
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                       image:
 *                         type: string
 *                       likes:
 *                         type: string
 *                       comment:
 *                         type: string
 *                       isLiked:
 *                         type: string
 *                         enum: ["0", "1"]
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
 *         description: Invalid search parameters
 *       404:
 *         description: No results found
 */ 
router.get('/posts', authenticateToken, searchController.searchPosts);

/**
 * @swagger
 * /search/get_saved_search:
 *   get:
 *     summary: Get saved searches
 *     description: Retrieve user's saved search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: index
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Starting index for pagination
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of saved searches to return
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
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           keyword:
 *                             type: string
 *                           created:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/get_saved_search', authenticateToken, searchController.getSavedSearch);

/**
 * @swagger
 * /search/del_saved_search/{searchId}:
 *   delete:
 *     summary: Delete saved search
 *     description: Delete a specific saved search or all saved searches
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: searchId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the saved search to delete
 *       - in: query
 *         name: all
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *           default: "0"
 *         description: Set to "1" to delete all saved searches
 *     responses:
 *       200:
 *         description: Saved search(es) deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Saved search not found
 */
router.delete('/del_saved_search/:searchId', authenticateToken, searchController.deleteSavedSearches);

/**
 * @swagger
 * /search/users:
 *   get:
 *     summary: Search users
 *     description: Search for users by username
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: Username search term
 *       - in: query
 *         name: index
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Starting index for pagination
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Users found successfully
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
 *                       userId:
 *                         type: string
 *                       userName:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       same_friends:
 *                         type: integer
 *                         description: Number of mutual friends
 *       400:
 *         description: Invalid search parameters
 *       404:
 *         description: No users found
 */
router.get('/users', authenticateToken, searchController.searchUsers);

export default router;