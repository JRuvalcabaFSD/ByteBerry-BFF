/* eslint-disable @typescript-eslint/no-explicit-any */
import { ILogger } from '@interfaces';
import { withLoggerContext } from '@shared';

/**
 * Represents an object capable of resolving dependency tokens into concrete values.
 *
 * @template T - The expected return type of the resolved value. Defaults to `any`.
 *
 * @param token - The token used to identify the dependency to resolve. This can be a constructor, string, symbol, or any other token type understood by the container.
 * @param rest - Optional additional arguments forwarded to the resolver. The meaning and handling of these arguments depend on the container implementation.
 *
 * @returns The resolved value for the given token, typed as `T`.
 *
 * @remarks
 * This shape is commonly used for dependency-injection containers or container proxies that expose a `resolve` method.
 * Implementations may throw if the token cannot be resolved.
 *
 */

export type HasResolve = {
	resolve<T = any>(token: unknown, ...rest: unknown[]): T;
};

/**
 * Wraps a container that implements HasResolve in a Proxy to inject a logger context
 * when resolving the 'Logger' token.
 *
 * @template C - The container type; must provide a `resolve` method (conforms to HasResolve).
 * @param container - The original container whose properties and methods will be proxied.
 *                    All property accesses are forwarded to the original container except
 *                    the `resolve` method, which is intercepted.
 * @param ctx - The logger context string to attach when the 'Logger' token is resolved.
 *
 * @returns A proxied container with the same compile-time type as the input container.
 *          The returned proxy intercepts accesses to the `resolve` method and returns a
 *          wrapped ILogger (via `withLoggerContext`) only when the `token === 'Logger'`.
 *          For all other tokens and for all other properties, the proxy forwards the
 *          original values/behavior unchanged.
 *
 * @remarks
 * - The implementation uses `Reflect.get` to preserve normal property semantics.
 * - The wrapped `resolve` preserves the original method's signature at the type level
 *   by casting the wrapper back to the property's type.
 * - Only the literal token `'Logger'` is treated specially; other tokens are returned as-is.
 */

export function containerWithLoggerContext<C extends HasResolve>(container: C, ctx: string): C {
	const handler: ProxyHandler<C> = {
		get(target, prop, receiver) {
			const orig = Reflect.get(target, prop, receiver);

			// Interceptamos sólo la llamada a `resolve`
			if (prop === 'resolve' && typeof orig === 'function') {
				const wrappedResolve = function (this: any, token: unknown, ...rest: unknown[]) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
					const resolved = (orig as Function).call(target, token, ...rest);
					if (token === 'Logger') {
						return withLoggerContext(resolved as ILogger, ctx) as any;
					}
					return resolved;
				};

				// Mantener la firma para TS: casteamos al tipo de la propiedad
				return wrappedResolve as unknown as C[typeof prop];
			}

			return orig;
		},
	};

	return new Proxy(container, handler) as C;
}
