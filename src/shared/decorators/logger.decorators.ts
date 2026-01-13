/* eslint-disable @typescript-eslint/no-explicit-any */
import { ILogger, Token } from '@interfaces';

const WRAPPED_FLAG = Symbol('__logger_wrapped__');
const ORIGINAL_LOGGER = Symbol('__original_logger__');
const BASE_CONTEXT = Symbol('__base_context__');

// Logger methods to intercept
const LOGGER_METHODS = ['debug', 'info', 'warn', 'error', 'log'];

/**
 * Type guard that determines whether a value behaves like an ILogger.
 *
 * Checks that the provided value is not null/undefined and that it exposes
 * callable `debug` and `info` properties. Use this in conditional expressions
 * to narrow the type to `ILogger`.
 *
 * @param x - The value to test for logger-like shape.
 * @returns True if `x` appears to implement the minimal `ILogger` shape (has callable `debug` and `info`), otherwise false.
 *
 * @remarks
 * This is a lightweight, structural runtime check and does not guarantee full
 * conformance to the `ILogger` interface (only the presence and type of the
 * two methods are verified). If your logger interface includes additional
 * required members or specific behavior, perform further validation.
 */

function isLoggerLike(x: any): x is ILogger {
	return !!x && typeof x.debug === 'function' && typeof x.info === 'function';
}

/**
 * Wraps either a logger or a function with a contextual logger prefix.
 *
 * @template T - Either an ILogger implementation or a callable (e.g. middleware/handler).
 *
 * @param target - The object to wrap. If it has a `debug` property it is treated as a logger; if it is
 *   a function it is treated as a callable to be wrapped. If it is neither, it is returned unchanged.
 * @param context - The context string to prefix to log messages (e.g. "MyService").
 *
 * @returns The original target, or a proxied/logger-wrapped instance:
 * - When `target` is an ILogger:
 *   - Returns a Proxy over the original logger that prefixes the first string argument of logging
 *     method calls with `"[<context>]"`, but only if that prefix is not already present.
 *   - Only methods listed in `LOGGER_METHODS` are wrapped; other properties/methods are forwarded.
 *   - The wrapper avoids double-wrapping by inspecting and preserving an `ORIGINAL_LOGGER` property
 *     and setting a `WRAPPED_FLAG` (and also records `BASE_CONTEXT`) on the returned proxy.
 *   - The Proxy delegates to the original logger for actual logging after prefixing.
 * - When `target` is a function:
 *   - Returns a wrapped function that searches its arguments for an object containing `.logger` or `.log`.
 *   - If such an argument with a `.logger` is found, the wrapper calls `logger.debug("[<context>] Function executed")`
 *     before invoking the original function.
 *   - The wrapper preserves the original function's parameter and return types.
 *
 * @remarks
 * - Prefixing only applies when the first argument of the wrapped logging method is a string.
 * - The check to avoid re-prefixing uses a simple `startsWith` test against `"[<context>]"`.
 * - The implementation relies on the external symbols/constants `WRAPPED_FLAG`, `ORIGINAL_LOGGER`,
 *   `BASE_CONTEXT`, and `LOGGER_METHODS` to manage wrapping state and determine which methods to intercept.
 * - This function mutates the returned proxy by attaching the above symbol properties; it does not deep-clone
 *   the logger.
 *
 * @example
 * // Given a logger `log` and context "Auth":
 * // const ctxLogger = withLoggerContext(log, "Auth");
 * // ctxLogger.debug("User signed in") => "[Auth] User signed in"
 */

