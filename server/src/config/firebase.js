const admin = require('firebase-admin');
const logger = require('../utils/logger');

let db;
let auth;

const initializeFirebase = () => {
  try {
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      logger.info('Firebase initialized successfully.');
    }

    // Always initialize db and auth regardless of apps.length
    db = admin.firestore();
    auth = admin.auth();

    return { db, auth };

  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
};

try {
  const { db: initDb, auth: initAuth } = initializeFirebase();
  if (!initDb || !initAuth) {
    throw new Error('Firebase initialization failed');
  }
  db = initDb;
  auth = initAuth;
} catch (error) {
  logger.error('Failed to initialize Firebase services:', error);
  throw error;
}

module.exports = { db, auth, initializeFirebase };