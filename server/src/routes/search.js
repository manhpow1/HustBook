const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

router.post('/search', authenticateToken, searchController.search);
router.get('/get_saved_search', authenticateToken, searchController.getSavedSearch);
router.delete('/del_saved_search/:search_id', authenticateToken, searchController.deleteSavedSearch);

module.exports = router;