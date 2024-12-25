import errorCodes from './customError.js';
import logger from './logger.js';

export const sendResponse = (res, code, data = null, customMessage = null) => {
    const error = errorCodes[code] || errorCodes['1005'];
    const response = {
        code,
        message: customMessage || error.message,
        data,
    };

    res.status(error.statusCode).json(response);
};

export const handleError = (err, req, res, next) => {
    let code = err.code || '9999';
    let statusCode = err.statusCode || 500;

    // Get the default message
    let message = errorCodes[code] ? errorCodes[code].message : 'Unknown error';

    // Use custom message if it's safe to display
    if (err.isOperational && err.message) {
        message = err.message;
    }

    // Log the detailed error
    logger.error(`Error ${code}: ${err.message}`, { stack: err.stack });

    res.status(statusCode).json({ code, message });
};
