import * as Errors from '@shared';
import { IContainer, Lifecycle, Token } from '@interfaces';
import { ServiceMap } from '@ServiceMap';

/**
 * Represents the registration details for a service within the container.
 *
 * @typeParam K - The key of the service in the `ServiceMap`.
 * @property factory - A function that receives the container and returns an instance of the service.
 * @property lifecycle - The lifecycle management strategy for the service (e.g., singleton, transient).
 * @property [instance] - Optionally holds the instantiated service, depending on the lifecycle.
 */

interface ServiceRegistration<K extends keyof ServiceMap> {
	factory: (container: IContainer) => ServiceMap[K];
	lifecycle: Lifecycle;
	instance?: ServiceMap[K];
}

/**
 * Dependency Injection Container for managing service registrations and resolutions.
 *
 * The `Container` class implements the `IContainer` interface and provides methods to:
 * - Register services as transient, singleton, or as a specific instance.
 * - Resolve services by their token, handling singleton instantiation and circular dependencies.
 * - Check if a service is registered.
 *
 * Features:
 * - Throws errors for duplicate registrations, unregistered tokens, and circular dependencies.
 * - Supports singleton and transient lifecycles.
 * - Maintains a resolution stack to detect and prevent circular dependencies.
 *
 * @template ServiceMap - A mapping of service tokens to their corresponding types.
 * @template Token - The type used as a key for service registration and resolution.
 *
 * @example
 * ```typescript
 * const container = new Container();
 * container.register('serviceA', c => new ServiceA());
 * container.registerSingleton('serviceB', c => new ServiceB(c.resolve('serviceA')));
 * const serviceB = container.resolve('serviceB');
 * ```
 */

export class Container implements IContainer {
	private readonly services = new Map<Token, ServiceRegistration<Token>>();
	private readonly resolutionStack: Token[] = [];

	/**
	 * Registers a service factory in the container with the specified token.
	 *
	 * @typeParam K - The key of the service in the ServiceMap.
	 * @param token - The unique identifier for the service to register.
	 * @param factory - A factory function that receives the container and returns an instance of the service.
	 * @throws {Errors.TokenAlreadyRegisteredError} If the token has already been registered.
	 *
	 * @remarks
	 * The registered service will have a 'transient' lifecycle, meaning a new instance will be created each time it is resolved.
	 */

	public register<K extends keyof ServiceMap>(token: K, factory: (container: IContainer) => ServiceMap[K]): void {
		if (this.services.has(token)) throw new Errors.TokenAlreadyRegisteredError(token);
		this.services.set(token, { factory, lifecycle: 'transient' });
	}

	/**
	 * Registers a singleton service in the container.
	 *
	 * @typeParam K - The key of the service in the ServiceMap.
	 * @param token - The unique token identifying the service.
	 * @param factory - A factory function that creates an instance of the service.
	 * @throws {Errors.TokenAlreadyRegisteredError} If the token has already been registered.
	 *
	 * @remarks
	 * The service will be instantiated only once and the same instance will be returned for subsequent resolutions.
	 */

	public registerSingleton<K extends keyof ServiceMap>(token: K, factory: (container: IContainer) => ServiceMap[K]): void {
		if (this.services.has(token)) throw new Errors.TokenAlreadyRegisteredError(token);
		this.services.set(token, { factory, lifecycle: 'singleton' });
	}

	/**
	 * Registers a pre-existing instance of a service in the container.
	 *
	 * @typeParam K - The key of the service in the ServiceMap.
	 * @param token - The unique token identifying the service.
	 * @param instance - The instance of the service to register.
	 * @throws {Errors.TokenAlreadyRegisteredError} If a service with the given token is already registered.
	 */

	public registerInstance<K extends keyof ServiceMap>(token: K, instance: ServiceMap[K]): void {
		if (this.services.has(token)) throw new Errors.TokenAlreadyRegisteredError(token);
		this.services.set(token, { factory: () => instance, lifecycle: 'singleton', instance });
	}

	/**
	 * Resolves and returns an instance of the requested service by its token.
	 *
	 * @typeParam K - The key of the service in the `ServiceMap`.
	 * @param token - The token identifying the service to resolve.
	 * @returns The resolved service instance of type `ServiceMap[K]`.
	 *
	 * @throws {Errors.TokenNotRegisteredError} If the token is not registered in the container.
	 * @throws {Errors.CircularDependencyError} If a circular dependency is detected during resolution.
	 * @throws {Errors.ConfigError} If a configuration error occurs during service instantiation.
	 * @throws {Errors.ContainerError} If any other error occurs during service resolution.
	 *
	 * @remarks
	 * - If the service is registered as a singleton and an instance already exists, the cached instance is returned.
	 * - The method manages a resolution stack to detect and prevent circular dependencies.
	 * - Any errors thrown by the factory are wrapped in a `ContainerError`, except for known error types.
	 */

	public resolve<K extends keyof ServiceMap>(token: K): ServiceMap[K] {
		const registration = this.services.get(token);

		if (!registration) throw new Errors.TokenNotRegisteredError(token);
		if (this.resolutionStack.includes(token)) throw new Errors.CircularDependencyError(this.resolutionStack, token);
		if (registration.lifecycle === 'singleton' && registration.instance !== undefined) return registration.instance as ServiceMap[K];

		this.resolutionStack.push(token);

		try {
			const instance = registration.factory(this);
			if (registration.lifecycle === 'singleton') {
				registration.instance = instance;
			}

			return instance as ServiceMap[K];
		} catch (error) {
			if (error instanceof Errors.ConfigError) throw error;
			if (error instanceof Errors.CircularDependencyError) throw error;
			throw new Errors.ContainerError(`Failed to resolve service '${token}': ${Errors.getErrMessage(error)}`, token);
		} finally {
			this.resolutionStack.pop();
		}
	}

	/**
	 * Checks whether a service with the specified token is registered in the container.
	 *
	 * @param token - The key representing the service in the ServiceMap.
	 * @returns `true` if the service is registered; otherwise, `false`.
	 */

	public isRegistered(token: keyof ServiceMap): boolean {
		return this.services.has(token);
	}
}
