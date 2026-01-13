import { AppError, ErrorType } from '@domain';

/**
 * Represents a validation or HTTP error for a specific field.
 *
 * @property field - The name of the field associated with the error.
 * @property msg - The error message describing the issue.
 */

export type ErrorList = { field: string; msg: string | string[] };

/**
 * Represents an HTTP-specific error that extends the base `AppError` class.
 * Includes additional properties such as HTTP status code, error cause, and an optional list of errors.
 *
 * @extends AppError
 *
 * @property {number} statusCode - The HTTP status code associated with the error.
 * @property {string} errorCause - A string describing the cause of the error.
 * @property {ErrorList[] | null} errorList - An optional array of error details, or null if not provided.
 *
 * @constructor
 * @param {string} msg - The error message.
 * @param {ErrorType} type - The type of the error.
 * @param {string} cause - The cause of the error.
 * @param {number} statusCode - The HTTP status code.
 * @param {ErrorList[]} [errorList] - Optional list of error details.
 *
 * @method toJSON
 * Serializes the error to a JSON object containing the error cause, message, status code, and error list.
 * @returns {{ error: string; message: string; statusCode: number; errorList: ErrorList[] | null }}
 */

export class HttpError extends AppError {
	public readonly statusCode: number;
	public readonly errorCause: string;
	public readonly errorList: ErrorList[] | null;

	constructor(msg: string, type: ErrorType, cause: string, statusCode: number, errorList?: ErrorList[]) {
		super(msg, type);
		this.statusCode = statusCode;
		this.name = 'HttpError';
		this.errorCause = cause;
		this.statusCode = statusCode;
		this.errorList = errorList ?? null;

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, HttpError);
		}
	}

	public toJSON(): { error: string; message: string; statusCode: number; errorList?: ErrorList[] | null } {
		return {
			error: this.errorCause,
			message: this.message,
			statusCode: this.statusCode,
			...(this.errorList && { errorList: this.errorList }),
		};
	}
}

/**
 * Represents an HTTP error thrown when a request's origin is not allowed by CORS policy.
 *
 * @extends HttpError
 *
 * @property {string} origin - The origin that triggered the CORS error.
 *
 * @example
 * throw new CorsOriginError('https://example.com');
 */

export class CorsOriginError extends HttpError {
	public readonly origin: string;

	constructor(origin: string) {
		let msg: string;
		if (origin) {
			msg = `Origin ${origin} not allowed by CORS`;
		} else {
			msg = 'Not allowed by CORS';
		}

		super(msg, 'http', 'Invalid Cors', 200);
		this.origin = origin;
		this.name = 'CorsOriginError';

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, CorsOriginError);
		}
	}
}

/**
 * Represents an HTTP error thrown when request validation fails.
 * Extends the {@link HttpError} class to provide additional context for invalid request data.
 *
 * @remarks
 * This error is typically used to indicate that the incoming request data does not meet
 * the expected validation criteria. It sets the HTTP status code to 400 (Bad Request).
 *
 * @example
 * ```typescript
 * throw new ValidateRequestError('Invalid email address', [{ field: 'email', message: 'Email is not valid' }]);
 * ```
 *
 * @param msg - A descriptive error message.
 * @param errorList - An optional array of validation error details.
 */

export class ValidateRequestError extends HttpError {
	constructor(msg: string, errorList?: ErrorList[]) {
		super(msg, 'http', 'Invalid request data', 400, errorList);
		this.name = 'ValidateRequest';

		Error.captureStackTrace(this, ValidateRequestError);
	}
}

/**
 * Represents an HTTP error thrown when an invalid authorization code is encountered
 * during the BFF authentication process.
 *
 * @remarks
 * This error extends the {@link HttpError} class and is typically used to indicate
 * that the provided authorization code is invalid or has expired.
 *
 * @example
 * ```typescript
 * throw new InvalidCodeError('The provided code is invalid or expired.');
 * ```
 *
 * @public
 */

export class InvalidCodeError extends HttpError {
	constructor(msg: string) {
		super(msg, 'oauth', 'Invalid code', 401);

		this.name = 'InvalidCodeError';

		Error.captureStackTrace(this, InvalidCodeError);
	}
}

/**
 * Represents an HTTP 401 Unauthorized error caused by an invalid token during OAuth authentication.
 *
 * @remarks
 * This error should be thrown when a provided token is invalid, expired, or otherwise fails validation.
 *
 * @example
 * ```typescript
 * throw new InvalidTokenError('The provided access token is invalid or expired.');
 * ```
 *
 * @extends HttpError
 */

export class InvalidTokenError extends HttpError {
	constructor(msg: string) {
		super(msg, 'oauth', 'Invalid token', 401);

		this.name = 'InvalidTokenError';

		Error.captureStackTrace(this, InvalidTokenError);
	}
}

