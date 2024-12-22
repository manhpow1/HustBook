const admin = require('firebase-admin');
const logger = require('../utils/logger');
let serviceAccount;
try {
  // First try to use environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Fallback to local file if env variable isn't available
    throw new Error('No environment variable found');
  }
} catch (error) {
  logger.error('Failed to parse Firebase service account:', error);
  throw error;
}

const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.info('Firebase initialized successfully.');
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      throw error; // Exit the application if Firebase fails to initialize
    }
  }
  return {
    db: admin.firestore(),
    auth: admin.auth(),
  };
};

const { db, auth } = initializeFirebase();

module.exports = { db, auth, initializeFirebase };
