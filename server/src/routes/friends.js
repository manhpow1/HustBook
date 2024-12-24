/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Endpoints for managing friends, friend requests, and blocking
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth';
import friendController from '../controllers/friendController';
const router = express.Router();

/**
 * @swagger
 * /friend/get_user_friends:
 *   post:
 *     summary: Get a list of friends for a given user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Parameters for retrieving user's friends
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "user_abc123"
 *               index:
 *                 type: number
 *                 minimum: 0
 *                 example: 0
 *               count:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 20
 *     responses:
 *       200:
 *         description: Friends retrieved successfully
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
 *                     friends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                     total:
 *                       type: string
 *                       example: "5"
 *       400:
 *         description: Validation error
 */
router.post('/get_user_friends', authenticateToken, friendController.getUserFriends);

/**
 * @swagger
 * /friend/set_request_friend:
 *   post:
 *     summary: Send a friend request to another user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: The user to send a friend request to
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "user_xyz789"
 *     responses:
 *       200:
 *         description: Friend request sent successfully
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
 *                     requested_friends:
 *                       type: string
 *                       example: "1"
 *       400:
 *         description: Validation error or cannot send friend request to yourself
 *       9995:
 *         description: User not found
 *       1010:
 *         description: Friend request already exists or users already friends
 */
router.post('/set_request_friend', authenticateToken, friendController.setRequestFriend);

/**
 * @swagger
 * /friend/get_requested_friends:
 *   get:
 *     summary: Get a list of friend requests received by the authenticated user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: index
 *         description: Starting index for pagination
 *         required: true
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: count
 *         description: Number of requests to return
 *         required: true
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Requested friends retrieved successfully
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
 *                     request:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                           created:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: string
 *                       example: "2"
 *       400:
 *         description: Validation error
 *       9994:
 *         description: No data or end of list data
 */
router.get('/get_requested_friends', authenticateToken, friendController.getRequestedFriends);

/**
 * @swagger
 * /friend/set_accept_friend:
 *   post:
 *     summary: Accept or reject a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: The userId who sent the request and whether to accept (1) or reject (0)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, isAccept]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "user_abc123"
 *               isAccept:
 *                 type: string
 *                 enum: ["0", "1"]
 *                 example: "1"
 *     responses:
 *       200:
 *         description: Friend request processed
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
 *                     message:
 *                       type: string
 *                       example: "Friend request accepted"
 *       400:
 *         description: Validation error
 *       9995:
 *         description: Friend request not found
 */
router.post('/set_accept_friend', authenticateToken, friendController.setAcceptFriend);

/**
 * @swagger
 * /friend/get_list_suggested_friends:
 *   get:
 *     summary: Get a list of suggested friends for the authenticated user
 *     tags: [Friends]
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
 *         description: Number of suggestions to return
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Suggested friends retrieved successfully
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
 *                     list_users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                           same_friends:
 *                             type: string
 *                             description: Number of mutual friends
 *       400:
 *         description: Validation error
 *       9994:
 *         description: No data or end of list data
 */
router.get('/get_list_suggested_friends', authenticateToken, friendController.getListSuggestedFriends);

/**
 * @swagger
 * /friend/get_list_blocks:
 *   get:
 *     summary: Get a list of blocked users for the authenticated user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: index
 *         description: Pagination start index
 *         required: true
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: count
 *         description: Number of blocked users to return
 *         required: true
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Blocked users retrieved successfully
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
 *                           name:
 *                             type: string
 *                           avatar:
 *                             type: string
 *       400:
 *         description: Validation error
 *       9994:
 *         description: No data or end of list data
 */
router.get('/get_list_blocks', authenticateToken, friendController.getListBlocks);

export default router;