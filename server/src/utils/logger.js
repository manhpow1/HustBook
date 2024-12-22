const winston = require('winston');
require('winston-daily-rotate-file');

const { combine, timestamp, printf, colorize, align } = winston.format;

// Define a log format with timestamp, level, and message
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

// Formatter to mask sensitive data
const maskSensitiveData = winston.format((info) => {
    if (info.message && typeof info.message === 'string') {
        // Enhanced masking patterns
        info.message = info.message.replace(/(password=)([^&\s]+)/gi, '$1***');
        info.message = info.message.replace(/(token=)([^&\s]+)/gi, '$1***');
        info.message = info.message.replace(/(email=)([^&\s]+)/gi, '$1***');
    }
    return info;
});

// Create a logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        maskSensitiveData(),
        colorize({ all: process.env.NODE_ENV !== 'production' }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        align(),
        logFormat
    ),
    transports: [
        // Log to console
        new winston.transports.Console({
            format: combine(
                maskSensitiveData(),
                colorize(),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                logFormat
            ),
        }),
    ],
});

// In non-production environments, log to console with simple format
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            maskSensitiveData(),
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat
        ),
    }));
}

// In production, use console transport as well
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            maskSensitiveData(),
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat
        ),
    }));
}

module.exports = logger;