/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Represents a type that can be instantiated with the `new` keyword.
 *
 * @template T - The type of the instance created by the constructor.
 */

import { ServiceMap } from '@ServiceMap';

export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * A registry that maps service tokens to their corresponding constructor, lifecycle, and dependencies.
 *
 * - The key is a token from the `ServiceMap` representing a service.
 * - The value is an object containing:
 *   - `ctor`: The constructor function for the service.
 *   - `lifecycle`: Specifies whether the service is a 'singleton' or 'transient'.
 *   - `dependencyTokens`: An array of tokens representing the dependencies required by the service.
 *
 * This registry is used to manage service instantiation and dependency injection.
 */

export const injectableRegistry = new Map<
	keyof ServiceMap,
	{
		ctor: Constructor;
		lifecycle: 'singleton' | 'transient';
		dependencyTokens: (keyof ServiceMap)[];
	}
>();