export function withLoggerContext<T extends ILogger | ((...args: any[]) => any)>(target: T, context: string): T {
	// Si es un logger
	if ('debug' in (target as any)) {
		const logger = target as ILogger;

		// Evitar envolver múltiples veces el mismo contexto
		if ((logger as any)[WRAPPED_FLAG] === context) return logger as T;

		const existingOriginal = (logger as any)[ORIGINAL_LOGGER] as ILogger | undefined;
		const actualTarget = existingOriginal ?? logger;

		const handler: ProxyHandler<ILogger> = {
			get(t, prop: string | symbol) {
				const orig = (t as any)[prop];
				if (typeof orig === 'function' && LOGGER_METHODS.includes(String(prop))) {
					return (...args: any[]) => {
						if (typeof args[0] === 'string') {
							const prefix = `[${context}]`;
							if (!args[0].startsWith(prefix)) {
								args[0] = `${prefix} ${args[0]}`;
							}
						}
						return orig.apply(t, args);
					};
				}
				return orig;
			},
		};

		const proxy = new Proxy(actualTarget as any, handler) as ILogger;

		(proxy as any)[ORIGINAL_LOGGER] = actualTarget;
		(proxy as any)[BASE_CONTEXT] = context;
		(proxy as any)[WRAPPED_FLAG] = context;

		return proxy as T;
	}

	// Si es una función (arrow function, middleware, etc.)
	if (typeof target === 'function') {
		const fn = target as (...args: any[]) => any;
		const wrappedFn = ((...args: Parameters<typeof fn>): ReturnType<typeof fn> => {
			const loggerArg = args.find((arg) => arg && (arg.logger || arg.log))?.logger as ILogger;
			if (loggerArg) {
				loggerArg.debug(`[${context}] Function executed`);
			}
			return fn(...args);
		}) as typeof fn;

		return wrappedFn as T;
	}

	return target;
}

/**
 * Retrieves the underlying/original logger from a possibly-decorated logger instance.
 *
 * This function detects whether the provided object is "logger-like" (using
 * `isLoggerLike`). If it is, it will attempt to unwrap a previously-stored
 * original logger using the `ORIGINAL_LOGGER` symbol property. If the symbol
 * property is not present or the value is not accessible, the input `logger`
 * is returned unchanged.
 *
 * @param logger - A logger instance that may have been wrapped or decorated.
 * @returns The original, underlying ILogger if available; otherwise returns the
 *          provided `logger` as-is.
 *
 * @remarks
 * - This is a non-mutating accessor: it does not modify the provided `logger`.
 * - The detection logic relies on `isLoggerLike` and the `ORIGINAL_LOGGER`
 *   symbol; ensure those are available and consistent with any decorator
 *   implementations.
 *
 * @see isLoggerLike
 * @see ORIGINAL_LOGGER
 *
 * @example
 * // Given a logger that was wrapped and preserved its original under the
 * // ORIGINAL_LOGGER symbol, this function will return that original instance.
 * const original = getOriginalLogger(maybeWrappedLogger);
 */

function getOriginalLogger(logger: ILogger): ILogger {
	if (!isLoggerLike(logger)) return logger;
	return (logger as any)[ORIGINAL_LOGGER] ?? logger;
}

/**
 * Retrieves the base logging context associated with a logger.
 *
 * Attempts to read the internal BASE_CONTEXT value from the provided ILogger instance.
 * Returns the context as a string when present, otherwise returns undefined.
 *
 * @param logger - The ILogger instance to query for its base context.
 * @returns The base context string for the logger, or undefined if none is set.
 */

function getBaseContext(logger: ILogger): string | undefined {
	return (logger as any)[BASE_CONTEXT];
}

/**
 * Class decorator that ensures logger-like objects associated with a class instance are wrapped
 * with a context identifying the class name.
 *
 * Behavior:
 * - Wraps any constructor arguments that are logger-like with `withLoggerContext(logger, className)` prior
 *   to calling the original constructor so injected loggers carry the class context.
 * - After the original constructor runs, inspects the instance's own properties and wraps any logger-like
 *   properties with the same class context.
 * - If a logger-like object already exposes a base context equal to the class name, it is not re-wrapped
 *   (prevents double-wrapping).
 * - Uses `constructor.name` or the fallback string `"UnknownClass"` as the context value.
 *
 * Example:
 * ```ts
 * @LogContextClass()
 * class MyService {
 *   constructor(private logger: ILogger) {}
 * }
 * // Injected or assigned loggers will be proxied so emitted logs include the class context "MyService".
 * ```
 *
 * @template T The constructor type being decorated.
 * @returns A subclass constructor that preserves the original behavior but wraps logger-like constructor
 *          arguments and instance properties with a class-level logger context.
 *
 * @remarks
 * - This decorator depends on the presence of helper functions/types in scope: `isLoggerLike`, `withLoggerContext`,
 *   `getBaseContext`, `getOriginalLogger`, and the `ILogger` shape.
 * - Intended for use with dependency-injected or manually-provided logger instances so logs automatically
 *   include the class context without modifying call sites.
 * - Side effects: mutates instance properties that are logger-like to replace them with context-wrapped proxies.
 */

