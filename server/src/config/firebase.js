const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

const initializeFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return {
    db: admin.firestore(),
    auth: admin.auth()
  };
};

module.exports = initializeFirebase();