import { Router, Request, Response } from 'express';

import { Injectable } from '@shared';
import type { HomeResponse, IClock, IConfig, IHealthService, IJwtVerifier, ILogger } from '@interfaces';
import { createHealthRoutes } from './health.routes.js';
import { createMeRoutes } from './me.routes.js';
import { MeController } from '../controllers/me.controller.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		AppRouter: AppRouter;
	}
}

//TODO documentar
@Injectable({ name: 'AppRouter', depends: ['Config', 'Clock', 'HealthService', 'Logger', 'JwtVerifier', 'MeController'] })
export class AppRouter {
	private readonly router: Router;

	constructor(
		private readonly config: IConfig,
		private readonly clock: IClock,
		private readonly heathService: IHealthService,
		private readonly logger: ILogger,
		private readonly jwtVerifier: IJwtVerifier,
		private readonly meCtl: MeController
	) {
		this.router = Router();
		this.setupRoutes();
	}

	/**
	 * Returns the configured Express router instance for the application.
	 *
	 * @returns {Router} The Express router containing all defined routes.
	 */

	public getRoutes(): Router {
		return this.router;
	}

	/**
	 * Initializes the application's HTTP routes.
	 *
	 * - Sets up the root (`/`) endpoint to return service metadata and available endpoints.
	 * - Adds a catch-all 404 handler for any unmatched routes, returning a JSON error response.
	 *
	 * @private
	 */

	private setupRoutes(): void {
		const baseurl = `${this.config.serviceUrl}:${this.config.port}`;

		const requireAuth = createAuthMiddleware(this.jwtVerifier, this.logger);

		//Me
		this.router.use('/api/user', requireAuth, createMeRoutes(this.meCtl));

		//Health
		this.router.use('/health', createHealthRoutes(this.heathService));

		this.router.get('/', (req: Request, res: Response) => {
			const homeResponse: HomeResponse = {
				service: this.config.serviceName,
				version: this.config.version,
				status: 'running',
				timestamp: this.clock.isoString(),
				requestId: req.requestId,
				environment: this.config.nodeEnv,
				endpoints: this.getRoutesList(baseurl),
			};

			res.json(homeResponse);
		});

		//404 Handler for unwatched routes
		this.router.get('{*splat}', (req: Request, res: Response) => {
			res.status(404).json({
				error: 'Not found',
				message: `Route ${req.method} ${req.originalUrl} not found`,
				requestId: req.requestId,
				timestamp: this.clock.isoString(),
				endpoints: this.getRoutesList(baseurl),
			});
		});
	}

	/**
	 * Generates a list of API routes with their corresponding HTTP methods and URLs based on the provided base URL.
	 *
	 * @param baseUrl - The base URL to prepend to each route path.
	 * @returns An object mapping route names and HTTP methods (e.g., "login [POST]") to their full URLs.
	 */

	private getRoutesList(baseUrl: string): Record<string, unknown> | string[] {
		const routes = [
			{ name: 'home', value: `${baseUrl}/`, method: 'GET' },
			{ name: 'deepHealth', value: `${baseUrl}/health/deep`, method: 'GET' },
			{ name: 'health', value: `${baseUrl}/health`, method: 'GET' },
			{ name: 'me', value: `${baseUrl}/api/user/me`, method: 'GET' },
			// { name: 'authorize', value: `${baseUrl}/auth/authorize`, method: 'GET' },
			// { name: 'JWKS', value: `${baseUrl}/auth/.well-known/jwks.json`, method: 'GET' },
			// { name: 'login', value: `${baseUrl}/auth/login`, method: 'POST' },
			// { name: 'login', value: `${baseUrl}/auth/login`, method: 'GET' },
			// { name: 'token', value: `${baseUrl}/auth/token`, method: 'POST' },
			// { name: 'user', value: `${baseUrl}/user/register`, method: 'POST' },
			// { name: 'currentUser', value: `${baseUrl}/user/me`, method: 'GET' },
			// { name: 'update', value: `${baseUrl}/user/me`, method: 'PUT' },
			// { name: 'updatePassword', value: `${baseUrl}/user/me/password`, method: 'PUT' },
			// { name: 'createClient', value: `${baseUrl}/client`, method: 'POST' },
		];

		return routes.reduce(
			(acc, { name, value, method }) => {
				acc[`${name} [${method}]`] = value;
				return acc;
			},
			{} as Record<string, unknown>
		);
	}
}
