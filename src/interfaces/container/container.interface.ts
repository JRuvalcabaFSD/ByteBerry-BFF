import { ServiceMap } from '@ServiceMap';

/**
 * Represents a type alias for the keys of the `ServiceMap` interface.
 * Used as an identifier for services within the dependency injection container.
 */

export type Token = keyof ServiceMap;

/**
 * Represents the lifecycle of a dependency within a container.
 * - `'singleton'`: Only one instance is created and shared.
 * - `'transient'`: A new instance is created each time it is requested.
 */

export type Lifecycle = 'singleton' | 'transient';

/**
 * Represents a dependency injection container interface for registering and resolving services.
 *
 * @template ServiceMap A mapping of service tokens to their corresponding types.
 */

export interface IContainer {
	register<K extends keyof ServiceMap>(token: K, factory: (container: IContainer) => ServiceMap[K]): void;
	registerSingleton<K extends keyof ServiceMap>(token: K, factory: (container: IContainer) => ServiceMap[K]): void;
	registerInstance<K extends keyof ServiceMap>(token: K, instance: ServiceMap[K]): void;
	resolve<K extends keyof ServiceMap>(token: K): ServiceMap[K];
	isRegistered(token: keyof ServiceMap): boolean;
}
