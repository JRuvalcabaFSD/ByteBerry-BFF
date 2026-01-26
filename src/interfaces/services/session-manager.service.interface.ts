import { SessionData } from '@domain';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		SessionManager: ISessionManager;
	}
}

/**
 * Represents the structure of authentication token data.
 *
 * @property access_token - The access token used for authenticating API requests.
 * @property refresh_token - The token used to obtain a new access token when the current one expires.
 * @property token_type - The type of the token, typically "Bearer".
 * @property expires_in - The duration (in seconds) until the access token expires.
 */

export interface TokenData {
	access_token: string;
	refresh_token: string | null;
	token_type: string;
	expires_in: number;
}

/**
 * Interface for managing user sessions in the application.
 *
 * This interface provides methods to create, retrieve, update, and manage user sessions,
 * including token handling, session expiration, and cleanup operations.
 *
 * @interface ISessionManager
 */

export interface ISessionManager {
	/**
	 * Creates a new session for the specified user with the given token data.
	 *
	 * @param userId - The unique identifier of the user for whom the session is being created.
	 * @param tokens - The token data containing access and refresh tokens.
	 * @returns The unique session ID as a string.
	 */
	createSession(userId: string, tokens: TokenData): string;

	/**
	 * Retrieves the session data associated with the given session ID.
	 *
	 * @param sessionId - The unique identifier of the session to retrieve.
	 * @returns The session data if found, or null if the session does not exist or has expired.
	 */
	getSession(sessionId: string): SessionData | null;

	/**
	 * Updates the token data for an existing session.
	 *
	 * @param sessionId - The unique identifier of the session to update.
	 * @param tokens - The new token data to associate with the session.
	 * @returns True if the session was successfully updated, false otherwise (e.g., session not found).
	 */
	updateSession(sessionId: string, tokens: TokenData): boolean;

	/**
	 * Touches (updates the last access time) of the specified session to prevent expiration.
	 *
	 * @param sessionId - The unique identifier of the session to touch.
	 */
	touchSession(sessionId: string): void;

	/**
	 * Destroys the session associated with the given session ID.
	 *
	 * @param sessionId - The unique identifier of the session to destroy.
	 * @returns True if the session was successfully destroyed, false otherwise (e.g., session not found).
	 */
	destroySession(sessionId: string): boolean;

	/**
	 * Checks if the session needs to be refreshed based on token expiration.
	 *
	 * @param sessionId - The unique identifier of the session to check.
	 * @returns True if the session needs refresh, false otherwise.
	 */
	needsRefresh(sessionId: string): boolean;

	/**
	 * Gets the total number of active sessions.
	 *
	 * @returns The count of active sessions.
	 */
	getSessionCount(): number;

	/**
	 * Cleans up expired sessions and returns the number of sessions cleaned up.
	 *
	 * @returns The number of expired sessions that were removed.
	 */
	cleanupExpiredSession(): number;
}