export function LogContextClass() {
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	return function <T extends { new (...args: any[]): {} }>(constructor: T): T {
		const className = constructor.name || 'UnknownClass';

		return class extends constructor {
			constructor(...args: any[]) {
				// 1) Envolver loggers que se pasen como argumentos (ej: logger inyectado por DI)
				const argsWrapped = args.map((arg) => (isLoggerLike(arg) ? withLoggerContext(arg, className) : arg));

				// Llamar al constructor original con argumentos envueltos (si los hubo)
				super(...(argsWrapped as any));

				// 2) Asegurar que propiedades de la instancia logger-like estén envueltas
				const self = this as any;
				for (const key of Object.keys(self)) {
					const prop = self[key];
					if (isLoggerLike(prop)) {
						// Si la propiedad ya es un proxy con BASE_CONTEXT igual, dejarla.
						// Si no, envolverla con el contexto de clase.
						const base = getBaseContext(prop as ILogger);
						if (!base || base !== className) {
							self[key] = withLoggerContext(getOriginalLogger(prop as ILogger), className);
						}
					}
				}
			}
		} as any as T;
	};
}

/**
 * Method decorator that temporarily injects a contextual logger into any logger-like
 * properties found on the instance for the duration of the decorated method call.
 *
 * Behavior:
 * - Captures a reliable "static" class name at decoration time (from the target or its constructor).
 * - At runtime, prefers the instance constructor name if available, falling back to the captured
 *   static name or "UnknownClass".
 * - Builds a context string of the form "<ClassName>.<methodName>" and uses it to wrap logger-like
 *   properties on the instance before invoking the original method.
 * - Only enumerable own properties of the instance (Object.keys(this)) are inspected.
 * - For each property that satisfies isLoggerLike(prop):
 *     - Retrieves an original logger via getOriginalLogger(prop).
 *     - If the property is already wrapped with the same context (prop[WRAPPED_FLAG] === ctx), it is skipped.
 *     - Otherwise replaces the property with a wrapper produced by withLoggerContext(originalLogger, ctx).
 * - Restores all replaced properties to their original values in a finally block, ensuring restoration
 *   even if the original method throws or returns a rejected Promise.
 * - Supports both synchronous and asynchronous methods: if the original method returns a Promise,
 *   the decorator awaits it and returns the resolved value (or propagates rejection).
 *
 * Constraints and expectations:
 * - Intended for methods only. If applied to a non-method (i.e., descriptor is missing or descriptor.value
 *   is not a function), the decorator throws an Error.
 * - Relies on the helper utilities isLoggerLike, getOriginalLogger, withLoggerContext and the sentinel
 *   WRAPPED_FLAG to detect and wrap logger-like objects.
 * - The temporary replacement is limited in scope to the method invocation; other concurrent calls
 *   to the same instance will see the wrapped loggers only while the call is executing.
 *
 * @returns {MethodDecorator} A decorator function that wraps the target method with the context-injection logic.
 *
 * @throws {Error} If the decorator is applied to a target that does not have a function descriptor.value
 *                 (i.e., not a method).
 *
 * @example
 * class MyService {
 *   logger = createLogger(...); // logger-like object
 *
 *   @LogContextMethod()
 *   async doWork() {
 *     // During this call, this.logger will be temporarily wrapped with context "MyService.doWork"
 *     this.logger.info('started');
 *     await doSomethingAsync();
 *     this.logger.info('finished');
 *   }
 * }
 */

