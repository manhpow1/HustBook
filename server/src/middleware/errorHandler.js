const { CustomError } = require('../utils/customError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err);

    if (err instanceof CustomError) {
        return res.status(err.statusCode).json({
            code: err.code,
            message: err.message
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({ code: "1002", message: err.message });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ code: "9998", message: "Token is invalid" });
    }

    // Default to 500 server error
    res.status(500).json({ code: "9999", message: "Exception error" });
};

module.exports = errorHandler;