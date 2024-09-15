const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db, auth } = require('../firebaseConfig');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ code: '9998', message: 'Token is invalid' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ code: '9998', message: 'Token is invalid' });
  }
};

// Helper function to validate file type
const validateFileType = (file) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime'];
  return allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype);
};

router.get('/get_list_posts', (req, res) => {
  // Implementation for getting list of posts
});

router.get('/get_post/:id', (req, res) => {
  // Implementation for getting a single post
});

router.post('/add_post', verifyToken, upload.array('files', 4), async (req, res) => {
  try {
    const { described, status } = req.body;
    const files = req.files;

    // Validate input
    if (!files || files.length === 0) {
      return res.status(400).json({ code: '1002', message: 'At least one image or video is required' });
    }

    if (files.length > 4) {
      return res.status(400).json({ code: '1008', message: 'Maximum number of files exceeded' });
    }

    // Check if all files are valid
    const invalidFile = files.find(file => !validateFileType(file));
    if (invalidFile) {
      return res.status(400).json({ code: '1003', message: 'Invalid file type' });
    }

    // Check if there's a mix of images and videos
    const hasImage = files.some(file => file.mimetype.startsWith('image/'));
    const hasVideo = files.some(file => file.mimetype.startsWith('video/'));
    if (hasImage && hasVideo) {
      return res.status(400).json({ code: '1003', message: 'Cannot mix images and videos in the same post' });
    }

    // Generate a unique ID for the post
    const postId = uuidv4();

    // Upload files to Firebase Storage
    const fileUrls = await Promise.all(files.map(async (file) => {
      const fileName = `${postId}_${file.originalname}`;
      const fileRef = admin.storage().bucket().file(`posts/${fileName}`);
      await fileRef.save(file.buffer, {
        metadata: { contentType: file.mimetype }
      });
      return fileRef.publicUrl();
    }));

    // Create post document in Firestore
    const postData = {
      id: postId,
      userId: req.user.uid,
      described: described || '',
      status: status || '',
      media: fileUrls,
      created: admin.firestore.FieldValue.serverTimestamp(),
      likes: [],
      comments: []
    };

    await db.collection('posts').doc(postId).set(postData);

    res.status(200).json({
      code: '1000',
      message: 'OK',
      data: {
        id: postId,
        url: fileUrls[0] // Return the URL of the first file
      }
    });
  } catch (error) {
    console.error('Error in add_post:', error);
    res.status(500).json({ code: '1001', message: 'Cannot connect to DB' });
  }
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