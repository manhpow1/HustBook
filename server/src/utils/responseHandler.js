import { errorCodes } from './customError.js';
import logger from './logger.js';

export const sendResponse = (res, code, data = null, customMessage = null) => {
    const safeCode = Object.prototype.hasOwnProperty.call(errorCodes, code) ? code : '1005';
    const error = errorCodes[safeCode];
    const response = {
        code: safeCode,
        message: customMessage || error.message,
        data,
    };

    res.status(error.statusCode).json(response);
};

export const handleError = (err, req, res, next) => {
    const safeCode = Object.prototype.hasOwnProperty.call(errorCodes, err.code) ? err.code : '9999';
    const error = errorCodes[safeCode] || { message: 'Unknown error', statusCode: 500 };

    let message = error.message;
    if (err.isOperational && err.message) {
        message = err.message;
    }

    logger.error(`Error ${safeCode}: ${err.message}`, { stack: err.stack });

    res.status(error.statusCode).json({ code: safeCode, message });
};
