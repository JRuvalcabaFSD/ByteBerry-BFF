import { IJwtVerifierClient, ILogger, ISessionManager } from '@interfaces';
import { AuthenticatedError, withLoggerContext } from '@shared';
import { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Creates an Express middleware for authenticating requests using session cookies and JWT verification.
 *
 * This middleware extracts the session ID from a specified cookie, retrieves the session from the session manager,
 * verifies the JWT access token, and attaches the authenticated user and session information to the request object.
 * If authentication fails (e.g., session not found or expired), it throws an `AuthenticatedError`.
 *
 * @param sessionManager - The session manager responsible for retrieving and updating session information.
 * @param jwtVerifier - The JWT verifier client used to decode and validate the access token.
 * @param sessionCookieName - The name of the cookie containing the session ID.
 * @param logger - Logger instance for logging authentication events and errors.
 * @returns An Express request handler (middleware) that authenticates requests based on session cookies.
 */

export function createAuthMiddleware(
	sessionManager: ISessionManager,
	jwtVerifier: IJwtVerifierClient,
	sessionCookieName: string,
	logger: ILogger
): RequestHandler {
	const ctxLogger = withLoggerContext(logger, 'createCookieAuthMiddleware');

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const requestId = req.requestId || 'unknown';

		try {
			ctxLogger.debug('Processing cookie authentication', {
				requestId,
				path: req.path,
				method: req.method,
				hasCookie: !!req.cookies[sessionCookieName],
			});

			const sessionId = getSessionIdFromCookie(req.cookies, sessionCookieName);

			const session = sessionManager.getSession(sessionId);

			if (!session) {
				ctxLogger.warn('Session not found or expired', {
					requestId,
					sessionId,
				});
				throw new AuthenticatedError('Session not found or expired. Please login again.', 'Session expired');
			}

			sessionManager.touchSession(sessionId);

			const payload = jwtVerifier.decode(session.accessToken);

			req.user = payload;

			req.session = {
				sessionId: session.sessionId,
				userId: session.userId,
				accessToken: session.accessToken,
				refreshToken: session.refreshToken ?? null,
				tokenType: session.tokenType,
				expiresAt: session.expiresAt,
			};

			ctxLogger.debug('Request authenticated successfully', {
				requestId,
				sessionId,
				userId: session.userId,
			});

			next();
		} catch (error) {
			next(error);
		}
	};
}

/**
 * Retrieves the session ID from the provided cookies object using the specified cookie name.
 *
 * Throws an `AuthenticatedError` if the session cookie is missing or invalid.
 *
 * @param cookies - An object containing cookie key-value pairs.
 * @param cookieName - The name of the cookie to retrieve the session ID from.
 * @returns The session ID as a string.
 * @throws AuthenticatedError If the session cookie is missing or has an invalid format.
 */

function getSessionIdFromCookie(cookies: Record<string, string>, cookieName: string): string {
	const sessionId = cookies[cookieName];

	if (!sessionId) throw new AuthenticatedError('No session cookie found. Please login.', 'Missing Session cookie');

	if (typeof sessionId !== 'string' || sessionId.length === 0)
		throw new AuthenticatedError('Invalid session cookie format', 'Invalid session cookie');

	return sessionId;
}
