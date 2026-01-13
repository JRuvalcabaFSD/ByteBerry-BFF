import { randomUUID } from 'crypto';

import { IUuid } from '@interfaces';
import { Injectable } from '@shared';

/**
 * Service for generating and validating UUIDs (Universally Unique Identifiers).
 *
 * This service implements the IUuid interface and provides functionality to:
 * - Generate RFC 4122 version 4 compliant UUIDs
 * - Validate UUID strings against the UUID v4 format
 *
 * @remarks
 * The validation regex ensures that UUIDs conform to the version 4 format with proper
 * variant bits (8, 9, a, or b in the appropriate position).
 *
 * @example
 * ```typescript
 * const uuidService = new UuidService();
 * const newUuid = uuidService.generate();
 * const isValid = uuidService.isValid(newUuid); // true
 * ```
 */

@Injectable({ name: 'Uuid' })
export class UuidService implements IUuid {
	private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	/**
	 * Generates a random UUID (Universally Unique Identifier) string.
	 *
	 * @returns A randomly generated UUID string in the standard format (e.g., "123e4567-e89b-12d3-a456-426614174002")
	 */

	public generate(): string {
		return randomUUID();
	}

	/**
	 * Validates whether the provided string is a valid UUID format.
	 *
	 * @param uuid - The string to validate as a UUID
	 * @returns `true` if the string matches the UUID format, `false` otherwise
	 *
	 * @example
	 * ```typescript
	 * isValid('123e4567-e89b-12d3-a456-426614174002'); // returns true
	 * isValid('invalid-uuid'); // returns false
	 * ```
	 */

	public isValid(uuid: string): boolean {
		return typeof uuid === 'string' && this.UUID_REGEX.test(uuid);
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
			message: 'Uuid service is available and operational',
		};
	}
}
