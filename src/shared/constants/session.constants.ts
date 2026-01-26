/**
 * The time threshold in milliseconds before a token's expiration
 * at which the system should attempt to refresh the token.
 *
 * Currently set to 5 minutes (5 * 60 * 1000 ms).
 */

export const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Specifies the default length for randomly generated strings used in session management.
 * This value is typically used for generating secure tokens or identifiers.
 *
 * @remarks
 * A length of 64 characters provides a high level of entropy, making it suitable for cryptographic purposes.
 */

export const RANDOM_STRING_LENGTH = 64;

/**
 * The interval, in milliseconds, at which session cleanup tasks are performed.
 *
 * This constant is set to 10 minutes (10 * 60 * 1000 ms).
 * It is typically used to schedule periodic cleanup of expired or inactive sessions.
 */

export const SESSION_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
