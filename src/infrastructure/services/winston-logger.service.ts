/* eslint-disable @typescript-eslint/no-explicit-any */
import winston, { Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { Injectable } from '@shared';
import type { IClock, IConfig, ILogContext, ILogEntry, ILogger, LogLevel } from '@interfaces';

/**
 * Winston-based implementation of the ILogger interface.
 *
 * Provides structured logging capabilities with support for multiple log levels,
 * contextual information, and both development and production formats.
 *
 * @remarks
 * - In production mode, logs are output in JSON format with timestamps
 * - In development mode, logs are colorized and formatted for readability
 * - Supports log rotation through DailyRotateFile transport
 * - Automatically includes service name and request ID in log entries
 * - Can create child loggers with inherited context
 *
 * @example
 * ```typescript
 * const logger = new WinstonLoggerService(config, clock, { service: 'my-service' });
 * logger.info('User logged in', { userId: '123', email: 'user@example.com' });
 *
 * // Create a child logger with additional context
 * const requestLogger = logger.child({ requestId: 'abc-123' });
 * requestLogger.debug('Processing request');
 * ```
 */

@Injectable({ name: 'Logger', depends: ['Config', 'Clock'] })
export class WinstonLoggerService implements ILogger {
	private readonly winston: WinstonLogger;
	private readonly defaultContext: ILogContext;

	/**
	 * Creates a new instance of the Winston logger service.
	 *
	 * @param config - Configuration object containing service settings including service name
	 * @param clock - Clock service for time-related operations
	 * @param defaultContext - Optional default logging context. Defaults to an empty object if not provided
	 *
	 * @remarks
	 * This constructor initializes the logger with:
	 * - A default context that includes the service name from config
	 * - Winston color scheme using npm color configuration
	 * - A Winston logger instance created through `createWinstonLogger()`
	 */

	constructor(
		private readonly config: IConfig,
		private readonly clock: IClock,
		defaultContext: ILogContext = {}
	) {
		this.defaultContext = { service: this.config.serviceName, ...defaultContext };
		winston.addColors(winston.config.npm.colors);
		this.winston = this.createWinstonLogger();
	}

	/**
	 * Logs an informational message with optional context.
	 *
	 * @param message - The informational message to log
	 * @param context - Optional additional context data to include with the log entry
	 * @returns void
	 */
	public info(msg: string, context?: Record<string, unknown>): void {
		this.log('info', msg, context);
	}

	/**
	 * Logs an error message with optional context information.
	 *
	 * @param message - The error message to be logged
	 * @param context - Optional additional context data to include with the error log
	 * @returns void
	 */

	public error(msg: string, context?: Record<string, unknown>): void {
		this.log('error', msg, context);
	}

	/**
	 * Logs a warning message with optional context.
	 *
	 * @param message - The warning message to be logged
	 * @param context - Optional additional context information to include with the warning
	 * @returns void
	 */

	public warn(msg: string, context?: Record<string, unknown>): void {
		this.log('warn', msg, context);
	}

	/**
	 * Logs a debug message with optional context information.
	 *
	 * @param message - The debug message to be logged
	 * @param context - Optional additional context data to include with the log entry
	 * @returns void
	 */

	public debug(msg: string, context?: Record<string, unknown>): void {
		this.log('debug', msg, context);
	}

	/**
	 * Creates a child logger instance with additional context merged into the default context.
	 *
	 * @param context - Additional logging context to be merged with the default context
	 * @returns A new WinstonLoggerService instance with the combined context
	 *
	 * @remarks
	 * The child logger inherits the configuration and clock from the parent logger,
	 * while merging the provided context with any existing default context.
	 * Properties in the new context will override matching properties in the default context.
	 */

	public child(context: ILogContext): ILogger {
		return new WinstonLoggerService(this.config, this.clock, { ...this.defaultContext, ...context });
	}

	/**
	 * Logs a message with the specified log level and optional context.
	 *
	 * This method merges the provided context with default context, creates a log entry
	 * with timestamp, level, and service information, and optionally includes a requestId
	 * if present in the context. Context properties 'service' and 'requestId' are excluded
	 * from the context object to avoid duplication in the log entry.
	 *
	 * @param level - The severity level of the log (e.g., 'info', 'warn', 'error')
	 * @param message - The log message to be recorded
	 * @param context - Optional key-value pairs providing additional contextual information
	 * @returns void
	 *
	 * @example
	 * ```typescript
	 * logger.log('info', 'User logged in', { userId: '123', requestId: 'abc-def' });
	 * ```
	 */

	public log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
		const mergeContext = { ...this.defaultContext, ...context };

		// We create the base logEntry
		const logEntry: Partial<ILogEntry> = {
			timestamp: this.clock.isoString(),
			level,
			service: mergeContext.service || this.config.serviceName,
			message,
		};

		// We add the requestId to the message in case it comes in the context.
		if (mergeContext.requestId !== undefined) {
			logEntry.requestId = mergeContext.requestId;
		}

		// Remove the 'service' and 'requestId' properties from the context to avoid duplicates in the log
		const contextWithoutService = Object.entries(mergeContext)
			.filter(([key]) => key !== 'service' && key !== 'requestId')
			.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

		if (Object.keys(contextWithoutService).length > 0) {
			logEntry.context = contextWithoutService;
		}

		this.winston.log(level, logEntry as ILogEntry);
	}

	/**
	 * Checks the health status of the IClock service.
	 *
	 * @returns A promise that resolves to an object indicating the health status (`'healthy'` or `'unhealthy'`)
	 *          and an optional message describing the service state.
	 */

	public async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
		return {
			status: 'healthy',
			message: 'Logger service is available and operational',
		};
	}

	/**
	 * Creates and configures a Winston logger instance.
	 *
	 * The logger is configured based on the current environment (production or development),
	 * using different formatting strategies for each. The logger is set up to not exit on
	 * errors and to handle exceptions and rejections according to the configuration.
	 *
	 * @private
	 * @returns {WinstonLogger} A configured Winston logger instance with appropriate format,
	 * transports, and error handling settings.
	 */

	private createWinstonLogger(): WinstonLogger {
		const format = this.config.isProduction() ? this.createProductionFormat() : this.createDevelopmentFormat();
		const transports = this.createTransports();

		return winston.createLogger({
			level: this.config.logLevel,
			format,
			transports,
			exitOnError: false,
			handleExceptions: false,
			handleRejections: false,
		});
	}

	/**
	 * Creates a production-ready log format configuration for Winston logger.
	 *
	 * This method combines multiple formatting options to produce structured JSON logs
	 * suitable for production environments, including ISO 8601 timestamps and error stack traces.
	 *
	 * @private
	 * @returns {winston.Logform.Format} A combined Winston format that includes:
	 * - ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss.SSSZ)
	 * - Error stack trace capturing
	 * - JSON formatting for structured logging
	 */

	private createProductionFormat(): winston.Logform.Format {
		const { combine, timestamp, errors, json } = winston.format;
		return combine(timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }), errors({ stack: true }), json());
	}

	/**
	 * Creates a Winston log format optimized for development environments.
	 *
	 * This format includes:
	 * - Human-readable timestamps in HH:mm:ss.SSS format
	 * - Colorized log levels using npm color scheme
	 * - Error stack traces
	 * - Custom formatted output with service name, request ID, and metadata
	 *
	 * The log output structure:
	 * ```
	 * HH:mm:ss.SSS [serviceName] LEVEL [reqId]: message
	 * { context object without stack }
	 * { additional metadata }
	 * stack trace
	 * ```
	 *
	 * @returns A combined Winston format for development logging with colorized output
	 *
	 * @remarks
	 * - Extracts and formats stack traces from the context object if present
	 * - Truncates request IDs to first 8 characters for readability
	 * - Formats nested objects as indented JSON
	 * - Properly handles escaped newlines in stack traces
	 *
	 * @private
	 */

	private createDevelopmentFormat(): winston.Logform.Format {
		const { combine, timestamp, errors, colorize, printf } = winston.format;

		return combine(
			timestamp({ format: 'HH:mm:ss.SSS' }),
			errors({ stack: true }),
			colorize({ level: true, colors: winston.config.npm.colors }),
			printf((info) => {
				const { timestamp, level, message, service, requestId, context, stack, ...restMeta } = info;

				// Extract stack from context if it exists and is string
				let contextWithoutStack = context;
				let stackToPrint = stack;
				if (context && Object.prototype.hasOwnProperty.call(context, 'stack') && typeof (context as any).stack === 'string') {
					stackToPrint = (context as any).stack;
					const { stack: _stack, ...rest } = context as Record<string, unknown>;
					contextWithoutStack = rest;
				}

				// obtain the requestId and service name
				const reqId = typeof requestId === 'string' ? `[${requestId.slice(0, 8)}]` : '';
				const serviceName = service || 'unknown';

				// build the log line
				let logLine = `${timestamp} [${serviceName}] ${level} ${reqId}: ${message}`;

				// Add the context and the remaining metadata if they exist
				if (contextWithoutStack && Object.keys(contextWithoutStack).length > 0) {
					logLine += `\n${JSON.stringify(contextWithoutStack, null, 2)}`;
				}

				// Add the remaining metadata if they exist
				if (Object.keys(restMeta).length > 0) {
					logLine += `\n${JSON.stringify(restMeta, null, 2)}`;
				}

				// Add the stack if it exists formatted properly
				if (stackToPrint) {
					const stackStr =
						typeof stackToPrint === 'string' && stackToPrint.includes('\\n') ? stackToPrint.replace(/\\n/g, '\n') : stackToPrint;
					logLine += `\n${stackStr}`;
				}

				return logLine;
			})
		);
	}

	/**
	 * Creates and configures Winston transport instances for logging.
	 *
	 * This method sets up multiple transports based on the application environment:
	 * - Console transport: Always enabled for all environments
	 * - Error file transport: Only in production, rotates daily, keeps logs for 14 days
	 * - Combined file transport: Always enabled, rotates daily, keeps logs for 14 days
	 *
	 * @returns {winston.transport[]} An array of configured Winston transport instances
	 *
	 * @remarks
	 * - All transports have `handleExceptions` set to false
	 * - File transports use daily rotation with the pattern 'YYYY-MM-DD'
	 * - Error logs are kept in separate files with a maximum size of 20MB
	 * - Combined logs include timestamp and JSON formatting
	 * - Log files are automatically cleaned up after 14 days
	 */

	private createTransports(): winston.transport[] {
		const transports: winston.transport[] = [];
		const { combine, timestamp, json } = winston.format;

		transports.push(
			new winston.transports.Console({
				handleExceptions: false,
				handleRejections: false,
			})
		);

		if (this.config.isProduction()) {
			transports.push(
				new DailyRotateFile({
					filename: 'logs/error-%DATE%.log',
					datePattern: 'YYYY-MM-DD',
					level: 'error',
					handleExceptions: false,
					maxSize: '20mb',
					maxFiles: '14d',
				})
			);
		}

		transports.push(
			new DailyRotateFile({
				filename: 'logs/combined-%DATE%.log',
				datePattern: 'YYYY-MM-DD',
				handleExceptions: false,
				maxFiles: '14d',
				maxSize: '20m',
				format: combine(timestamp(), json()),
			})
		);

		return transports;
	}
}
