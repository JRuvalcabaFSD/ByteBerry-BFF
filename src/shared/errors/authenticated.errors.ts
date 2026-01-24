import { AppError } from '@domain';

/**
 * Represents an authentication-related error, extending the base AppError class.
 * This error is typically thrown when authentication or authorization fails,
 * providing structured information including status code, error code, and timestamp.
 *
 * @example
 * ```typescript
 * throw AuthenticatedError.missingAuthHeader();
 * ```
 */

export class AuthenticatedError extends AppError {
	public readonly statusCode: number = 401;
	public readonly code: string;
	public readonly timestamp: Date;

	/**
	 * Creates a new AuthenticatedError instance.
	 *
	 * @param msg - The error message describing the issue.
	 * @param code - The error code (default: 'Authentication Error').
	 * @param statusCode - The HTTP status code (default: 401).
	 */

	constructor(msg: string, code: string = 'Authentication Error', statusCode: number = 401) {
		super(msg, 'oauth');
		this.name = 'AuthenticatedError';
		this.code = code;
		this.statusCode = statusCode;
		this.timestamp = new Date();

		Error.captureStackTrace(this, this.constructor);
	}

	/**
	 * Converts the error to a JSON-serializable object.
	 *
	 * @returns An object containing error details.
	 */

	public toJSON(): Record<string, unknown> {
		return {
			error: this.code,
			message: this.message,
			timestamp: this.timestamp.toISOString(),
			statusCode: this.statusCode,
		};
	}

	/**
	 * Creates an AuthenticatedError for a missing authorization header.
	 *
	 * @returns A new AuthenticatedError instance.
	 */

	public static missingAuthHeader(): AuthenticatedError {
		return new AuthenticatedError('Authorization header is required', 'Missing AuthHeader');
	}

	/**
	 * Creates an AuthenticatedError for an invalid token format.
	 *
	 * @returns A new AuthenticatedError instance.
	 */

	public static invalidTokenFormat(): AuthenticatedError {
		return new AuthenticatedError('Invalid token format', 'Invalid Token Format');
	}

	/**
	 * Creates an AuthenticatedError for an expired token.
	 *
	 * @returns A new AuthenticatedError instance.
	 */

	public static tokenExpired(): AuthenticatedError {
		return new AuthenticatedError('Token has expired', 'Token Expired');
	}

	/**
	 * Creates an AuthenticatedError for insufficient scope/permissions.
	 *
	 * @param requiredScope - The required scope that was not met.
	 * @returns A new AuthenticatedError instance with status code 403.
	 */

	public static insufficientScope(requiredScope: string): AuthenticatedError {
		return new AuthenticatedError(`Insufficient permissions. Required scope: ${requiredScope}`, 'Insufficient Scope', 403);
	}
}
