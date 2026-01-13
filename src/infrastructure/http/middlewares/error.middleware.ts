/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';

import { getErrStack, HttpError, withLoggerContext } from '@shared';
import { IConfig, ILogger } from '@interfaces';

/**
 * Type definition for an error handling function in Express middleware.
 *
 * @param error - The error object that was thrown or passed to the error handler
 * @param req - The Express request object containing information about the HTTP request
 * @param res - The Express response object used to send the HTTP response
 * @param config - The application configuration object containing settings and options
 *
 * @returns void - This function does not return a value; it handles the error by sending a response
 *
 * @example
 * ```typescript
 * const errorHandler: ErrorHandler = (error, req, res, config) => {
 *   console.error(error);
 *   res.status(500).json({ message: error.message });
 * };
 * ```
 */

type ErrorHandler = (error: Error, req: Request, res: Response, config: IConfig) => void;

//TODO documentar
const HANDLERS = new Map<string, ErrorHandler>([
	[
		'http',
		(error, req, res, config) => {
			const e = error as HttpError;

			let message: string = e.message;
			if (e.name === 'CorsOriginError') {
				message = config.isDevelopment() ? e.message : 'Origin not allowed by CORS';
			}

			res.status(e.statusCode).json({
				error: e.errorCause,
				message: message,
				requestId: req.requestId || 'unknown',
				timestamp: new Date().toISOString(),
				...(e.errorList !== null && { errorList: e.errorList }),
			});
		},
	],
	[
		'oauth',
		(error, req, res, _config) => {
			const e = error as HttpError;

			res.status(e.statusCode).json({
				error: e.errorCause,
				message: e.message,
				requestId: req.requestId || 'unknown',
				timestamp: new Date().toISOString(),
			});
		},
	],
]);

/**
 * Creates an Express error handling middleware that processes and responds to application errors.
 *
 * This middleware intercepts errors thrown during request processing, logs them appropriately,
 * and returns standardized error responses to clients. It supports custom error handlers based
 * on error types and provides different levels of detail depending on the environment.
 *
 * @param logger - The logger instance used for error logging with context support
 * @param config - Configuration object that determines logging behavior and environment settings
 *
 * @returns An Express error middleware function that handles errors with the signature
 *          (error: Error, req: Request, res: Response, next: NextFunction) => void
 *
 * @remarks
 * - In development mode, the middleware returns detailed error messages
 * - In production mode, generic error messages are returned to avoid exposing sensitive information
 * - Each error response includes a requestId and timestamp for tracking
 * - Custom error handlers can be registered in the HANDLERS map based on error type
 * - If no custom handler is found, the default handler returns a 500 Internal Server Error
 * - Request logging is conditional based on the `config.logRequests` setting
 *
 * @example
 * ```typescript
 * const errorMiddleware = createErrorMiddleware(logger, config);
 * app.use(errorMiddleware);
 * ```
 */

export function createErrorMiddleware(logger: ILogger, config: IConfig) {
	const ctxLogger = withLoggerContext(logger, 'ErrorMiddleware');

	const defaultHandler: ErrorHandler = (error, req, res) => {
		const requestId = req.requestId || 'unknown';
		res.status(500).json({
			error: 'Internal Server Error',
			message: config.isDevelopment() ? error.message : 'Something went wrong',
			requestId,
			timestamp: new Date().toISOString(),
		});
	};

	return (error: Error, req: Request, res: Response, _next: NextFunction): void => {
		const requestId = req.requestId || 'unknown';
		const err = error as any;
		const errorName = error.name && error.name !== 'Error' ? error.name : 'Unhandled';

		if (config.logRequests) {
			ctxLogger.error(`${errorName} error in request`, {
				requestId,
				error: error.message,
				stack: getErrStack(error),
				method: req.method,
				url: req.originalUrl || req.url,
			});
		}

		const handler = (err.errorType && HANDLERS.get(err.errorType)) || defaultHandler;

		handler(error, req, res, config);
	};
}
