const { CustomError, errorCodes } = require('./customError');
const logger = require('./logger');

const sendResponse = (res, code, data = null) => {
    const { message, statusCode } = errorCodes[code] || errorCodes['1005'];
    const response = {
        code,
        message,
        data,
    };

    if (statusCode >= 400) {
        logger.error(`Error response: ${JSON.stringify(response)}`);
    }

    res.status(statusCode).json(response);
};

const handleError = (error, req, res, next) => {
    if (error instanceof CustomError) {
        sendResponse(res, error.code);
    } else {
        logger.error('Unhandled error:', error);
        sendResponse(res, '9999');
    }
};

module.exports = { sendResponse, handleError };