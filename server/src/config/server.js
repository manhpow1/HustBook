const env = require('./env');

module.exports = {
    port: env.server.port,
    env: env.nodeEnv,
    jwtSecret: env.jwt.secret,
    refreshSecret: env.jwt.refreshSecret,
    corsOrigin: env.server.corsOrigin,
    jwtExpiration: env.jwt.expiration,
    refreshTokenExpiration: env.jwt.refreshExpiration,
    // Add other server-related configurations here
};