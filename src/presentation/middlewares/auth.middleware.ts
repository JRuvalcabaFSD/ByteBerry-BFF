import { NextFunction, Request, RequestHandler, Response } from 'express';

import { IJwtVerifierClient, ILogger } from '@interfaces';
import { AuthenticatedError, withLoggerContext } from '@shared';

const BEARER_PREFIX = 'Bearer ';
const TOKEN_PATTERN = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;

/**
 * Creates an Express middleware function for JWT-based authentication.
 *
 * This middleware extracts the JWT token from the Authorization header,
 * verifies it using the provided JWT verifier, and attaches the decoded
 * payload to the request object as `req.user`. If verification fails,
 * it passes the error to the next middleware.
 *
 * @param jwtVerifier - The JWT verifier instance used to validate tokens.
 * @param logger - The logger instance for recording authentication events.
 * @returns An Express RequestHandler middleware function.
 */

export function createAuthMiddleware(jwtVerifier: IJwtVerifierClient, logger: ILogger): RequestHandler {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const ctxLogger = withLoggerContext(logger, 'createAuthMiddleware');
		const requestId = req.requestId || 'unknown';

		try {
			const authHeader = req.headers.authorization;

			ctxLogger.debug('Processing authentication', { requestId, path: req.path, method: req.method, hasAuthHeader: !!authHeader });

			const token = getTokenFromHeader(authHeader);
			const payload = await jwtVerifier.verify(token);

			req.user = payload;

			ctxLogger.debug('Request authenticated successfully', {
				requestId,
				userId: payload.sub,
				clientId: payload.client_id,
				scope: payload.scope,
			});

			next();
		} catch (error) {
			next(error);
		}
	};
}

/**
 * Extracts and validates a Bearer token from the authorization header.
 *
 * @param authHeader - The authorization header string, expected to start with "Bearer " followed by the token.
 * @returns The extracted and validated token string.
 * @throws {AuthenticatedError} If the auth header is missing, does not start with "Bearer ", the token is empty, or does not match the expected format.
 */

function getTokenFromHeader(authHeader: string | undefined): string {
	if (!authHeader) throw AuthenticatedError.missingAuthHeader();
	if (!authHeader.startsWith(BEARER_PREFIX)) throw AuthenticatedError.missingAuthHeader();

	const token = authHeader.substring(BEARER_PREFIX.length).trim();

	if (!token) throw new AuthenticatedError('Empty token in authorization header');

	if (!token || typeof token !== 'string') throw AuthenticatedError.invalidTokenFormat();
	if (!TOKEN_PATTERN.test(token)) throw AuthenticatedError.invalidTokenFormat();

	return token;
}
