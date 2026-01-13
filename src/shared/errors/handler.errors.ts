/* eslint-disable no-console */
import { AppError } from '@domain';
import { ConfigError, getErrMessage, getErrStack, getUTCTimestamp } from '@shared';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Colors = { Red: '\x1b[31m', Yellow: '\x1b[33m', Bold: '\x1b[1m', Reset: '\x1b[0m' };

const HANDLERS = new Map<string, (error: any) => void>([
	[
		'config',
		(error: ConfigError) => {
			const logMessage = getMessage(error, 'Config error');
			console.error(logMessage);
		},
	],
]);

/**
 * Default error handler that logs internal server errors to the console.
 *
 * @param error - The error object to be handled. Can be of any type.
 *
 * @remarks
 * This function processes errors by:
 * - Categorizing them as "Internal Server Error"
 * - Generating a UTC timestamp
 * - Extracting the error message using `getErrMsg`
 * - Logging the formatted error to the console with the ByteBerry-BFF namespace
 *
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (error) {
 *   defaultHandler(error);
 * }
 * ```
 */

const defaultHandler = (error: any) => {
	const type = 'Internal Server Error';
	const timestamp = getUTCTimestamp();
	const message = getErrMessage(error);
	console.log(`${timestamp} [ByteBerry-BFF] ${type}: ${message}`);
};

export function handledServicesError(error: any): void {
	const err = error as any;
	const handler = (err.errorType && HANDLERS.get(err.errorType)) || defaultHandler;

	handler(error);
}

function getMessage(error: AppError, type: string): string {
	const timestamp = getUTCTimestamp();
	const isDevelopment = process.env.NODE_ENV === 'development';
	let logMessage = `${timestamp} [ByteBerry-BFF] ${Colors.Red}${Colors.Bold}${type ?? 'Error'}:${Colors.Reset} ${error.message}`;

	// Just add context in development
	if (isDevelopment && error.context) {
		logMessage += `\n${JSON.stringify(error.context, null, 2)}`;
	}

	// Just add stack in development
	if (isDevelopment) {
		const stack = getErrStack(error);
		if (stack) {
			logMessage += `\n${stack}`;
		}
	}
	return logMessage;
}
