const admin = require('firebase-admin');
const logger = require('../utils/logger');

let db;
let auth;
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

      // Only set db and auth if initialization is successful
      db = admin.firestore();
      auth = admin.auth();

      return { db, auth };
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }
  return { db, auth };
};

// Initialize Firebase and export only after successful initialization
try {
  const { db: initDb, auth: initAuth } = initializeFirebase();
  db = initDb;
  auth = initAuth;
} catch (error) {
  logger.error('Failed to initialize Firebase services:', error);
  throw error;
}

// Add a check to ensure db exists before exporting
if (!db) {
  throw new Error('Firebase Firestore failed to initialize');
}

module.exports = {
  db,
  auth,
  initializeFirebase
};