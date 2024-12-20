const config = require('config');

module.exports = {
    firebase: {
        projectId: config.get('firebase.projectId'),
        privateKey: (config.get('firebase.privateKey')).replace(/\\n/g, '\n'),
        clientEmail: config.get('firebase.clientEmail'),
    },
    jwt: {
        secret: config.get('jwt.secret'),
        refreshSecret: config.get('jwt.refreshSecret'),
        expiration: config.get('jwt.expiration'),
        refreshExpiration: config.get('jwt.refreshExpiration'),
    },
    auth: {
        saltRounds: config.get('auth.saltRounds'),
    },
    server: {
        port: config.get('server.port'),
        corsOrigin: config.get('server.corsOrigin'),
    },
};