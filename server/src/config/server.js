require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    // Add other server-related configurations here
};