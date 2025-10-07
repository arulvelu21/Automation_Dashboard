import pino from 'pino';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create rotating file stream
const fileStream = createStream('dashboard.log', {
  interval: '1d', // Rotate daily
  maxFiles: 30,   // Keep 30 days of logs
  compress: 'gzip', // Compress old logs
  path: logsDir,
  initialRotation: true,
});

// Development pretty printer
const prettyStream = pino.destination({
  sync: false,
  colorize: true,
});

// Logger configuration
const loggerConfig: pino.LoggerOptions = {
  name: 'automation-dashboard',
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
};

// Create logger with appropriate streams
let logger: pino.Logger;

if (process.env.NODE_ENV === 'production') {
  // Production: Log to rotating files
  logger = pino(loggerConfig, fileStream);
} else if (process.env.NODE_ENV === 'test') {
  // Test: Silent logging
  logger = pino({ ...loggerConfig, level: 'silent' });
} else {
  // Development: Pretty print to console and save to file
  const streams = [
    { stream: prettyStream },
    { stream: fileStream },
  ];
  logger = pino(loggerConfig, pino.multistream(streams));
}

// Database operation logger
export const dbLogger = logger.child({ component: 'database' });

// API logger
export const apiLogger = logger.child({ component: 'api' });

// Application logger
export const appLogger = logger.child({ component: 'app' });

// Authentication/Security logger
export const securityLogger = logger.child({ component: 'security' });

// Performance logger
export const perfLogger = logger.child({ component: 'performance' });

// Export main logger
export { logger };
export default logger;

// Utility functions for common logging patterns
export const logDatabaseOperation = (operation: string, metadata: Record<string, any>, duration?: number) => {
  const logData = {
    operation,
    duration_ms: duration,
    schema: process.env.PGSCHEMA,
    database: process.env.PGDATABASE,
    ...metadata,
  };

  if (duration && duration > 2000) {
    dbLogger.warn(logData, `Slow database operation: ${operation}`);
  } else {
    dbLogger.info(logData, `Database operation: ${operation}`);
  }
};

export const logApiRequest = (method: string, path: string, metadata: Record<string, any>, duration?: number) => {
  const logData = {
    method,
    path,
    duration_ms: duration,
    ...metadata,
  };

  if (duration && duration > 5000) {
    apiLogger.warn(logData, `Slow API request: ${method} ${path}`);
  } else {
    apiLogger.info(logData, `API request: ${method} ${path}`);
  }
};

export const logError = (error: Error, context: Record<string, any>) => {
  logger.error({
    err: error,
    ...context,
  }, `Error occurred: ${error.message}`);
};

export const logUserAction = (action: string, metadata: Record<string, any>) => {
  appLogger.info({
    action,
    ...metadata,
  }, `User action: ${action}`);
};

export const logSecurityEvent = (event: string, metadata: Record<string, any>) => {
  securityLogger.warn({
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  }, `Security event: ${event}`);
};

export const logPerformanceMetric = (metric: string, value: number, metadata: Record<string, any>) => {
  perfLogger.info({
    metric,
    value,
    unit: 'ms',
    ...metadata,
  }, `Performance metric: ${metric} = ${value}ms`);
};