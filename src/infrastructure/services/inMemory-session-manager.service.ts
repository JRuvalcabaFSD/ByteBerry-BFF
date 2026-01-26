import { SessionData } from '@domain';
import { Injectable, LogContextClass, LogContextMethod, SESSION_CLEANUP_INTERVAL_MS, TOKEN_REFRESH_THRESHOLD_MS } from '@shared';
import type { IClock, IConfig, ILogger, ISessionManager, IUuid, TokenData } from '@interfaces';

/**
 * In-memory implementation of the session manager service.
 *
 * This service manages user sessions stored in memory using a Map. It handles session creation,
 * retrieval, updates, and destruction, with automatic cleanup of expired sessions based on token
 * expiry and a configurable maximum session age. A background cleanup job runs periodically to
 * remove expired sessions.
 *
 * @implements {ISessionManager}
 */

@LogContextClass()
@Injectable({ name: 'SessionManager', depends: ['Uuid', 'Clock', 'Logger'] })
export class InMemorySessionManagerService implements ISessionManager {
	private readonly sessions: Map<string, SessionData> = new Map();
	private readonly sessionMaxAge: number;
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor(
		config: IConfig,
		private readonly uuid: IUuid,
		private readonly clock: IClock,
		private readonly logger: ILogger
	) {
		this.sessionMaxAge = config.sessionMaxAge;
		this.startCleanupJob();

		this.logger.info('SessionManager initialized', {
			sessionMaxAge: this.sessionMaxAge,
			cleanupInterval: SESSION_CLEANUP_INTERVAL_MS,
		});
	}

	/**
	 * Creates a new session for the given user with the provided token data.
	 * Generates a unique session ID, calculates the expiration time based on the token's expires_in value,
	 * stores the session data in memory, logs the creation, and returns the session ID.
	 *
	 * @param userId - The unique identifier of the user for whom the session is being created.
	 * @param tokens - The token data containing access token, refresh token, token type, and expiration time.
	 * @returns The generated session ID as a string.
	 */

	@LogContextMethod()
	public createSession(userId: string, tokens: TokenData): string {
		const sessionId = this.uuid.generate();
		const now = this.clock.timestamp();
		const expiresAt = now + tokens.expires_in * 1000;

		const session: SessionData = {
			sessionId,
			userId,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			tokenType: tokens.token_type,
			expiresAt,
			createdAt: now,
			lastActivityAt: now,
		};

		this.sessions.set(sessionId, session);

		this.logger.info('Session created', {
			sessionId,
			userId,
			expiresAt: new Date(expiresAt).toISOString(),
		});

		return sessionId;
	}

	/**
	 * Retrieves the session data for the given session ID.
	 * If the session does not exist or has expired, it returns null.
	 * Expired sessions are automatically removed from storage.
	 * @param sessionId - The unique identifier of the session.
	 * @returns The session data if found and not expired, otherwise null.
	 */

	@LogContextMethod()
	public getSession(sessionId: string): SessionData | null {
		const session = this.sessions.get(sessionId);

		if (!session) {
			this.logger.debug('Session not found', { sessionId });
			return null;
		}

		if (this.isSessionExpired(session)) {
			this.logger.debug('Session expired', { sessionId, userId: session.userId });
			this.sessions.delete(sessionId);
			return null;
		}

		return session;
	}

	/**
	 * Updates the session with new token data if the session exists.
	 * Refreshes the access token, refresh token, token type, expiration time, and last activity timestamp.
	 * Logs a warning if the session does not exist and returns false.
	 * Logs debug information on successful update.
	 * @param sessionId - The unique identifier of the session to update.
	 * @param tokens - The new token data containing access_token, refresh_token, token_type, and expires_in.
	 * @returns true if the session was successfully updated, false if the session does not exist.
	 */

