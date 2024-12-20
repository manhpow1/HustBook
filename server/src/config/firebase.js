const admin = require('firebase-admin');
const logger = require('../utils/logger');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

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

module.exports = initializeFirebase();