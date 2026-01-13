/**
 * Represents the possible categories of errors that can occur within the domain layer.
 *
 * - `'bootstrap'`: Errors related to the application bootstrap process.
 * - `'config'`: Errors related to configuration issues.
 * - `'container'`: Errors related to dependency injection or service container.
 * - `'http'`: Errors related to HTTP requests or responses.
 * - `'domain'`: Errors specific to domain logic or business rules.
 * - `'oauth'`: Errors related to OAuth authentication or authorization.
 */

export type ErrorType = 'bootstrap' | 'config' | 'container' | 'http' | 'domain' | 'oauth';

export class AppError extends Error {
	public readonly errorType: ErrorType;
	public readonly context?: Record<string, unknown>;
	constructor(msg: string, errorType: ErrorType, context?: Record<string, unknown>) {
		super(msg);
		this.name = 'AppError';
		this.errorType = errorType;
		this.context = context;

		Error.captureStackTrace(this, AppError);
	}
}
