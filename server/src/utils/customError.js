class CustomError extends Error {
    constructor(code, message, statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

const errorCodes = {
    '1000': { message: 'OK', statusCode: 200 },
    '9992': { message: 'Post is not existed', statusCode: 404 },
    '9993': { message: 'Code verify is incorrect', statusCode: 400 },
    '9994': { message: 'No Data or end of list data', statusCode: 404 },
    '9995': { message: 'User is not validated', statusCode: 401 },
    '9996': { message: 'User existed', statusCode: 409 },
    '9997': { message: 'Method is invalid', statusCode: 405 },
    '9998': { message: 'Token is invalid', statusCode: 401 },
    '9999': { message: 'Exception error', statusCode: 500 },
    '1001': { message: 'Can not connect to DB', statusCode: 500 },
    '1002': { message: 'Parameter is not enough', statusCode: 400 },
    '1003': { message: 'Parameter type is invalid', statusCode: 400 },
    '1004': { message: 'Parameter value is invalid', statusCode: 400 },
    '1005': { message: 'Unknown error', statusCode: 500 },
    '1006': { message: 'File size is too big', statusCode: 400 },
    '1007': { message: 'Upload File Failed', statusCode: 500 },
    '1008': { message: 'Maximum number of images', statusCode: 400 },
    '1009': { message: 'Not access', statusCode: 403 },
    '1010': { message: 'Action has been done previously by this user', statusCode: 409 },
    '1011': { message: 'Could not publish this post', statusCode: 403 },
    '1012': { message: 'Limited access', statusCode: 403 },
};

const createError = (code) => {
    const { message, statusCode } = errorCodes[code] || errorCodes['1005'];
    return new CustomError(code, message, statusCode);
};

module.exports = { CustomError, createError, errorCodes };