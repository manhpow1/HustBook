const config = require('config');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

module.exports = {
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || config.get('firebase.projectId'),
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || config.get('firebase.privateKey')).replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || config.get('firebase.clientEmail'),
    },
    jwt: {
        secret: process.env.JWT_SECRET || config.get('jwt.secret'),
        refreshSecret: process.env.JWT_REFRESH_SECRET || config.get('jwt.refreshSecret'),
        expiration: process.env.JWT_EXPIRATION || config.get('jwt.expiration'),
        refreshExpiration: process.env.REFRESH_TOKEN_EXPIRATION || config.get('jwt.refreshExpiration'),
    },
    auth: {
        saltRounds: parseInt(process.env.SALT_ROUNDS, 10) || config.get('auth.saltRounds'),
    },
    server: {
        port: parseInt(process.env.PORT, 10) || config.get('server.port'),
        corsOrigin: process.env.CORS_ORIGIN || config.get('server.corsOrigin'),
    },
    nodeEnv: process.env.NODE_ENV || config.get('server.env'),
};