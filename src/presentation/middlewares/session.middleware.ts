/* eslint-disable @typescript-eslint/no-explicit-any */
import { ILogger, ISessionManager } from '@interfaces';
import { AuthenticatedError, withLoggerContext } from '@shared';
import { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Creates a middleware that authenticates requests using session cookies.
 *
 * @param sessionManager - The session manager instance responsible for retrieving and managing sessions
 * @param sessionCookieName - The name of the cookie that stores the session identifier
 * @param logger - The logger instance for recording debug and warning messages
 *
 * @returns A middleware function that processes incoming requests and attaches session and user data to the request object
 *
 * @remarks
 * This middleware performs the following operations:
 * - Extracts the session ID from the specified cookie
 * - Retrieves the session data from the session manager
 * - Throws an AuthenticatedError if the session is not found or has expired
 * - Updates the session's last access time via touchSession
 * - Attaches session information to `req.session`
 * - Attaches user information to `req.user`
 * - Logs authentication events for debugging and monitoring
 *
 * @throws Will pass an AuthenticatedError to the next middleware if the session is invalid or expired
 *
 * @example
 * ```typescript
 * const authMiddleware = createCookieAuthMiddleware(sessionManager, 'sessionId', logger);
 * app.use(authMiddleware);
 * ```
 */

export function createCookieAuthMiddleware(sessionManager: ISessionManager, sessionCookieName: string, logger: ILogger): RequestHandler {
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

			req.session = {
				sessionId: session.sessionId,
				userId: session.userId,
				accessToken: session.accessToken,
				refreshToken: session.refreshToken ?? null,
				tokenType: session.tokenType,
				expiresAt: session.expiresAt,
			};

			req.user = {
				sub: session.userId,
				userId: session.userId,
			} as any;

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
