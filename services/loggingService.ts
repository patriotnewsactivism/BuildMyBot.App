import { captureError, captureMessage, addBreadcrumb } from './sentryService';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

interface LogContext {
  userId?: string;
  botId?: string;
  conversationId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

class LoggingService {
  private isDevelopment: boolean;
  private minLevel: LogLevel;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.minLevel = this.parseLogLevel(
      import.meta.env.VITE_LOG_LEVEL || (this.isDevelopment ? 'debug' : 'info')
    );
  }

  private parseLogLevel(level: string): LogLevel {
    const levelMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warning: LogLevel.WARNING,
      error: LogLevel.ERROR,
    };
    return levelMap[level.toLowerCase()] || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    // Console logging (always in development, conditional in production)
    if (this.isDevelopment || import.meta.env.VITE_DEBUG === 'true') {
      const consoleMethod = level === LogLevel.ERROR ? 'error' :
                           level === LogLevel.WARNING ? 'warn' : 'log';
      console[consoleMethod](formattedMessage);
    }

    // Send breadcrumb to Sentry for context
    if (context) {
      addBreadcrumb(
        context.component || 'app',
        message,
        { level, ...context }
      );
    }

    // Send to Sentry for warnings and errors
    if (level === LogLevel.ERROR || level === LogLevel.WARNING) {
      captureMessage(formattedMessage, level === LogLevel.ERROR ? 'error' : 'warning');
    }

    // Store in local storage for debugging (limited to last 100 logs)
    this.storeLog(level, message, context);
  }

  private storeLog(level: LogLevel, message: string, context?: LogContext) {
    try {
      const logs = this.getLogs();
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
      });

      // Keep only last 100 logs
      const trimmedLogs = logs.slice(-100);
      localStorage.setItem('app_logs', JSON.stringify(trimmedLogs));
    } catch (error) {
      // Ignore localStorage errors (quota exceeded, etc.)
      console.warn('Failed to store log:', error);
    }
  }

  // Public methods
  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warning(message: string, context?: LogContext) {
    this.log(LogLevel.WARNING, message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack,
    };
    this.log(LogLevel.ERROR, message, errorContext);

    // Capture error in Sentry
    if (error) {
      captureError(error, context);
    }
  }

  // Get stored logs
  getLogs() {
    try {
      const logsStr = localStorage.getItem('app_logs');
      return logsStr ? JSON.parse(logsStr) : [];
    } catch {
      return [];
    }
  }

  // Clear stored logs
  clearLogs() {
    try {
      localStorage.removeItem('app_logs');
    } catch (error) {
      console.warn('Failed to clear logs:', error);
    }
  }

  // Export logs as JSON
  exportLogs() {
    const logs = this.getLogs();
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buildmybot-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Log API call
  logApiCall(method: string, endpoint: string, duration: number, status: number, context?: LogContext) {
    const message = `API ${method} ${endpoint} - ${status} (${duration}ms)`;
    const apiContext = {
      ...context,
      method,
      endpoint,
      duration,
      status,
    };

    if (status >= 400) {
      this.error(message, undefined, apiContext);
    } else {
      this.info(message, apiContext);
    }
  }

  // Log user action
  logUserAction(action: string, component: string, context?: LogContext) {
    this.info(`User action: ${action}`, {
      ...context,
      component,
      action,
    });
  }

  // Log performance metric
  logPerformance(metric: string, value: number, unit: string = 'ms', context?: LogContext) {
    this.info(`Performance: ${metric} = ${value}${unit}`, {
      ...context,
      metric,
      value,
      unit,
    });
  }
}

// Export singleton instance
export const logger = new LoggingService();
