// CROSS-002 FIX: Structured Logging Utility
// Provides consistent, structured logging across the application

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

const isDevelopment = process.env.NODE_ENV === 'development' ||
  process.env.VITE_ENABLE_DEMO_MODE === 'true';

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      message: error.message,
      name: error.name,
      stack: isDevelopment ? error.stack : undefined,
    };
  }

  return entry;
}

export const logger = {
  /**
   * Debug level logging - only shown in development
   */
  debug: (message: string, context?: LogContext): void => {
    if (!isDevelopment) return;
    const entry = createLogEntry('debug', message, context);
    console.debug(formatLog(entry));
  },

  /**
   * Info level logging - general information
   */
  info: (message: string, context?: LogContext): void => {
    const entry = createLogEntry('info', message, context);
    console.log(formatLog(entry));
  },

  /**
   * Warning level logging - potential issues
   */
  warn: (message: string, context?: LogContext): void => {
    const entry = createLogEntry('warn', message, context);
    console.warn(formatLog(entry));
  },

  /**
   * Error level logging - errors that occurred
   */
  error: (message: string, error?: Error | unknown, context?: LogContext): void => {
    const err = error instanceof Error ? error : undefined;
    const entry = createLogEntry('error', message, context, err);

    // If error is not an Error instance, add it to context
    if (error && !(error instanceof Error)) {
      entry.context = {
        ...entry.context,
        errorDetails: String(error),
      };
    }

    console.error(formatLog(entry));
  },

  /**
   * Log an API call for tracking
   */
  apiCall: (
    endpoint: string,
    method: string,
    status: number,
    durationMs: number,
    context?: LogContext
  ): void => {
    const entry = createLogEntry('info', `API ${method} ${endpoint}`, {
      ...context,
      endpoint,
      method,
      status,
      durationMs,
    });
    console.log(formatLog(entry));
  },

  /**
   * Log a user action for analytics
   */
  userAction: (action: string, context?: LogContext): void => {
    const entry = createLogEntry('info', `User action: ${action}`, {
      ...context,
      actionType: 'user_action',
      action,
    });
    console.log(formatLog(entry));
  },

  /**
   * Create a child logger with preset context
   */
  child: (defaultContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...defaultContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...defaultContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logger.error(message, error, { ...defaultContext, ...context }),
  }),
};

// Export type for use in other files
export type Logger = typeof logger;
