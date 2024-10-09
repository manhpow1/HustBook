const jwt = require('jsonwebtoken');
const { getDocument, collections } = require('../config/database');
const { createError } = require('../utils/customError');
const config = require('config');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            throw createError('9998');
        }

        const decoded = jwt.verify(token, config.get('jwt.secret'));
        const user = await getDocument(collections.users, decoded.uid);

        if (!user) {
            throw createError('9995');
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { authenticateToken };