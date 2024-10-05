require('dotenv').config();

module.exports = {
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
    },
    server: {
        port: process.env.PORT || 3000,
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },
};