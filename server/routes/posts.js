const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db, auth } = require('../config/firebaseConfig');
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

router.post('/get_post', verifyToken, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ code: '1002', message: 'Parameter is not enough' });
    }

    const postDoc = await db.collection('posts').doc(id).get();

    if (!postDoc.exists) {
      return res.status(404).json({ code: '9992', message: 'Post is not existed' });
    }

    const postData = postDoc.data();
    const authorId = postData.userId;

    const authorDoc = await db.collection('users').doc(authorId).get();
    const authorData = authorDoc.data();

    const isBlocked = authorData.blockedUsers && authorData.blockedUsers.includes(req.user.uid);
    const canEdit = authorId === req.user.uid && !postData.locked;
    const isLiked = postData.likes && postData.likes.includes(req.user.uid);

    const bannedStatus = getBannedStatus(postData);

    const response = {
      code: '1000',
      message: 'OK',
      data: {
        id: postDoc.id,
        described: postData.described,
        created: formatTime(postData.created.toDate()),
        modified: postData.modified ? formatTime(postData.modified.toDate()) : null,
        like: postData.likeCount ? postData.likeCount.toString() : '0',
        comment: postData.commentCount ? postData.commentCount.toString() : '0',
        is_liked: isLiked ? '1' : '0',
        image: postData.media.filter(m => m.type === 'image').map(img => ({
          id: img.id,
          url: img.url
        })),
        video: postData.media.filter(m => m.type === 'video').map(vid => ({
          url: vid.url,
          thumb: vid.thumb || null
        })),
        author: {
          id: authorId,
          name: authorData.username,
          avatar: authorData.avatar
        },
        state: postData.state || 'normal',
        is_blocked: isBlocked ? '1' : '0',
        can_edit: canEdit ? '1' : '0',
        banned: bannedStatus,
        can_comment: postData.canComment ? '1' : '0'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in get_post:', error);
    res.status(500).json({ code: '1001', message: 'Cannot connect to DB' });
  }
});

router.post('/like_post', verifyToken, async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.uid;

  try {
    await db.runTransaction(async (transaction) => {
      const postRef = db.collection('posts').doc(postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists) {
        throw new Error('Post not found');
      }

      const postData = postDoc.data();
      const likes = postData.likes || [];
      const newLikeCount = likes.includes(userId) ? postData.likeCount - 1 : postData.likeCount + 1;

      transaction.update(postRef, {
        likes: likes.includes(userId) ? admin.firestore.FieldValue.arrayRemove(userId) : admin.firestore.FieldValue.arrayUnion(userId),
        likeCount: newLikeCount
      });
    });

    res.status(200).json({ code: '1000', message: 'OK' });
  } catch (error) {
    console.error('Error in like_post:', error);
    res.status(500).json({ code: '1001', message: 'Cannot connect to DB' });
  }
});

router.post('/add_comment', verifyToken, async (req, res) => {
  const { postId, content } = req.body;

  try {
    await db.runTransaction(async (transaction) => {
      const postRef = db.collection('posts').doc(postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists) {
        throw new Error('Post not found');
      }

      const newCommentCount = (postDoc.data().commentCount || 0) + 1;

      transaction.update(postRef, {
        commentCount: newCommentCount,
        comments: admin.firestore.FieldValue.arrayUnion({
          userId: req.user.uid,
          content: content,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
      });
    });

    res.status(200).json({ code: '1000', message: 'OK' });
  } catch (error) {
    console.error('Error in add_comment:', error);
    res.status(500).json({ code: '1001', message: 'Cannot connect to DB' });
  }
});

router.post('/add_post', verifyToken, upload.array('files', 4), async (req, res) => {
  try {
    const { described, status } = req.body;
    const files = req.files;

    // Validate input
    if (!files || files.length === 0) {
      return res.status(400).json({ code: '1002', message: 'Parameter is not enough' });
    }

    if (files.length > 4) {
      return res.status(400).json({ code: '1008', message: 'Maximum number of files exceeded' });
    }

    // Check if all files are valid
    const isImage = (file) => file.mimetype.startsWith('image/');
    const isVideo = (file) => file.mimetype.startsWith('video/');
    const allImages = files.every(isImage);
    const allVideos = files.every(isVideo);

    if (!allImages && !allVideos) {
      return res.status(400).json({ code: '1003', message: 'Invalid file type or mix of images and videos' });
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

const formatTime = (date) => {
  const now = new Date();
  const diff = now - date;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) {
    return 'Just now';
  } else if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}m`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h`;
  } else if (diff < week) {
    const days = Math.floor(diff / day);
    return `${days}d`;
  } else {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
};

const getBannedStatus = (post) => {
  if (post.violatesStandards) return '1';
  if (post.blockedCountries && post.blockedCountries.length > 0) return '2';
  if (post.blockedMedia && post.blockedMedia.length > 0) {
    return post.blockedMedia.join(',');
  }
  return '0';
};

module.exports = router;