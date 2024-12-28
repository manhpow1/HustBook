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
        const formattedLevel = `[${level.toUpperCase()}]`;
        console[level](`${formattedLevel}: ${logEntry.message}`, logEntry);
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
