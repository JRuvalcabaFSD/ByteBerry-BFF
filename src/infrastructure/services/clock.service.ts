import { IClock } from '@interfaces';
import { Injectable } from '@shared';

/**
 * Service that provides clock-related functionality for timestamp and date operations.
 * Implements the IClock interface to abstract date/time operations.
 *
 * @remarks
 * This service provides methods to retrieve current time in different formats:
 * - Date object
 * - Unix timestamp (milliseconds)
 * - ISO 8601 string format
 *
 * @example
 * ```typescript
 * const clock = new ClockService();
 * const currentDate = clock.now();
 * const timestamp = clock.timestamp();
 * const isoString = clock.isoString();
 * ```
 */

@Injectable({ name: 'Clock' })
export class ClockService implements IClock {
	/**
	 * Returns the current date and time.
	 *
	 * @returns {Date} A new Date object representing the current moment in time.
	 */

	public now(): Date {
		return new Date();
	}
	/**
	 * Returns the current timestamp in milliseconds since the Unix epoch (January 1, 1970 00:00:00 UTC).
	 *
	 * @returns The current time in milliseconds.
	 *
	 * @example
	 * ```typescript
	 * const clock = new ClockService();
	 * const now = clock.timestamp();
	 * console.log(now); // 1678901234567
	 * ```
	 */

	public timestamp(): number {
		return Date.now();
	}

	/**
	 * Returns the current date and time as an ISO 8601 formatted string.
	 *
	 * @returns A string representation of the current date and time in ISO 8601 format (e.g., "2023-12-25T10:30:00.000Z")
	 *
	 * @example
	 * ```typescript
	 * const clock = new ClockService();
	 * const timestamp = clock.isoString();
	 * console.log(timestamp); // "2023-12-25T10:30:00.000Z"
	 * ```
	 */

	public isoString(): string {
		return new Date().toISOString();
	}

	/**
	 * Checks the health status of the IClock service.
	 *
	 * @returns A promise that resolves to an object indicating the health status (`'healthy'` or `'unhealthy'`)
	 *          and an optional message describing the service state.
	 */

	public async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
		return {
			status: 'healthy',
			message: 'Clock service is available and operational',
		};
	}
}
