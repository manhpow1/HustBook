const express = require('express');
const router = express.Router();

router.get('/get_list_posts', (req, res) => {
  // Implementation for getting list of posts
});

router.get('/get_post/:id', (req, res) => {
  // Implementation for getting a single post
});

router.post('/add_post', (req, res) => {
  // Implementation for adding a new post
});

router.put('/edit_post/:id', (req, res) => {
  // Implementation for editing a post
});

router.delete('/delete_post/:id', (req, res) => {
  // Implementation for deleting a post
});

router.post('/like/:id', (req, res) => {
  // Implementation for liking a post
});

router.post('/report_post/:id', (req, res) => {
  // Implementation for reporting a post
});

module.exports = router;