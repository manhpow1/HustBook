const jwt = require('jsonwebtoken');
const { getDocument, collections } = require('../config/database');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ code: "9998", message: "Token is invalid" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await getDocument(collections.users, decoded.uid);

        if (!user) {
            return res.status(401).json({ code: "9995", message: "User is not validated" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ code: "9998", message: "Token is invalid" });
    }
};

module.exports = { authenticateToken };