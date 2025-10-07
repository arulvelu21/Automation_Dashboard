import { NextRequest, NextResponse } from 'next/server';
import { apiLogger, logApiRequest, logError, logSecurityEvent } from './server-logger';

export interface RequestContext {
  requestId: string;
  startTime: number;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
}

// Generate unique request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Log request start
export function logRequestStart(req: NextRequest): RequestContext {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers.get('user-agent') || undefined;
  const ip = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  const context: RequestContext = {
    requestId,
    startTime,
    method,
    url,
    userAgent,
    ip,
  };

  // Log security events for suspicious requests
  if (method !== 'GET' && method !== 'POST' && method !== 'OPTIONS') {
    logSecurityEvent('unusual_http_method', {
      requestId,
      method,
      url,
      ip,
      userAgent,
    });
  }

  apiLogger.info({
    requestId,
    method,
    url,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  }, `Incoming request: ${method} ${url}`);

  return context;
}

// Log request completion
export function logRequestEnd(
  context: RequestContext,
  response: NextResponse,
  additionalData?: Record<string, any>
) {
  const duration = Date.now() - context.startTime;
  const status = response.status;
  
  logApiRequest(context.method, context.url, {
    requestId: context.requestId,
    status,
    ip: context.ip,
    userAgent: context.userAgent,
    ...additionalData,
  }, duration);

  // Log security events for error responses
  if (status >= 400) {
    const severity = status >= 500 ? 'error' : 'warn';
    apiLogger[severity]({
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      status,
      duration_ms: duration,
      ip: context.ip,
      ...additionalData,
    }, `Request failed: ${context.method} ${context.url} - ${status}`);

    // Log potential security issues
    if (status === 401 || status === 403) {
      logSecurityEvent('unauthorized_access', {
        requestId: context.requestId,
        method: context.method,
        url: context.url,
        ip: context.ip,
        status,
      });
    }
  }
}

// Middleware wrapper for API routes
export function withLogging<T extends any[], R>(
  handler: (...args: T) => Promise<R> | R,
  routeName?: string
) {
  return async (...args: T): Promise<R> => {
    const req = args[0] as NextRequest;
    const context = logRequestStart(req);
    
    try {
      const result = await handler(...args);
      
      // If result is a NextResponse, log it
      if (result instanceof NextResponse) {
        logRequestEnd(context, result, { routeName });
      }
      
      return result;
    } catch (error) {
      logError(error as Error, {
        requestId: context.requestId,
        method: context.method,
        url: context.url,
        routeName,
        duration_ms: Date.now() - context.startTime,
      });
      
      throw error;
    }
  };
}

// Helper for logging business logic operations within API routes
export function logBusinessOperation(
  requestId: string,
  operation: string,
  metadata: Record<string, any>,
  duration?: number
) {
  apiLogger.info({
    requestId,
    operation,
    duration_ms: duration,
    ...metadata,
  }, `Business operation: ${operation}`);
}