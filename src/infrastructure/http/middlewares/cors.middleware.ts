import cors, { type CorsOptions } from 'cors';

import { CorsOriginError } from '@shared';
import { IConfig } from '@interfaces';
import { NextFunction, Request, Response } from 'express';

/**
 * Creates a CORS (Cross-Origin Resource Sharing) middleware with configurable origin validation.
 *
 * @param config - Configuration object containing corsOrigins array for allowed origins
 * @param excludePaths - Optional array of URL paths to exclude from CORS validation (default: [])
 * @returns A middleware function that validates CORS requests or skips validation for excluded paths
 *
 * @example
 * ```typescript
 * const corsMiddleware = createCORSMiddleware(config, ['/health', '/status']);
 * app.use(corsMiddleware);
 * ```
 *
 * @throws {CorsOriginError} When the request origin is not in the allowed origins list
 */

export function createCORSMiddleware(config: IConfig, excludePaths: string[] = []) {
	const corsOptions: CorsOptions = {
		origin: (origin, cb) => {
			if (!origin || config.corsOrigins.includes(origin)) {
				cb(null, true);
			} else cb(new CorsOriginError(origin), false);
		},
		credentials: true,
		optionsSuccessStatus: 200,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
	};

	const corsMiddleware = cors(corsOptions);

	return (req: Request, res: Response, next: NextFunction): void => {
		// Check if request path should be excluded from CORS
		const shouldExclude = excludePaths.some((path) => req.path.startsWith(path));

		if (shouldExclude) {
			// Skip CORS validation for excluded paths
			return next();
		}

		// Apply CORS middleware for all other paths
		corsMiddleware(req, res, next);
	};
}
