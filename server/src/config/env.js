import config from 'config';

export const firebase = {
    projectId: config.get('firebase.projectId'),
    privateKey: (config.get('firebase.privateKey')).replace(/\\n/g, '\n'),
    clientEmail: config.get('firebase.clientEmail'),
};

export const jwt = {
    secret: config.get('jwt.secret'),
    expiration: config.get('jwt.expiration'),
};

export const auth = {
    saltRounds: config.get('auth.saltRounds'),
};

export const server = {
    port: config.get('server.port'),
    corsOrigin: config.get('server.corsOrigin'),
};