import { HealthCheckable, LogLevel } from '@interfaces';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		Logger: ILogger;
	}
}

/**
 * Represents the context information for logging operations.
 *
 * @interface ILogContext
 *
 * @property {string} [requestId] - Unique identifier for the request
 * @property {string} [userId] - Identifier of the user making the request
 * @property {string} [service] - Name of the service handling the request
 * @property {string} [method] - HTTP method of the request (GET, POST, etc.)
 * @property {string} [url] - URL path of the request
 * @property {string} [statusCode] - HTTP status code of the response
 * @property {string} [duration] - Time taken to process the request
 * @property {string} [error] - Error message or description if an error occurred
 * @property {unknown} [key: string] - Additional dynamic properties for extended logging context
 */

export interface ILogContext {
	requestId?: string;
	userId?: string;
	service?: string;
	method?: string;
	url?: string;
	statusCode?: string;
	duration?: string;
	error?: string;
	[key: string]: unknown;
}

/**
 * Represents a structured log entry for the logging service.
 *
 * @interface ILogEntry
 *
 * @property {string} timestamp - The ISO 8601 formatted timestamp when the log entry was created
 * @property {string} level - The severity level of the log (e.g., 'info', 'warn', 'error', 'debug')
 * @property {string} service - The name of the service or module that generated the log entry
 * @property {string} msg - The human-readable log message describing the event
 * @property {ILogContext} [context] - Optional additional contextual information about the log entry
 * @property {string} requestId - A unique identifier to trace the request across different services
 */

export interface ILogEntry {
	timestamp: string;
	level: string;
	service: string;
	message: string;
	context?: ILogContext;
	requestId: string;
}

/**
 * Logger interface for application-wide logging operations.
 *
 * @remarks
 * This interface defines the contract for logging services throughout the application.
 * It supports multiple log levels and contextual logging through child logger creation.
 *
 * @method info - Logs an informational message.
 * @method warn - Logs a warning message.
 * @method debug - Logs a debug message.
 * @method child - Creates a child logger with additional context.
 * @method log - Logs a message at the specified log level.
 * @method error - Logs an error message.
 *
 * @example
 * ```typescript
 * const logger: ILogger = new MyLogger();
 * logger.info('Application started', { version: '1.0.0' });
 * logger.error('Failed to connect', { error: 'Connection timeout' });
 *
 * const childLogger = logger.child({ module: 'AuthService' });
 * childLogger.warn('Token expiring soon');
 * ```
 */

export interface ILogger extends HealthCheckable {
	info(msg: string, context?: Record<string, unknown>): void;
	error(msg: string, context?: Record<string, unknown>): void;
	warn(msg: string, context?: Record<string, unknown>): void;
	debug(msg: string, context?: Record<string, unknown>): void;
	child(context: ILogContext): ILogger;
	log(level: LogLevel, msg: string, context?: Record<string, unknown>): void;
}
