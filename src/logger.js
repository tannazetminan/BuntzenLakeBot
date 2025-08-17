const winston = require("winston");
const config = require("./config");

// Create custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: customFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), customFormat),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: customFormat,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: "logs/combined.log",
      format: customFormat,
    }),
  ],
});

// Add helper methods
logger.logSuccess = (message) => {
  logger.info(`✅ ${message}`);
};

logger.logWarning = (message) => {
  logger.warn(`⚠️ ${message}`);
};

logger.logError = (message, error = null) => {
  if (error) {
    logger.error(`${message}: ${error.message}`, error);
  } else {
    logger.error(`❌ ${message}`);
  }
};

logger.logStep = (step, details = "") => {
  logger.info(`🔄 ${step}${details ? ` - ${details}` : ""}`);
};

logger.logCompletion = (step) => {
  logger.info(`✅ Completed: ${step}`);
};

logger.logInfo = (message) => {
  logger.info(`ℹ️ ${message}`);
};

module.exports = logger;
