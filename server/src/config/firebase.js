const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Track initialization state
let isInitialized = false;
let db;
let auth;

const initializeFirebase = async () => {
  if (isInitialized) {
    return { db, auth };
  }

  try {
    if (!admin.apps.length) {
      // Initialize Firebase with different configuration options
      let firebaseConfig;
      
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          // Try to parse the complete service account JSON first
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          firebaseConfig = {
            credential: admin.credential.cert(serviceAccount)
          };
          logger.info('Using complete service account JSON configuration');
        } catch (e) {
          logger.error('Invalid FIREBASE_SERVICE_ACCOUNT JSON:', e);
          throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON format');
        }
      } else if (process.env.FIREBASE_CONFIG) {
        try {
          // Try new Firebase configuration format
          const config = JSON.parse(process.env.FIREBASE_CONFIG);
          if (!config.projectId || !config.privateKey || !config.clientEmail) {
            throw new Error('Missing required fields in FIREBASE_CONFIG');
          }
          firebaseConfig = {
            credential: admin.credential.cert({
              projectId: config.projectId,
              privateKey: config.privateKey.replace(/\\n/g, '\n'),
              clientEmail: config.clientEmail
            })
          };
          logger.info('Using FIREBASE_CONFIG configuration');
        } catch (e) {
          logger.error('Invalid FIREBASE_CONFIG:', e);
          throw new Error('Invalid FIREBASE_CONFIG format');
        }
      } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        // Fall back to individual environment variables
        firebaseConfig = {
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL
          })
        };
        logger.info('Using individual Firebase credentials');
      } else {
        throw new Error('Missing Firebase configuration. Required: FIREBASE_SERVICE_ACCOUNT, FIREBASE_CONFIG, or individual credentials');
      }

      admin.initializeApp(firebaseConfig);
      logger.info('Firebase Admin SDK initialized successfully');
    }

    // Initialize db and auth
    db = admin.firestore();
    auth = admin.auth();
    
    // Verify connections
    await Promise.all([
      db.collection('users').limit(1).get(),
      auth.listUsers(1)
    ]);
    
    logger.info('Firebase services (Firestore & Auth) verified and ready');
    isInitialized = true;
    return { db, auth };

  } catch (error) {
    logger.error('Firebase initialization error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT ? 'present' : 'missing',
      projectId: process.env.FIREBASE_PROJECT_ID ? 'present' : 'missing',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'present' : 'missing',
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'present' : 'missing'
    });
    throw error;
  }
};

// Helper function to get initialized services
const getFirebaseServices = () => {
  if (!isInitialized) {
    throw new Error('Firebase services accessed before initialization');
  }
  return { db, auth };
};

module.exports = { 
  initializeFirebase,
  getFirebaseServices
};
