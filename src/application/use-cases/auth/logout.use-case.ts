import type { IClock, ILogger, ILogoutUseCase, IOAuthClient, ISessionManager } from '@interfaces';
import { getErrMessage, Injectable, LogContextClass, LogContextMethod, ValidateRequestError } from '@shared';
import { LogoutResponse } from 'src/application/dtos/auth.dto.js';

/**
 * Handles the logout process for a user session.
 *
 * This use case performs the following steps:
 * 1. Validates the provided session ID.
 * 2. Retrieves the session and checks its existence.
 * 3. Attempts to revoke the refresh token with the OAuth2 service (best effort).
 * 4. Destroys the local session.
 * 5. Logs relevant events and returns a logout response.
 *
 * @remarks
 * - If the session does not exist or is expired, a {@link ValidateRequestError} is thrown.
 * - Token revocation failures are logged but do not prevent logout.
 *
 * @param sessionId - The identifier of the session to log out.
 * @returns A {@link LogoutResponse} containing a success message and timestamp.
 *
 * @throws ValidateRequestError If the session ID is missing or the session is not found.
 */

@LogContextClass()
@Injectable({ name: 'LogoutUseCase', depends: ['OAuthClient', 'SessionManager', 'Clock', 'Logger'] })
export class LogoutUseCase implements ILogoutUseCase {
	constructor(
		private readonly oauthClient: IOAuthClient,
		private readonly sessionManager: ISessionManager,
		private readonly clock: IClock,
		private readonly logger: ILogger
	) {}

	/**
	 * Logs out a user by revoking their refresh token and destroying their session.
	 *
	 * This method performs the following steps:
	 * 1. Validates the provided session ID.
	 * 2. Retrieves the session associated with the session ID.
	 * 3. Attempts to revoke the refresh token with the OAuth2 service (best effort).
	 * 4. Destroys the local session.
	 * 5. Logs relevant information and returns a logout response.
	 *
	 * @param sessionId - The ID of the session to log out.
	 * @returns A promise that resolves to a `LogoutResponse` containing a success message and timestamp.
	 * @throws {ValidateRequestError} If the session ID is missing or the session is not found/expired.
	 */

	@LogContextMethod()
	public async execute(sessionId: string): Promise<LogoutResponse> {
		if (!sessionId) throw new ValidateRequestError('No Session found');

		// Get session to retrieve tokens
		const session = this.sessionManager.getSession(sessionId);

		if (!session) {
			this.logger.warn('Logout attempted for non-existent session', { sessionId });
			throw new ValidateRequestError('Session not found or expired');
		}

		// Revoke refresh token with OAuth2 service (best effort)
		try {
			await this.oauthClient.revokeToken(session.refreshToken!, 'refresh token');
			this.logger.info('Refresh token revoked', {
				sessionId,
				userId: session.userId,
			});
		} catch (error) {
			this.logger.warn('Token revocation failed, continuing with logout', {
				sessionId,
				userId: session.userId,
				error: getErrMessage(error),
			});
		}

		// Destroy local session
		this.sessionManager.destroySession(sessionId);

		this.logger.info('User logged out successfully', {
			sessionId,
			userId: session.userId,
		});

		return {
			message: 'Logged out successfully',
			timestamp: this.clock.isoString(),
		};
	}
}
