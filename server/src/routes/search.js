const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { search } = require('../controllers/searchController');

router.post('/search', authenticateToken, search);
router.get('/get_saved_search', (req, res) => {
  // Implementation for getting saved searches
});
router.delete('/del_saved_search/:id', (req, res) => {
  // Implementation for deleting saved search
});

module.exports = router;