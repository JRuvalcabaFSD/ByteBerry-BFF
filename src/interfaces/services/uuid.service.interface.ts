import { HealthCheckable } from './health.service.interface.js';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		Uuid: IUuid;
	}
}

/**
 * Interface for UUID (Universally Unique Identifier) service.
 *
 * Provides methods to generate and validate UUIDs.
 *
 * @interface IUuid
 *
 * @method generate - Generates a new UUID string.
 * @method isValid - Validates if a given string is a valid UUID.
 *
 * @example
 * const uuidService: IUuid = ...;
 * const newUuid = uuidService.generate();
 * const isValid = uuidService.isValid(newUuid);
 */

export interface IUuid extends HealthCheckable {
	generate(): string;
	isValid(uuid: string): boolean;
}
