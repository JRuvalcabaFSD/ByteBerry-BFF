import { RequestHandler } from 'express';

import helmet from 'helmet';

/**
 * Creates an Express middleware that applies security-related HTTP headers using Helmet.
 *
 * The middleware configures:
 * - Content Security Policy (CSP) to restrict sources for scripts, styles, and images.
 * - HTTP Strict Transport Security (HSTS) to enforce secure (HTTPS) connections.
 *
 * @returns {RequestHandler} An Express middleware function with security headers applied.
 */

export function createSecurityMiddleware(): RequestHandler {
	return helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", 'data:', 'https:'],
			},
		},
		hsts: {
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true,
		},
	});
}