	@LogContextMethod()
	public updateSession(sessionId: string, tokens: TokenData): boolean {
		const session = this.sessions.get(sessionId);

		if (!session) {
			this.logger.warn('Attempted to update non-existent session', { sessionId });
			return false;
		}

		const now = this.clock.timestamp();
		const expiresAt = now + tokens.expires_in * 1000;

		session.accessToken = tokens.access_token;
		session.refreshToken = tokens.refresh_token;
		session.tokenType = tokens.token_type;
		session.expiresAt = expiresAt;
		session.lastActivityAt = now;

		this.logger.debug('Session tokens refreshed', {
			sessionId,
			userId: session.userId,
			expiresAt: new Date(expiresAt).toISOString(),
		});

		return true;
	}

	/**
	 * Updates the last activity timestamp for the specified session.
	 * If the session exists, its `lastActivityAt` property is set to the current timestamp.
	 * @param sessionId - The unique identifier of the session to update.
	 */

	public touchSession(sessionId: string): void {
		const session = this.sessions.get(sessionId);

		if (session) {
			session.lastActivityAt = this.clock.timestamp();
		}
	}

	/**
	 * Destroys a session by its ID.
	 * @param sessionId - The unique identifier of the session to destroy.
	 * @returns `true` if the session was successfully destroyed, `false` if the session does not exist.
	 */

	@LogContextMethod()
	public destroySession(sessionId: string): boolean {
		const session = this.sessions.get(sessionId);

		if (!session) {
			this.logger.debug('Attempted to destroy non-existent session', { sessionId });
			return false;
		}

		this.sessions.delete(sessionId);
		this.logger.info('Session destroyed', {
			sessionId,
			userId: session.userId,
		});

		return true;
	}

	/**
	 * Determines if the session with the given ID needs to be refreshed based on its expiry time.
	 * @param sessionId - The unique identifier of the session to check.
	 * @returns True if the session exists and its remaining time before expiry is less than the refresh threshold, false otherwise.
	 */

	public needsRefresh(sessionId: string): boolean {
		const session = this.sessions.get(sessionId);

		if (!session) return false;

		const now = this.clock.timestamp();
		const timeUnitExpiry = session.expiresAt - now;

		return timeUnitExpiry < TOKEN_REFRESH_THRESHOLD_MS;
	}

	/**
	 * Gets the number of active sessions.
	 * @returns The count of sessions.
	 */

	public getSessionCount(): number {
		return this.sessions.size;
	}
	/**
	 * Cleans up expired sessions from the in-memory store.
	 * Iterates through all sessions, removes those that are expired,
	 * and logs the cleanup process.
	 * @returns The number of expired sessions that were cleaned up.
	 */

	@LogContextMethod()
	public cleanupExpiredSession(): number {
		const before = this.sessions.size;

		for (const [sessionId, session] of this.sessions.entries()) {
			if (this.isSessionExpired(session)) {
				this.sessions.delete(sessionId);
				this.logger.debug('Expired session cleaned up', {
					sessionId,
					userId: session.userId,
				});
			}
		}

		const cleaned = before - this.sessions.size;

		if (cleaned > 0) {
			this.logger.info('Session cleanup completed', {
				cleaned,
				remaining: this.sessions.size,
			});
		}

		return cleaned;
	}

	/**
	 * Starts a periodic cleanup job that removes expired sessions at regular intervals.
	 * The job runs every {@link SESSION_CLEANUP_INTERVAL_MS} milliseconds and logs the start event.
	 */

	@LogContextMethod()
	private startCleanupJob(): void {
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpiredSession();
		}, SESSION_CLEANUP_INTERVAL_MS);

		this.cleanupInterval.unref();
		this.logger.debug('Session cleanup job started', {
			intervalMs: SESSION_CLEANUP_INTERVAL_MS,
		});
	}

	/**
	 * Checks if a session is expired based on its expiration time or maximum age.
	 * A session is considered expired if the current timestamp is greater than or equal to the session's expiresAt,
	 * or if the session's age (current timestamp minus createdAt) is greater than or equal to the sessionMaxAge.
	 * @param session The session data to evaluate.
	 * @returns True if the session is expired, false otherwise.
	 */

	private isSessionExpired(session: SessionData): boolean {
		const now = this.clock.timestamp();

		if (session.expiresAt <= now) return true;

		const sessionAge = now - session.createdAt;
		if (sessionAge >= this.sessionMaxAge) return true;

		return false;
	}
}
