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
        const validLevels = Object.values(logLevels);
        const isValidLevel = validLevels.includes(level);

        const consoleMethod = isValidLevel ? level : 'log';

        console[consoleMethod](
            `%c[${level.toUpperCase()}]%c: ${logEntry.message}`,
            this.getStyleForLevel(level),
            '',
            logEntry
        );
    }

    getStyleForLevel(level) {
        // Add custom styles for different log levels
        switch (level) {
            case logLevels.ERROR:
                return 'color: red; font-weight: bold;';
            case logLevels.WARN:
                return 'color: orange; font-weight: bold;';
            case logLevels.INFO:
                return 'color: blue; font-weight: bold;';
            case logLevels.DEBUG:
                return 'color: gray; font-style: italic;';
            default:
                return 'color: black;';
        }
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