const admin = require('firebase-admin');
const env = require('./env');
const logger = require('../utils/logger');

const initializeFirebase = () => {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.firebase.projectId,
          privateKey: env.firebase.privateKey,
          clientEmail: env.firebase.clientEmail,
        }),
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