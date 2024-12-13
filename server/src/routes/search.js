const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

router.get('/search', authenticateToken, searchController.search);
router.get('/get_saved_search', authenticateToken, searchController.getSavedSearch);
router.delete('/del_saved_search/:searchId', authenticateToken, searchController.deleteSavedSearches);

module.exports = router;