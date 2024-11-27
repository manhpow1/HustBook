const { errorCodes } = require('./customError');
const logger = require('./logger');

const sendResponse = (res, code, data = null, customMessage = null) => {
    const error = errorCodes[code] || errorCodes['1005'];
    const response = {
        code,
        message: customMessage || error.message,
        data,
    };

    res.status(error.statusCode).json(response);
};

const handleError = (err, req, res, next) => {
    let code = err.code || '9999';
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Exception error';

    if (err.name === 'ValidationError') {
        code = '1002';
        statusCode = 400;
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        code = '9998';
        statusCode = 401;
        message = 'Token is invalid';
    } else if (!errorCodes[code]) {
        code = '1005';
        statusCode = 500;
        message = 'Unknown error';
    }

    logger.error(`Error ${code}: ${message}`, { stack: err.stack });

    res.status(statusCode).json({ code, message });
};

module.exports = { sendResponse, handleError };