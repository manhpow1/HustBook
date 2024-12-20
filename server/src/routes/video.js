/**
 * @swagger
 * tags:
 *   name: Videos
 *   description: Video related endpoints
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const videoController = require('../controllers/videoController');
/**
 * @swagger
 * /video/get_list_videos:
 *   post:
 *     summary: Get a list of videos with optional filtering by campaign and location
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Filters and pagination parameters for listing videos
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to filter videos by (optional)
 *               in_campaign:
 *                 type: string
 *                 enum: ["0", "1"]
 *                 description: "1" if filtering by campaign, "0" otherwise
 *               campaignId:
 *                 type: string
 *                 description: Campaign ID if in_campaign=1
 *               latitude:
 *                 type: number
 *                 format: float
 *                 description: Latitude for location-based filtering, must be provided with longitude
 *               longitude:
 *                 type: number
 *                 format: float
 *                 description: Longitude for location-based filtering, must be provided with latitude
 *               lastId:
 *                 type: string
 *                 description: The ID of the last retrieved video post for pagination
 *               index:
 *                 type: integer
 *                 minimum: 0
 *                 description: Offset for pagination (default 0)
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Number of items to fetch (default 20)
 *             example:
 *               userId: "user_123"
 *               in_campaign: "1"
 *               campaignId: "camp_456"
 *               latitude: 40.7128
 *               longitude: -74.0060
 *               lastId: "post_789"
 *               index: 0
 *               count: 10
 *     responses:
 *       200:
 *         description: Videos retrieved successfully
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           video:
 *                             type: object
 *                             properties:
 *                               url:
 *                                 type: string
 *                               thumb:
 *                                 type: string
 *                           described:
 *                             type: string
 *                           created:
 *                             type: string
 *                             format: date-time
 *                           like:
 *                             type: string
 *                             example: "10"
 *                           comment:
 *                             type: string
 *                             example: "5"
 *                           isLiked:
 *                             type: string
 *                             enum: ["0", "1"]
 *                           isBlocked:
 *                             type: string
 *                             enum: ["0", "1"]
 *                           canComment:
 *                             type: string
 *                             enum: ["0", "1"]
 *                           canEdit:
 *                             type: string
 *                             enum: ["0", "1"]
 *                           banned:
 *                             type: string
 *                             enum: ["0", "1"]
 *                           state:
 *                             type: string
 *                           author:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               userName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                     new_items:
 *                       type: string
 *                       example: "10"
 *                     lastId:
 *                       type: string
 *                       example: "post_890"
 *                     in_campaign:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     campaignId:
 *                       type: string
 *       400:
 *         description: Validation error in input parameters
 *       401:
 *         description: Unauthorized or invalid token
 *       9999:
 *         description: Exception error occurred
 */
router.post('/get_list_videos', authenticateToken, videoController.getListVideos);

module.exports = router;