export function LogContextMethod(): MethodDecorator {
	return function (
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<any>
	): TypedPropertyDescriptor<any> | void {
		if (!descriptor || typeof descriptor.value !== 'function') {
			throw new Error('LogContextMethod solo puede aplicarse a métodos');
		}

		const staticClassName =
			(typeof target === 'function' && (target as any).name) ||
			(target && (target as any).constructor && (target as any).constructor.name) ||
			undefined;

		const originalMethod = descriptor.value;

		// CRÍTICO: NO hacer async siempre - preservar sync/async del método original
		descriptor.value = function (...args: any[]) {
			// ← SIN async!
			const runtimeName =
				this && this.constructor && this.constructor.name && this.constructor.name !== 'Function' ? this.constructor.name : undefined;

			const className = runtimeName || staticClassName || 'UnknownClass';
			const ctx = `${className}.${String(propertyKey)}`;
			const self = this as any;
			const replaced: Array<{ key: string | symbol; original: any }> = [];

			try {
				// Wrap loggers
				for (const key of Object.keys(self || {})) {
					const prop = self[key];
					if (!isLoggerLike(prop)) continue;

					const originalTarget = getOriginalLogger(prop as ILogger);

					if ((prop as any)[WRAPPED_FLAG] && (prop as any)[WRAPPED_FLAG] === ctx) continue;

					const methodProxy = withLoggerContext(originalTarget, ctx);

					replaced.push({ key, original: prop });
					self[key] = methodProxy;
				}

				// CRÍTICO: Llamar método original sin await si es sync
				const result = originalMethod.apply(this, args);

				// Solo si es async, entonces manejarlo como Promise
				if (result && typeof result.then === 'function') {
					// Es async - retornar Promise que restaura en finally
					return result.finally(() => {
						for (const r of replaced) {
							self[r.key] = r.original;
						}
					});
				}

				// Es sync - restaurar inmediatamente y retornar
				for (const r of replaced) {
					self[r.key] = r.original;
				}
				return result;
			} catch (error) {
				// Error sync - restaurar y re-lanzar
				for (const r of replaced) {
					self[r.key] = r.original;
				}
				throw error; // ← Re-lanza el error original
			}
		};

		return descriptor;
	};
}

/**
 * Wraps a function so it always receives a logger augmented with a context derived from the wrapped function's name.
 *
 * The returned wrapper expects an `ILogger` as its first argument and forwards the remaining arguments to the original function.
 * At call time the wrapper constructs `wrappedLogger` via `withLoggerContext(logger, fn.name || 'AnonymousFunction')`
 * and invokes the original function with that `wrappedLogger` followed by the original arguments.
 *
 * Note: The function is returned with a cast to `T` for convenience; at runtime the wrapper always expects an `ILogger`
 * as the first parameter regardless of the original `T` signature.
 *
 * @typeParam T - The function type being wrapped.
 * @param fn - The target function to wrap. It should accept a logger as its first argument.
 * @returns A function that takes an `ILogger` and the original function's remaining arguments, and returns the original function's result.
 */

export function logContextFunction<T extends (...args: any[]) => any>(fn: T): T {
	return ((logger: ILogger, ...args: any[]) => {
		const wrappedLogger = withLoggerContext(logger, fn.name || 'AnonymousFunction');
		return fn(wrappedLogger, ...args);
	}) as T;
}

/**
 * Wraps a dependency-injection container with a proxy that injects a logging context into resolved logger instances.
 *
 * The returned proxy forwards all property access to the original container except for the `resolve` method,
 * which is intercepted. When `resolve` is called and the requested token is the string literal 'Logger',
 * the resolved value is inspected with `isLoggerLike`. If it appears to be a logger, it is wrapped with
 * `withLoggerContext` using the provided `context` string before being returned; otherwise the original
 * resolved value is returned unchanged.
 *
 * This function is generic over the container type `T`, which is expected to provide a `resolve` method
 * of the shape `resolve<K extends Token>(token: K): any`. The proxy preserves all other container members
 * and behavior.
 *
 * Example use cases:
 * - Attach request- or component-specific context to logger instances resolved from a shared container.
 * - Ensure structured logs from different parts of an application include a consistent context value.
 *
 * @template T - Type of the container being wrapped. Must implement a `resolve` method.
 * @param container - The DI container instance to wrap with logging-aware behavior.
 * @param context - A string value representing the logging context to attach to resolved loggers.
 * @returns A proxied container with the same surface as the original but with context-aware logger resolution.
 */

export function wrapContainerLogger<T extends { resolve<K extends Token>(token: K): any }>(container: T, context: string): T {
	return new Proxy(container, {
		get(target, prop) {
			if (prop === 'resolve') {
				return <K extends Token>(token: K) => {
					const resolved = target.resolve(token);
					if ((token as string) === 'Logger' && isLoggerLike(resolved)) {
						return withLoggerContext(resolved, context);
					}
					return resolved;
				};
			}
			return (target as any)[prop];
		},
	});
}
