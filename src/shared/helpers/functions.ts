/**
 * Returns a human-readable error message from an unknown error object.
 *
 * If the provided error is an instance of `Error`, its `message` property is returned.
 * Otherwise, a generic 'Unknown Error' message is returned.
 *
 * @param error - The error object to extract the message from.
 * @returns The error message string.
 */

export function getErrMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Unknown Error';
}

/**
 * Extracts the stack trace from an error object.
 *
 * @param error - The error object to extract the stack trace from. Can be of any type.
 * @returns The stack trace as a string if the error is an instance of Error, otherwise undefined.
 *
 * @example
 * ```ts
 * try {
 *   throw new Error('Something went wrong');
 * } catch (error) {
 *   const stack = getErrStack(error);
 *   console.log(stack);
 * }
 * ```
 */

export function getErrStack(error: unknown): string | undefined {
	if (error instanceof Error) {
		if (error.stack) {
			error.stack = error.stack
				.split('\n') // convert into an array by lines
				.slice(1) // delete the first line
				.join('\n'); // put it back together
		}

		return error.stack;
	}
	return undefined;
}

/**
 * Gets the current UTC timestamp as a formatted string.
 *
 * @returns A string representing the current UTC time in the format "HH:MM:SS.mmm UTC",
 * where HH is hours (00-23), MM is minutes (00-59), SS is seconds (00-59),
 * and mmm is milliseconds (000-999).
 *
 * @example
 * ```ts
 * const timestamp = getUTCTimestamp();
 * console.log(timestamp); // "14:30:45.123 UTC"
 * ```
 */

export function getUTCTimestamp(): string {
	const now = new Date();

	const hh = String(now.getUTCHours()).padStart(2, '0');
	const mm = String(now.getUTCMinutes()).padStart(2, '0');
	const ss = String(now.getUTCSeconds()).padStart(2, '0');
	const ms = String(now.getUTCMilliseconds()).padStart(3, '0');

	return `${hh}:${mm}:${ss}.${ms} UTC`;
}
