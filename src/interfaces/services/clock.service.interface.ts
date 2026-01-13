import { HealthCheckable } from './health.service.interface.js';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		Clock: IClock;
	}
}

/**
 * Represents a clock service that provides time-related utilities.
 *
 * @interface IClock
 *
 * @remarks
 * This interface defines a contract for services that need to provide
 * time information in various formats. It's useful for testing scenarios
 * where time needs to be mocked or controlled.
 *
 * @method now - Returns the current date and time as a Date object.
 * @method timestamp - Returns the current time as a Unix timestamp (number of milliseconds since January 1, 1970).
 * @method isoString - Returns the current date and time as an ISO 8601 formatted string.
 *
 * @example
 * ```typescript
 * class SystemClock implements IClock {
 *   now(): Date {
 *     return new Date();
 *   }
 *
 *   timestamp(): number {
 *     return Date.now();
 *   }
 *
 *   isoString(): string {
 *     return new Date().toISOString();
 *   }
 * }
 * ```
 */

export interface IClock extends HealthCheckable {
	now(): Date;
	timestamp(): number;
	isoString(): string;
}
