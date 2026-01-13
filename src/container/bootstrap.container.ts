/**
 * Bootstrap the application container by importing all necessary modules
 * and initializing the dependency injection container.
 * @module src/container/bootstrap.container
 */
// import '@application';
import '@config';
// import '@bootstrap';
import '@infrastructure';
import '@presentation';

import { AppError } from '@domain';
import { Container } from './container.js';
import { IContainer, Token } from '@interfaces';
import { autoRegister, ContainerCreationError } from '@shared';

/**
 * List of service tokens that are considered essential for the application's startup.
 * These services must be initialized before other dependencies to ensure proper configuration and operation.
 *
 * @remarks
 * The tokens in this array represent critical dependencies, such as configuration or environment services,
 * that must be available early in the application's lifecycle.
 *
 * @example
 * // Accessing critical services during bootstrap
 * criticalServices.forEach(token => container.resolve(token));
 */
export const criticalServices: Token[] = ['Clock', 'Config', 'Logger', 'Uuid', 'HttpServer'];

/**
 * Initializes and configures the application's dependency injection container.
 *
 * This function creates a new instance of the container, automatically registers
 * all required services, validates the presence of critical services, and returns
 * the fully configured container instance.
 *
 * @returns {IContainer} The initialized and validated dependency injection container.
 */
export function bootstrapContainer(): IContainer {
	const container = new Container();

	autoRegister(container);

	validate(container, criticalServices);

	return container;
}

/**
 * Validates that all provided service tokens are registered and can be resolved in the given container.
 *
 * @param c - The dependency injection container to validate against.
 * @param services - An array of service tokens to check for registration and resolvability.
 * @throws {ContainerCreationError} If a token is not registered or cannot be resolved (unless the error is an instance of AppError).
 * @throws {AppError} If resolving a token throws an AppError, it is re-thrown as is.
 */

export function validate(c: IContainer, services: Token[]) {
	services.forEach((token) => {
		if (!c.isRegistered(token)) throw new ContainerCreationError(token);

		try {
			c.resolve(token);
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new ContainerCreationError(token);
		}
	});
}
