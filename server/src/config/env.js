const config = require('config');
require('dotenv').config();

module.exports = {
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || config.get('firebase.projectId'),
        privateKey: process.env.FIREBASE_PRIVATE_KEY || config.get('firebase.privateKey'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || config.get('firebase.clientEmail'),
    },
    jwt: {
        secret: process.env.JWT_SECRET || config.get('jwt.secret'),
    },
    server: {
        port: process.env.PORT || config.get('server.port'),
        corsOrigin: process.env.CORS_ORIGIN || config.get('server.corsOrigin'),
    },
};