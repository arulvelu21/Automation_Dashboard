// Smart logger that uses server logger on server, client logger on client
let logger: any;
let appLogger: any;
let apiLogger: any;
let dbLogger: any;
let securityLogger: any;
let perfLogger: any;
let logError: any;
let logDatabaseOperation: any;
let logApiRequest: any;
let logSecurityEvent: any;
let logPerformanceMetric: any;
let logUserAction: any;

const isServer = typeof window === 'undefined';

if (isServer) {
  // Server-side: Use full logging with file rotation
  const serverLogger = require('./server-logger');
  logger = serverLogger.logger;
  appLogger = serverLogger.appLogger;
  apiLogger = serverLogger.apiLogger;
  dbLogger = serverLogger.dbLogger;
  securityLogger = serverLogger.securityLogger;
  perfLogger = serverLogger.perfLogger;
  logError = serverLogger.logError;
  logDatabaseOperation = serverLogger.logDatabaseOperation;
  logApiRequest = serverLogger.logApiRequest;
  logSecurityEvent = serverLogger.logSecurityEvent;
  logPerformanceMetric = serverLogger.logPerformanceMetric;
  logUserAction = serverLogger.logUserAction;
} else {
  // Client-side: Use console-only logger
  const clientLogger = require('./client-logger');
  logger = clientLogger.logger;
  appLogger = clientLogger.appLogger;
  apiLogger = clientLogger.apiLogger;
  dbLogger = clientLogger.dbLogger;
  securityLogger = clientLogger.securityLogger;
  perfLogger = clientLogger.perfLogger;
  logError = clientLogger.logError;
  logDatabaseOperation = clientLogger.logDatabaseOperation;
  logApiRequest = clientLogger.logApiRequest;
  logSecurityEvent = clientLogger.logSecurityEvent;
  logPerformanceMetric = clientLogger.logPerformanceMetric;
  logUserAction = clientLogger.logUserAction;
}

export {
  logger,
  appLogger,
  apiLogger,
  dbLogger,
  securityLogger,
  perfLogger,
  logError,
  logDatabaseOperation,
  logApiRequest,
  logSecurityEvent,
  logPerformanceMetric,
  logUserAction
};

export default logger;