// Client-safe logger that only uses console
import pino from 'pino';

// Simple client-side logger configuration
const clientLoggerConfig: pino.LoggerOptions = {
  name: 'automation-dashboard-client',
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  browser: {
    asObject: true,
    write: (o: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(o);
      }
    }
  }
};

// Create client logger
const clientLogger = pino(clientLoggerConfig);

// Export client-safe loggers
export const appLogger = clientLogger.child({ component: 'app' });
export const apiLogger = clientLogger.child({ component: 'api' });
export const dbLogger = clientLogger.child({ component: 'database' });
export const securityLogger = clientLogger.child({ component: 'security' });
export const perfLogger = clientLogger.child({ component: 'performance' });

// Export main logger
export { clientLogger as logger };
export default clientLogger;

// Utility functions (client-safe versions)
export const logError = (error: Error, context: Record<string, any>) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error.message, context);
  }
};

export const logUserAction = (action: string, metadata: Record<string, any>) => {
  appLogger.info({
    action,
    ...metadata,
  }, `User action: ${action}`);
};

// No-op versions for client side
export const logDatabaseOperation = () => {};
export const logApiRequest = () => {};
export const logSecurityEvent = () => {};
export const logPerformanceMetric = () => {};