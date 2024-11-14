const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { search } = require('../controllers/searchController');

router.post('/search', authenticateToken, search);
router.get('/get_saved_search', authenticateToken, getSavedSearch);
router.delete('/del_saved_search/:id', (req, res) => {
  // Implementation for deleting saved search
});

module.exports = router;