/**
 * Error thrown when an invalid creation token is encountered during an OAuth-related operation.
 *
 * @extends HttpError
 * @remarks
 * This error is specific to the 'oauth' domain and indicates issues with the provided creation token.
 *
 * @param msg - The error message describing the invalid token.
 * @param statusCode - The HTTP status code associated with this error.
 *
 * @example
 * throw new InvalidCreationTokenError('Token is malformed', 400);
 */

export class InvalidCreationTokenError extends HttpError {
	constructor(msg: string) {
		super(msg, 'oauth', 'Creation token', 400);
		this.name = 'InvalidCreationTokenError';

		Error.captureStackTrace(this, InvalidClientError);
	}
}

/**
 * Represents an HTTP 401 error indicating an invalid OAuth client.
 *
 * This error should be thrown when a client attempting to authenticate
 * with the OAuth server is not recognized or fails client validation.
 *
 * @extends HttpError
 * @example
 * throw new InvalidClient('Client credentials are invalid.');
 */

export class InvalidClientError extends HttpError {
	constructor(msg: string) {
		super(msg, 'oauth', 'Invalid client', 401);

		this.name = 'InvalidClientError';

		Error.captureStackTrace(this, InvalidClientError);
	}
}

/**
 * Represents an HTTP 401 Unauthorized error indicating that the user is invalid.
 *
 * @remarks
 * This error should be thrown when authentication fails due to an invalid user.
 *
 * @example
 * ```typescript
 * throw new InvalidUser('User credentials are not valid');
 * ```
 *
 * @extends HttpError
 * @param msg - A descriptive error message.
 */

export class InvalidUser extends HttpError {
	constructor(msg: string) {
		super(msg, 'oauth', 'Invalid user', 401);

		this.name = 'InvalidUser';

		Error.captureStackTrace(this, InvalidUser);
	}
}

/**
 * Represents an HTTP 401 Unauthorized error thrown when user credentials are invalid.
 *
 * Typically used during authentication processes to indicate that the provided credentials
 * (such as username or password) are incorrect.
 *
 * @extends HttpError
 * @example
 * throw new InvalidCredentialsError('Incorrect username or password');
 */

export class InvalidCredentialsError extends HttpError {
	constructor(msg: string) {
		super(msg, 'http', 'Invalid credentials', 401);

		this.name = 'InvalidCredentialsError';

		Error.captureStackTrace(this, InvalidCredentialsError);
	}
}

/**
 * Represents an HTTP error that occurs during the login process.
 *
 * Extends the {@link HttpError} class to provide a specific error type for failed login attempts.
 *
 * @example
 * throw new LoginError('Invalid credentials');
 *
 * @remarks
 * This error sets the HTTP status code to 401 (Unauthorized) and includes a default error context of 'login'.
 *
 * @param msg - The error message describing the reason for the login failure.
 */

export class LoginError extends HttpError {
	constructor(msg: string) {
		super(msg, 'http', 'Login failed', 401);
		this.name = 'LoginError';

		Error.captureStackTrace(this, LoginError);
	}
}

/**
 * Represents an HTTP error indicating that the user's session is invalid.
 *
 * This error should be thrown when a user's session is no longer valid,
 * such as when their authentication token has expired or been revoked.
 *
 * @extends HttpError
 *
 * @example
 * throw new InvalidSessionError('Session has expired');
 */

export class InvalidSessionError extends HttpError {
	constructor(msg: string) {
		super(msg, 'http', 'Invalid session', 401);

		this.name = 'InvalidSessionError';

		Error.captureStackTrace(this, InvalidSessionError);
	}
}

/**
 * Represents an HTTP error thrown when an invalid RSA key is encountered.
 *
 * This error extends {@link HttpError} and sets the HTTP status code to 500,
 * indicating a server-side error related to RSA key validation.
 *
 * @example
 * ```typescript
 * throw new InvalidRSAError('The provided RSA key is invalid.');
 * ```
 *
 * @param msg - A descriptive error message explaining the RSA validation failure.
 */

export class InvalidRSAError extends HttpError {
	constructor(msg: string) {
		super(msg, 'oauth', 'Server error', 500);
		this.name = 'InvalidRSAError';

		Error.captureStackTrace(this, InvalidRSAError);
	}
}

/**
 * Represents an HTTP 404 error indicating that a requested record was not found.
 *
 * @extends HttpError
 * @example
 * throw new NotFoundRecordError('User not found');
 */

export class NotFoundRecordError extends HttpError {
	constructor(msg: string) {
		super(msg, 'http', 'No found record', 404);
		this.name = 'NotFoundRecordError';

		Error.captureStackTrace(this, NotFoundRecordError);
	}
}

export class ForbiddenError extends HttpError {
	constructor(msg: string) {
		super(msg, 'http', 'Forbidden', 403);
		this.name = 'ForbiddenError';

		Error.captureStackTrace(this, ForbiddenError);
	}
}
