class CustomError extends Error {
    constructor(code, message, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorCodes = {
    '1000': { message: 'OK', statusCode: 200 },
    '9992': { message: 'The requested post does not exist.', statusCode: 404 },
    '9993': { message: 'Verification code is incorrect.', statusCode: 400 },
    '9994': { message: 'No data or end of list data.', statusCode: 404 },
    '9995': { message: 'User is not validated.', statusCode: 401 },
    '9996': { message: 'User already exists.', statusCode: 409 },
    '9997': { message: 'Method is invalid.', statusCode: 405 },
    '9998': { message: 'Token is invalid.', statusCode: 401 },
    '9999': { message: 'Exception error.', statusCode: 500 },
    '1001': { message: 'Cannot connect to the database.', statusCode: 500 },
    '1002': { message: 'Parameter is not enough.', statusCode: 400 },
    '1003': { message: 'Parameter type is invalid.', statusCode: 400 },
    '1004': { message: 'Parameter value is invalid.', statusCode: 400 },
    '1005': { message: 'Unknown error.', statusCode: 500 },
    '1006': { message: 'File size is too big.', statusCode: 400 },
    '1007': { message: 'Upload file failed.', statusCode: 500 },
    '1008': { message: 'Maximum number of images.', statusCode: 400 },
    '1009': { message: 'Not authorized.', statusCode: 403 },
    '1010': { message: 'Action has been done previously by this user.', statusCode: 409 },
    '1011': { message: 'Could not publish this post.', statusCode: 403 },
    '1012': { message: 'Limited access.', statusCode: 403 },
    '1013': { message: 'Please wait before requesting a new verification code.', statusCode: 429 },
    // Add more error codes as needed
};

const createError = (code, customMessage) => {
    const error = errorCodes[code] || errorCodes['1005']; // Default to 'Unknown error' if code not found
    return new CustomError(code, customMessage || error.message, error.statusCode);
};

module.exports = { CustomError, createError, errorCodes };