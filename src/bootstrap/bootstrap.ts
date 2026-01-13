import { AppError } from '@domain';
import { bootstrapContainer } from '@container';
import { IContainer, ILogger } from '@interfaces';
import { configureShutdown, GracefulShutdown } from '@infrastructure';
import { BootstrapError, getErrMessage, withLoggerContext } from '@shared';

/**
 * Represents the result of the bootstrap process.
 *
 * @property container - The dependency injection container instance.
 * @property shutdown - The graceful shutdown handler.
 */
interface bootstrapResult {
	container: IContainer;
	shutdown: GracefulShutdown;
}

/**
 * Bootstraps the application by initializing the dependency injection container,
 * configuring shutdown handlers, validating the database connection (unless skipped),
 * and starting the HTTP server.
 *
 * @param options - Optional configuration object.
 * @param options.skipDbValidation - If true, skips database connection validation. Defaults to false.
 * @returns A promise that resolves to a `bootstrapResult` containing the DI container and shutdown handler.
 * @throws {AppError} If an application-specific error occurs during bootstrap.
 * @throws {BootstrapError} If any other error occurs during bootstrap, wrapped with additional context.
 */
export async function bootstrap({ skipDbValidation = false } = {}): Promise<bootstrapResult> {
	let logger: ILogger | undefined;

	try {
		const container = bootstrapContainer();
		const gracefulShutdown = container.resolve('GracefulShutdown');
		const httpServer = container.resolve('HttpServer');

		logger = withLoggerContext(container.resolve('Logger'), 'bootstrap');

		logger.info('Service starting');

		const shutdown = configureShutdown(gracefulShutdown, logger, httpServer);

		// TODO F2
		// if (!skipDbValidation) {
		// 	await validateDbConnection(container, logger);
		// }

		await httpServer.start();

		return { container, shutdown };
	} catch (error) {
		if (error instanceof AppError) throw error;
		throw new BootstrapError(`Service bootstrap failed: ${getErrMessage(error)}`, { timestamp: new Date().toISOString() });
	}
}

/**
 * Validates the database connection by attempting to test the connection using the provided container.
 * Logs an error and throws a `BootstrapError` if the connection test fails.
 *
 * @param container - The dependency injection container used to resolve the database configuration.
 * @param logger - The logger instance used for logging context and errors.
 * @throws {BootstrapError} If the database connection test fails.
 */

// TODO F2
// async function validateDbConnection(container: IContainer, logger: ILogger): Promise<void> {
// 	const ctxLogger = withLoggerContext(logger, 'bootstrap.validateDbConnection');

// 	try {
// 		await container.resolve('DBConfig').testConnection();
// 	} catch (error) {
// 		ctxLogger.error('Database connection failed', { error: getErrMessage(error) });
// 		throw new BootstrapError('Database connection failed', { error: getErrMessage(error) });
// 	}
// }
