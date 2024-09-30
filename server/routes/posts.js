const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db, auth } = require('../config/firebaseConfig');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();

// Train the classifier (you should do this with a larger dataset)
classifier.addDocument('kill murder death weapon', 'dangerous');
classifier.addDocument('illegal drugs crime theft', 'illegal');
classifier.addDocument('hate racist sexist discriminate', 'offensive');
classifier.addDocument('normal safe friendly happy', 'safe');
classifier.train();

// List of explicitly banned words
const bannedWords = [
  'cocaine', 'heroin', 'meth', 'assault', 'terrorist', 'bomb', 'kill', 'attack'
];

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

router.put('/edit_post/:id', verifyToken, upload.fields([
  { name: 'image', maxCount: 4 },
  { name: 'video', maxCount: 1 },
  { name: 'thumb', maxCount: 1 }
]), async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.uid;
    const { described, status, image_del, image_sort, auto_accept, auto_block } = req.body;

    // Fetch the existing post
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ code: '9992', message: 'Post is not existed' });
    }

    const postData = postDoc.data();
    if (postData.userId !== userId) {
      return res.status(403).json({ code: '1009', message: 'Not access' });
    }

    // Prepare update data
    const updateData = {};
    if (described) updateData.described = described;
    if (status) updateData.status = status;

    // Handle image deletion
    if (image_del && Array.isArray(image_del)) {
      updateData.media = postData.media.filter(m => !image_del.includes(m.id));
    }

    // Handle image reordering and addition
    const newImages = req.files.image || [];
    if (image_sort && Array.isArray(image_sort)) {
      const reorderedMedia = [];
      image_sort.forEach((index, newIndex) => {
        if (index < postData.media.length) {
          reorderedMedia[newIndex] = postData.media[index];
        } else if (newImages[index - postData.media.length]) {
          reorderedMedia[newIndex] = {
            id: uuidv4(),
            url: newImages[index - postData.media.length].path,
            type: 'image'
          };
        }
      });
      updateData.media = reorderedMedia;
    } else if (newImages.length > 0) {
      updateData.media = [
        ...(updateData.media || postData.media),
        ...newImages.map(img => ({
          id: uuidv4(),
          url: img.path,
          type: 'image'
        }))
      ];
    }

    // Handle video upload
    if (req.files.video && req.files.video[0]) {
      if (updateData.media && updateData.media.some(m => m.type === 'image')) {
        return res.status(400).json({ code: '1003', message: 'Cannot mix images and videos in the same post' });
      }
      updateData.media = [{
        id: uuidv4(),
        url: req.files.video[0].path,
        type: 'video',
        thumb: req.files.thumb && req.files.thumb[0] ? req.files.thumb[0].path : null
      }];
    }

    // Implement auto_accept and auto_block
    if (auto_accept === '1') {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      if (userData.influencer || userData.government) {
        updateData.status = 'approved';
      }
    }

    if (auto_block === '1') {
      // Implement content checking logic here
      const containsDangerousContent = checkForDangerousContent(described);
      if (containsDangerousContent) {
        updateData.status = 'blocked';
      }
    }

    // Update the post
    await postRef.update(updateData);

    res.status(200).json({
      code: '1000',
      message: 'OK',
      data: {
        id: postId,
        url: '' // Leave empty as per current version requirements
      }
    });

  } catch (error) {
    console.error('Error in edit_post:', error);
    res.status(500).json({ code: '1001', message: 'Can not connect to DB' });
  }
});

// Helper function to check for dangerous content
function checkForDangerousContent(content) {
  // Convert to lowercase for consistency
  const lowercaseContent = content.toLowerCase();

  // Check for explicitly banned words
  if (bannedWords.some(word => lowercaseContent.includes(word))) {
    return true;
  }

  // Tokenize the content
  const tokens = tokenizer.tokenize(lowercaseContent);

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\b(how to|ways to) (make|create|build) (a bomb|weapons|drugs)\b/,
    /\b(planning|organize) (an attack|a riot)\b/,
    /\b(buy|sell|distribute) (illegal drugs|weapons|stolen goods)\b/
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(lowercaseContent))) {
    return true;
  }

  // Use the classifier to determine if the content is dangerous
  const classification = classifier.classify(tokens.join(' '));

  // Count the number of potentially dangerous words
  const dangerousWordCount = tokens.filter(token =>
    ['dangerous', 'illegal', 'offensive'].includes(classifier.classify(token))
  ).length;

  // If the overall classification is not 'safe' or there are multiple dangerous words, flag it
  return classification !== 'safe' || dangerousWordCount > 2;
}

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