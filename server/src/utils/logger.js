import winston from 'winston';
import 'winston-daily-rotate-file';

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
    if (info.message) {
        info.message = String(info.message); // Ensure it's a string
        // Enhanced masking patterns
        info.message = info.message.replace(/(password=)([^&\s]+)/gi, '$1***');
        info.message = info.message.replace(/(token=)([^&\s]+)/gi, '$1***');
    }
    return info;
});

// Create a logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        maskSensitiveData(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        align(),
        logFormat
    )
});

// Add console transport for all environments
logger.add(new winston.transports.Console({
    level: 'debug',
    format: combine(
        maskSensitiveData(),
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    )
}));

// Add file transport only in production
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.DailyRotateFile({
        level: 'debug',
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: combine(
            maskSensitiveData(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat
        )
    }));
}

export default logger;
