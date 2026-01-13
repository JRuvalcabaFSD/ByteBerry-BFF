import { Server } from 'http';
// import path, { join } from 'path';
// import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import express, { Application } from 'express';

import * as Middlewares from '@infrastructure';
import { AppError } from '@domain';
import { getErrMessage, Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { IConfig, IClock, ILogger, IHttpServer, ServerInfo, IUuid } from '@interfaces';
import { AppRouter } from '@presentation';

/**
 * Represents an HTTP server implementation using Express, providing lifecycle management,
 * middleware initialization, and runtime information access.
 *
 * The `HttpServer` class encapsulates the setup and control of an Express-based HTTP server,
 * including starting, stopping, and querying server state. It leverages dependency injection
 * for configuration, logging, and clock services, and applies a set of middlewares for security,
 * CORS, request identification, logging, and payload parsing.
 *
 * @remarks
 * - The server instance is managed internally and can be started or stopped asynchronously.
 * - Middleware setup is performed during construction.
 * - The class exposes methods to check running status, retrieve server information, and access the Express app.
 *
 * @example
 * ```typescript
 * const server = new HttpServer(container);
 * await server.start();
 * // ... handle requests
 * await server.stop();
 * ```
 */

@LogContextClass()
@Injectable({ name: 'HttpServer', depends: ['Config', 'Clock', 'Logger', 'Uuid', 'AppRouter'] })
export class HttpServer implements IHttpServer {
	private readonly app: Application;
	private server: Server | null = null;
	private startTime: Date | null = null;

	constructor(
		private readonly config: IConfig,
		private readonly clock: IClock,
		private readonly logger: ILogger,
		private readonly uuid: IUuid,
		private readonly appRouter: AppRouter
	) {
		this.app = express();
		// TODO F1
		// this.setupViewEngine();
		this.setupMiddlewares();
		this.app.use(this.appRouter.getRoutes());
		this.setupHandledError();
	}

	/**
	 * Starts the HTTP server and begins listening on the configured port.
	 *
	 * @returns A promise that resolves when the server has successfully started.
	 * @throws {AppError} If an application-specific error occurs during startup.
	 *
	 * @remarks
	 * - The server instance is stored in `this.server`.
	 * - The server's start time is recorded using `this.clock.now()`.
	 * - Errors emitted by the server are handled and cause the returned promise to reject.
	 */

	@LogContextMethod()
	public async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.server = this.app.listen(this.config.port, () => {
					this.startTime = this.clock.now();

					this.logger.info('Http Server started successfully');
					resolve();
				});

				this.server.on('error', (error) => {
					this.logger.error('Http Server failed to start', { error: getErrMessage(error), port: this.config.port });
					reject(error);
				});
			} catch (error) {
				if (error instanceof AppError) throw error;
				this.logger.error('Failed to start Http Server', { error: getErrMessage(error) });
				reject(error);
			}
		});
	}

	/**
	 * Stops the HTTP server if it is currently running.
	 *
	 * If the server is not running, the method resolves immediately.
	 * Otherwise, it gracefully closes the server and resets internal state.
	 *
	 * @returns {Promise<void>} A promise that resolves when the server has stopped.
	 */

	@LogContextMethod()
	public async stop(): Promise<void> {
		if (!this.server) {
			this.logger.warn('Http Server stop called but server is not running');
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			this.server?.close((error) => {
				if (error) {
					this.logger.error('Error stopping Http Server', { error: getErrMessage(error) });
					reject(error);
				}

				this.logger.info('Http Server stopped successfully');
				this.server = null;
				this.startTime = null;
				resolve();
			});
		});
	}
	/**
	 * Returns the Express application instance.
	 *
	 * @returns {Promise<Application>} A promise that resolves to the Express app.
	 */
	public async getApp(): Promise<Application> {
		return this.app;
	}
	/**
	 * Checks if the HTTP server instance is currently running and accepting connections.
	 *
	 * @returns {boolean} `true` if the server is initialized and listening for requests; otherwise, `false`.
	 */
	public isRunning(): boolean {
		return this.server !== null && this.server.listening;
	}
	/**
	 * Retrieves information about the current server state, including the port number,
	 * running status, and optionally the server start time.
	 *
	 * If the server is running, the actual port number used by the server is returned.
	 * Otherwise, the configured port is returned.
	 *
	 * @returns {ServerInfo} An object containing the server's port, running status, and optionally the start time.
	 */
	public getServeInfo(): ServerInfo {
		let actualPort = this.config.port;
		if (this.server && this.isRunning()) {
			const address = this.server.address();
			if (address && typeof address === 'object') {
				actualPort = address.port;
			}
		}

		return {
			port: actualPort,
			isRunning: this.isRunning(),
			...(this.startTime && { startTime: this.startTime }),
		};
	}

	public async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
		return {
			status: 'healthy',
			message: 'HttpServer service is available and operational',
		};
	}

	/**
	 * Initializes and applies all necessary middlewares to the Express application.
	 *
	 * This method configures the following middlewares:
	 * - Sets the 'trust proxy' setting to enable proxy support.
	 * - Disables the 'x-powered-by' header for security.
	 * - Applies a custom security middleware.
	 * - Applies a CORS middleware with the current configuration.
	 * - Adds a request ID middleware using a UUID provider from the container.
	 * - Adds a logging middleware with the provided logger, clock, and request logging configuration.
	 * - Configures the app to parse JSON payloads with a 10MB limit.
	 * - Configures the app to parse URL-encoded payloads with a 10MB limit.
	 *
	 * @private
	 */

	private setupMiddlewares(): void {
		this.app.set('trust proxy', true);
		this.app.disable('x-powered-by');
		this.app.use(Middlewares.createSecurityMiddleware());
		this.app.use(Middlewares.createCORSMiddleware(this.config));
		this.app.use(Middlewares.createRequestIdMiddleware(this.uuid));
		this.app.use(Middlewares.createLoggingMiddleware(this.logger, this.clock, this.config.logRequests));
		this.app.use(express.json({ limit: '10mb' }));
		this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
		this.app.use(cookieParser());
	}

	/**
	 * Configures the Express application to use a custom error-handling middleware.
	 * The middleware is created using the provided logger and configuration,
	 * ensuring that handled errors are properly logged and formatted in HTTP responses.
	 *
	 * @private
	 */

	private setupHandledError(): void {
		this.app.use(Middlewares.createErrorMiddleware(this.logger, this.config));
	}

	// TODO F1
	// private setupViewEngine(): void {
	// 	const __filename = fileURLToPath(import.meta.url);
	// 	const __dirname = path.dirname(__filename);

	// 	this.app.set('views', join(__dirname, '../../../views'));
	// 	this.app.set('view engine', 'ejs');
	// 	this.app.use(express.static(join(__dirname, '../../../public')));
	// }
}
