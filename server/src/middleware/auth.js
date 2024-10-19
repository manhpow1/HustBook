const jwt = require('jsonwebtoken');
const { getDocument, collections } = require('../config/database');
const { createError } = require('../utils/customError');
const config = require('config');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const deviceToken = req.headers['x-device-token'];

        if (!token || !deviceToken) {
            throw createError('9998'); // Missing token or device token
        }

        const decoded = jwt.verify(token, config.get('jwt.secret'));
        const user = await getDocument(collections.users, decoded.uid);

        if (!user || user.deviceToken !== deviceToken) {
            throw createError('9995'); // User not found or invalid device token
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { authenticateToken };