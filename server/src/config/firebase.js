const admin = require('firebase-admin');
const env = require('./env');

const initializeFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        privateKey: env.firebase.privateKey.replace(/\\n/g, '\n'),
        clientEmail: env.firebase.clientEmail,
      }),
    });
  }
  return {
    db: admin.firestore(),
    auth: admin.auth()
  };
};

module.exports = initializeFirebase();