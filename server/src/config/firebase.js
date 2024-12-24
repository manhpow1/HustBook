import admin from 'firebase-admin';
import logger from '../utils/logger';

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
        };
        logger.info('Using individual Firebase credentials');
      } else {
        throw new Error('Firebase configuration missing');
      }

      admin.initializeApp(firebaseConfig);
      logger.info('Firebase Admin SDK initialized successfully');
    }

    db = admin.firestore();
    auth = admin.auth();
    isInitialized = true;

    // Verify Firestore connection
    await db.collection('test').limit(1).get();
    logger.info('Firestore connection verified');

    return { db, auth };
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
};

export { db, auth };