/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';

import { IClock, ILogger } from '@interfaces';

/**
 * Creates an Express middleware for logging HTTP requests and responses.
 *
 * @param logger - The logger instance implementing ILogger interface used for logging operations
 * @param clock - The clock instance implementing IClock interface used for timestamp generation
 * @param loggerRequests - Flag indicating whether to enable request logging. When true, returns a no-op middleware
 *
 * @returns An Express middleware function that:
 * - Validates the presence of a request ID (must be set by a previous middleware)
 * - Attaches a child logger to the request with contextual information
 * - Logs incoming requests with method, URL, user agent, and IP address
 * - Intercepts the response end to log completion with status code and duration
 * - Logs warnings for responses with status codes >= 400, info for successful responses
 *
 * @throws {Error} If the Request ID middleware has not been applied before this middleware
 *
 * @example
 * ```typescript
 * const loggingMiddleware = createLoggingMiddleware(logger, clock, false);
 * app.use(loggingMiddleware);
 * ```
 */

export function createLoggingMiddleware(logger: ILogger, clock: IClock, loggerRequests: boolean) {
	if (!loggerRequests) return (req: Request, res: Response, next: NextFunction) => next();

	return (req: Request, res: Response, next: NextFunction): void => {
		const startTime = clock.timestamp();

		if (!req.requestId) return next(new Error('Request ID middleware must be applied before logging middleware'));

		req.logger = logger.child({
			requestId: req.requestId,
			method: req.method,
			url: req.originalUrl || req.url,
			userAgent: req.headers['user-agent'],
			ip: req.ip || req.socket?.remoteAddress || 'unknown',
		});

		req.startTime = startTime;

		req.logger.info('Incoming request', {
			method: req.method,
			url: req.originalUrl || req.url,
			userAgent: req.headers['user-agent'],
			ip: req.ip || req.socket?.remoteAddress || 'unknown',
		});

		const originalEnd = res.end;
		res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
			const duration = clock.timestamp() - startTime;

			const context = {
				method: req.method,
				url: req.originalUrl || req.url,
				statusCode: res.statusCode,
				duration,
				contentLength: res.get('Content-Length'),
			};
			if (res.statusCode >= 400) {
				req.logger?.warn('Request completed with error', context);
			} else {
				req.logger?.info('Request completed', context);
			}

			return originalEnd.call(res, chunk, encoding, cb);
		} as typeof originalEnd;

		next();
	};
}
