import admin from 'firebase-admin';
import logger from '../utils/logger.js';

let db;
let auth;
let isInitialized = false;

export const initializeFirebase = async () => {
  if (isInitialized) {
    return { db, auth };
  }

  try {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      let firebaseConfig;

      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        firebaseConfig = {
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        };
        logger.info('Using complete service account JSON configuration');
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_CLIENT_EMAIL
      ) {
        firebaseConfig = {
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        };
        logger.info('Using individual Firebase credentials');
      } else {
        logger.error('Firebase configuration missing: Check environment variables.');
        throw new Error('Firebase configuration missing');
      }

      admin.initializeApp(firebaseConfig);
      logger.info('Firebase Admin SDK initialized successfully');
    }

    db = admin.firestore();
    auth = admin.auth();
    isInitialized = true;
    const storage = admin.storage();

    // Verify Firestore connection
    await db.collection('test').limit(1).get();
    logger.info('Firestore connection verified');

    return { db, auth, storage };
  } catch (error) {
    logger.error('Failed to initialize Firebase. Error:', error.message);
    logger.error('Stack trace:', error.stack);
    throw error;
  }
};

export { db, auth };
