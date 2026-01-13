/* eslint-disable @typescript-eslint/no-explicit-any */
import { ServiceMap } from '@ServiceMap';
import { InjectableError } from '@shared';
import { Constructor, injectableRegistry } from './registry.js';
import { HealthCheckable, IContainer, Lifecycle, Token } from '@interfaces';
import { HealthRegistry } from 'src/infrastructure/services/health-register.service.js';

/**
 * Describes the properties required to mark a class or value as injectable within a dependency injection system.
 *
 * @property name - The unique token used to identify the injectable.
 * @property lifecycle - (Optional) The lifecycle management strategy for the injectable (e.g., singleton, transient).
 * @property depends - (Optional) An array of tokens representing dependencies required by the injectable.
 */

interface InjectableProps {
	name: Token;
	lifecycle?: Lifecycle;
	depends?: Token[];
}

/**
 * Marks a class as injectable and registers it in the dependency injection registry.
 *
 * @param props - Configuration options for the injectable, including:
 *   - `name`: The unique token or identifier for the injectable.
 *   - `lifecycle`: The lifecycle management strategy (e.g., singleton, transient).
 *   - `depends`: An array of dependency tokens required by the injectable.
 *
 * @returns A class decorator function that registers the target class with the provided configuration.
 */

export function Injectable(props: InjectableProps) {
	const { name, lifecycle, depends } = props;

	return function (target: Constructor) {
		injectableRegistry.set(name, { ctor: target, lifecycle: lifecycle ?? 'singleton', dependencyTokens: depends ?? [] });
	};
}

/**
 * Registers a service in the provided container using the specified token and metadata.
 * The service can be registered as either a singleton or a transient instance based on the lifecycle defined in the metadata.
 *
 * @template K - The key type representing the service token in the ServiceMap.
 * @param container - The dependency injection container where the service will be registered.
 * @param token - The unique token used to identify the service within the container.
 * @param metadata - Metadata describing the service, including its constructor, dependencies, and lifecycle.
 *
 * @remarks
 * - If the lifecycle is 'singleton', the service is registered as a singleton.
 * - Otherwise, the service is registered as a transient instance.
 * - Dependencies are resolved from the container and injected into the service constructor.
 */

function registerService<K extends keyof ServiceMap>(
	container: IContainer,
	token: K,
	metadata: typeof injectableRegistry extends Map<any, infer R> ? R : any,
	healthRegistry: HealthRegistry
) {
	const factory = (c: IContainer): ServiceMap[K] => {
		const instances = metadata.dependencyTokens.map((depToken: any) => c.resolve(depToken as keyof ServiceMap));
		const instance = new metadata.ctor(...instances) as ServiceMap[K];

		// AUTO-REGISTRO DE SALUD:
		// Si la instancia tiene el método checkHealth, la suscribimos al registry automáticamente
		if (instance && typeof (instance as any).checkHealth === 'function' && token !== 'HealthService') {
			healthRegistry.register(token, instance as unknown as HealthCheckable);
		}

		return instance;
	};

	if (metadata.lifecycle === 'singleton') {
		container.registerSingleton(token, factory);
	} else {
		container.register(token, factory);
	}
}

/**
 * Automatically registers all injectable services from the `injectableRegistry` into the provided container.
 *
 * For each service token and its associated metadata, this function checks that all declared dependencies
 * are either present in the registry or already registered in the container. If a dependency is missing,
 * it throws an `InjectableError`. Otherwise, it registers the service with the container.
 *
 * @param container - The dependency injection container where services will be registered.
 * @throws {InjectableError} If a service dependency is not found in the registry or container.
 */

export function autoRegister(container: IContainer) {
	const healthRegistry = new HealthRegistry();
	container.registerInstance('HealthRegistry' as any, healthRegistry);
	for (const [token, metadata] of injectableRegistry) {
		for (const dep of metadata.dependencyTokens) {
			if (!injectableRegistry.has(dep) && !container.isRegistered(dep)) throw new InjectableError(token, dep);
		}
		registerService(container, token as keyof ServiceMap, metadata, healthRegistry);
	}
}
