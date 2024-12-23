import axios from 'axios';

const logLevels = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

class Logger {
    constructor() {
        this.defaultMeta = {};
    }

    setDefaultMeta(meta) {
        this.defaultMeta = { ...this.defaultMeta, ...meta };
    }

    async log(level, message, meta = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...this.defaultMeta,
            ...meta
        };

        // Log to console in all environments
        this.logToConsole(level, logEntry);
    }

    logToConsole(level, logEntry) {
        const coloredLevel = this.getColoredLevel(level);
        console[level](`${coloredLevel}: ${logEntry.message}`, logEntry);
    }

    getColoredLevel(level) {
        const colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m',  // Yellow
            info: '\x1b[36m',  // Cyan
            debug: '\x1b[35m'  // Magenta
        };
        return `${colors[level]}${level.toUpperCase()}\x1b[0m`;
    }

    error(message, meta = {}) {
        return this.log(logLevels.ERROR, message, meta);
    }

    warn(message, meta = {}) {
        return this.log(logLevels.WARN, message, meta);
    }

    info(message, meta = {}) {
        return this.log(logLevels.INFO, message, meta);
    }

    debug(message, meta = {}) {
        return this.log(logLevels.DEBUG, message, meta);
    }
}

const logger = new Logger();

export default logger;
