import type { ILogger } from '@interfaces';
import { getErrMessage, Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		GracefulShutdown: GracefulShutdown;
	}
}

/**
 * Represents a function that performs cleanup operations during application shutdown.
 *
 * @remarks
 * This type defines a function signature for cleanup handlers that can be registered
 * to execute when the application is shutting down. The function can perform either
 * synchronous or asynchronous cleanup operations.
 *
 * @returns A Promise that resolves when async cleanup is complete, or void for synchronous cleanup
 *
 * @example
 * ```typescript
 * // Synchronous cleanup
 * const syncCleanup: CleanupFunction = () => {
 *   console.log('Cleaning up resources...');
 * };
 *
 * // Asynchronous cleanup
 * const asyncCleanup: CleanupFunction = async () => {
 *   await database.disconnect();
 *   await cache.flush();
 * };
 * ```
 */

export type CleanupFunction = () => Promise<void> | void;

/**
 * Manages graceful shutdown of the application by coordinating cleanup operations.
 *
 * @remarks
 * This class handles:
 * - Registration of cleanup functions to be executed during shutdown
 * - Signal handling for SIGTERM and SIGINT
 * - Exception and rejection handling for uncaught errors
 * - Coordinated execution of all registered cleanup functions
 * - Prevention of duplicate shutdown attempts through promise caching
 *
 * The shutdown process executes all registered cleanup functions in parallel
 * and ensures the application terminates cleanly even if individual cleanup
 * functions fail.
 *
 * @example
 * ```typescript
 * const shutdown = new GracefulShutdown(logger);
 *
 * shutdown.registerCleanup(async () => {
 *   await database.close();
 * });
 *
 * shutdown.registerCleanup(async () => {
 *   await server.close();
 * });
 * ```
 */

@Injectable({ name: 'GracefulShutdown', depends: ['Logger'] })
@LogContextClass()
export class GracefulShutdown {
	private readonly cleanupFunctions: CleanupFunction[] = [];
	private shutdownPromise?: Promise<void>;
	public registerCleanupsCount: number = 0;

	private static readonly handlers: Partial<
		Record<NodeJS.Signals | 'uncaughtException' | 'unhandledRejection', (...args: unknown[]) => void>
	> = {};

	/**
	 * Creates an instance of the shutdown handler.
	 *
	 * @param logger - The logger instance used for logging shutdown events and errors.
	 */

	constructor(private readonly logger: ILogger) {
		this.setupSignalHandlers();
	}

	/**
	 * Registers a cleanup function to be executed during the shutdown process.
	 *
	 * This method adds a cleanup function to the internal collection and increments
	 * the cleanup registration counter. Cleanup functions are typically executed
	 * when the application is shutting down to release resources, close connections,
	 * or perform other cleanup tasks.
	 *
	 * @param cleanup - The cleanup function to be registered for execution during shutdown.
	 * @returns void
	 *
	 * @example
	 * ```typescript
	 * registerCleanup(async () => {
	 *   await database.disconnect();
	 * });
	 * ```
	 */

	public registerCleanup(cleanup: CleanupFunction): void {
		this.registerCleanupsCount++;
		this.cleanupFunctions.push(cleanup);
	}

	/**
	 * Initiates a graceful shutdown of the system.
	 *
	 * This method ensures that only one shutdown operation occurs at a time by caching
	 * the shutdown promise. Subsequent calls while a shutdown is in progress will return
	 * the same promise, preventing multiple concurrent shutdown attempts.
	 *
	 * @returns A promise that resolves when the shutdown process is complete.
	 *
	 * @remarks
	 * The shutdown promise is cleared after completion (whether successful or failed),
	 * allowing for potential restart scenarios.
	 */

	public shutdown(): Promise<void> {
		if (this.shutdownPromise) return this.shutdownPromise;

		this.shutdownPromise = (async () => {
			try {
				await this.performShutdown();
			} finally {
				this.shutdownPromise = undefined;
			}
		})();

		return this.shutdownPromise;
	}

	/**
	 * Performs the shutdown process by executing all registered cleanup functions in parallel.
	 *
	 * @remarks
	 * This method executes all cleanup functions concurrently using `Promise.all`. Each cleanup
	 * function is executed independently, and failures in individual cleanup functions do not
	 * prevent other cleanup functions from executing. Errors are logged but do not cause the
	 * method to throw.
	 *
	 * @returns A promise that resolves when all cleanup functions have completed (successfully or with errors)
	 *
	 * @internal
	 */

	@LogContextMethod()
	private async performShutdown(): Promise<void> {
		this.logger.info(`Starting ${this.cleanupFunctions.length} cleanup process...`);

		const promises = this.cleanupFunctions.map(async (cleanup, index) => {
			try {
				this.logger.debug(`Running cleanup function ${index + 1}`);
				await cleanup();
				this.logger.debug(`Cleanup function ${index + 1} completed`);
			} catch (error) {
				this.logger.error(`Cleanup function ${index + 1} failed`, { error: getErrMessage(error) });
			}
		});

		await Promise.all(promises);
		this.logger.info('Cleanup process completed');
	}

	/**
	 * Sets up handlers for process signals and uncaught errors to enable graceful shutdown.
	 *
	 * This method registers listeners for:
	 * - SIGTERM and SIGINT signals: Initiates graceful shutdown and exits with code 0 on success or 1 on failure
	 * - uncaughtException events: Logs the error, attempts graceful shutdown, and exits with code 1
	 * - unhandledRejection events: Logs the rejection reason, attempts graceful shutdown, and exits with code 1
	 *
	 * @private
	 * @returns {void}
	 */

	@LogContextMethod()
	private setupSignalHandlers(): void {
		const removeListener = process.off?.bind(process) ?? process.removeListener.bind(process);
		const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

		signals.forEach((signal) => {
			const existing = GracefulShutdown.handlers[signal];
			if (existing) removeListener(signal, existing);

			const handler = () => {
				this.logger.info(`Received ${signal}, starting graceful shutdown...`);
				this.shutdown()
					.then(() => {
						this.logger.info('Graceful shutdown completed');
						process.exit(0);
					})
					.catch((error) => {
						this.logger.info('Graceful shutdown failed', { error: getErrMessage(error) });
						process.exit(1);
					});
			};

			GracefulShutdown.handlers[signal] = handler;
			process.on(signal, handler);
		});

		const uncaughtHandler = (error: unknown) => {
			this.logger.error(`Uncaught exception`, { error: getErrMessage(error) });
			this.shutdown().finally(() => process.exit(1));
		};
		const unhandledHandler = (reason: unknown) => {
			this.logger.error(`Unhandled rejection`, { reason: String(reason) });
			this.shutdown().finally(() => process.exit(1));
		};

		const existingUncaught = GracefulShutdown.handlers.uncaughtException;
		if (existingUncaught) removeListener('uncaughtException', existingUncaught);
		GracefulShutdown.handlers.uncaughtException = uncaughtHandler;
		process.on('uncaughtException', uncaughtHandler);

		const existingUnhandled = GracefulShutdown.handlers.unhandledRejection;
		if (existingUnhandled) removeListener('unhandledRejection', existingUnhandled);
		GracefulShutdown.handlers.unhandledRejection = unhandledHandler;
		process.on('unhandledRejection', unhandledHandler);
	}
}
