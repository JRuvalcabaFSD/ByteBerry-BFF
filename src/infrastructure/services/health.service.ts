import os from 'os';
import type { Request, Response } from 'express';

import * as Interfaces from '@interfaces';
import { Injectable, LogContextClass, withLoggerContext } from '@shared';
import { criticalServices } from '@container';

/**
 * Service responsible for performing health checks and reporting the operational status
 * of the application and its critical dependencies.
 *
 * The `HealthService` provides endpoints for both basic and deep health checks, aggregating
 * the status of internal services, system metrics, JWKS (JSON Web Key Set) availability, and
 * database connectivity. It supports request tracing via request IDs and logs detailed
 * diagnostic information for observability.
 *
 * ## Responsibilities
 * - Exposes health check endpoints for liveness and readiness probes.
 * - Aggregates health status from dependencies such as JWKS and database services.
 * - Provides system information including memory usage and uptime.
 * - Handles and logs errors gracefully, returning safe fallback responses if necessary.
 * - Supports dependency injection for configuration, logging, UUID generation, and clock utilities.
 *
 * ## Usage
 * Typically instantiated via a dependency injection container and used as a singleton
 * service within the application infrastructure layer.
 *
 * @implements {Interfaces.IHealthService}
 *
 * @remarks
 * - Health check endpoints are intended for monitoring, orchestration, and automated recovery.
 * - The service is designed to be extensible for additional dependency checks.
 * - All health check responses include a request ID for traceability.
 */

@LogContextClass()
@Injectable({ name: 'HealthService', depends: ['Config', 'Uuid', 'Clock', 'Logger', 'HealthRegistry'] })
export class HealthService implements Interfaces.IHealthService {
	constructor(
		private readonly config: Interfaces.IConfig,
		private readonly uuid: Interfaces.IUuid,
		private readonly clock: Interfaces.IClock,
		private readonly logger: Interfaces.ILogger,
		private readonly healthRegistry: Interfaces.IHealthRegistry
		// TODO F2
		// private readonly dbHealthChecker: Interfaces.IDatabaseHealthChecker;
	) {}

	/**
	 * Handles HTTP requests for basic health check of the service.
	 *
	 * Performs a simple health check on critical services and returns the status.
	 * The method generates or reuses a request ID for tracing purposes.
	 *
	 * @param req - Express request object containing the HTTP request details
	 * @param res - Express response object used to send the HTTP response
	 *
	 * @returns A promise that resolves when the response is sent
	 *
	 * @remarks
	 * - On success, returns a 200 status with health check response including:
	 *   - Request ID for tracing
	 *   - Overall status of critical services
	 *   - System uptime
	 * - On failure, delegates error handling to `handleHealthError` method
	 * - Logs debug information including request ID, status, and uptime
	 *
	 * @throws Errors are caught and handled internally by `handleHealthError`
	 */

	public getHealth = async (req: Request, res: Response): Promise<void> => {
		const ctxLogger = withLoggerContext(this.logger, 'HealthService.getHealth');
		try {
			const requestId = req.requestId || this.uuid.generate();
			const response = await this.checkHealth('simple', requestId, criticalServices);

			const statusCode = response.status === 'unhealthy' ? 503 : 200;

			ctxLogger.debug('Health check completed', { requestId: response.requestId, status: response.status, uptime: response.uptime });
			res.status(statusCode).json(response);
		} catch (error) {
			await this.handleHealthError(req, res, error as Error, 'basic');
		}
	};

	/**
	 * Performs a deep health check of the system and its critical dependencies.
	 *
	 * This endpoint checks the health status of critical services and returns a detailed
	 * health report including the status of all dependencies, response time, and request tracking.
	 *
	 * @param req - Express request object. May contain a `requestId` property for request tracking.
	 * @param res - Express response object used to send the health check results.
	 *
	 * @returns A Promise that resolves when the health check is complete and response is sent.
	 *
	 * @remarks
	 * - Returns HTTP 200 if status is 'healthy' or 'degraded'
	 * - Returns HTTP 503 if status is unhealthy
	 * - Logs the health check completion with metrics including response time and dependencies count
	 * - Automatically generates a requestId if not provided in the request
	 * - Delegates error handling to `handleHealthError` method
	 *
	 * @throws Will be caught internally and handled by `handleHealthError`
	 */

	public getDeepHealth = async (req: Request, res: Response): Promise<void> => {
		const ctxLogger = withLoggerContext(this.logger, 'HealthService.getDeepHealth');

		try {
			const requestId = req.requestId || this.uuid.generate();
			const startTime = Math.floor(process.uptime() * 1000);

			const response = await this.checkHealth('deep', requestId, criticalServices);

			ctxLogger.debug('Deep health check completed', {
				requestId: response.requestId,
				status: response.status,
				responseTime: this.clock.timestamp() - startTime,
				dependenciesCount: Object.keys(response.dependencies).length,
				// TODO F1
				// jwksAvailable: response.jwks.status === 'healthy',
				// jwksKeyCount: response.jwks.keyCount,
				// jwksResponseTime: response.jwks.responseTime,

				// TODO F2
				// databaseConnected: response.database?.connected ?? false,
			});

			const statusCode = response.status === 'healthy' ? 200 : response.status === 'degraded' ? 200 : 503;
			res.status(statusCode).json(response);
		} catch (error) {
			await this.handleHealthError(req, res, error as Error, 'basic');
		}
	};

	/**
	 * Performs a health check on the service and its dependencies.
	 *
	 * @param type - The type of health check to perform. Use 'simple' for basic status or 'deep' for detailed diagnostics.
	 * @param requestId - A unique identifier for tracking the health check request.
	 * @param services - An array of service names to check as dependencies.
	 *
	 * @returns A promise that resolves to either a simple health response or a deep health response based on the type parameter.
	 * - For 'simple': Returns basic health information including status, timestamp, service name, version, uptime, requestId, and environment.
	 * - For 'deep': Returns comprehensive health information including all simple response fields plus dependencies status and system information.
	 *
	 * @remarks
	 * The overall status is determined by aggregating the status of all checked dependencies.
	 * Database health check is currently disabled (TODO F2).
	 *
	 * @example
	 * ```typescript
	 * // Simple health check
	 * const simpleHealth = await checkHealth('simple', 'req-123', ['auth', 'cache']);
	 *
	 * // Deep health check
	 * const deepHealth = await checkHealth('deep', 'req-456', ['auth', 'cache', 'queue']);
	 * ```
	 */

	public async checkHealth(type: 'simple', requestId: string, services: string[]): Promise<Interfaces.HealthResponse>;
	public async checkHealth(type: 'deep', requestId: string, services: string[]): Promise<Interfaces.DeepHealthResponse>;
	public async checkHealth(
		type: 'simple' | 'deep',
		requestId: string,
		services: string[]
	): Promise<Interfaces.HealthResponse | Interfaces.DeepHealthResponse> {
		const dependencies = await this.checkDependencies(services);
		const systemInfo = this.getSystemInfo();
		// TODO F1
		// const jwksHealth = await this.checkJwksAvailability();
		// TODO F2
		// const databaseHealth = await this.checkDatabaseHealth();

		// TODO Implement F2 property
		const overallStatus = this.determineOverallStatus(dependencies);

		const response: Partial<Interfaces.DeepHealthResponse> = {
			status: overallStatus,
			timestamp: this.clock.isoString(),
			service: this.config.serviceName,
			version: this.config.version,
			uptime: Math.floor(process.uptime() * 1000),
			requestId,
			environment: this.config.nodeEnv,
		};

		if (type === 'deep') {
			response.dependencies = dependencies;
			// TODO F1
			// response.jwks = jwksHealth;
			// TODO F2
			// response.database = databaseHealth;
			response.system = systemInfo;
			return response as Interfaces.DeepHealthResponse;
		}

		return response as Interfaces.HealthResponse;
	}

	/**
	 * Checks the health status of multiple service dependencies by verifying their registration
	 * and resolution in the dependency injection container.
	 *
	 * @param services - An array of service identifiers (tokens) to check
	 * @returns A promise that resolves to a record mapping service names to their health status,
	 *          including status ('healthy' or 'unhealthy'), descriptive message, and response time in milliseconds
	 *
	 * @remarks
	 * The method performs the following checks for each service:
	 * - If container supports `isRegistered`, verifies the service is registered
	 * - Attempts to resolve the service from the container
	 * - Measures response time for each check
	 * - Returns 'unhealthy' status if service is not registered, fails to resolve, or throws an error
	 * - Returns 'healthy' status if service is successfully resolved
	 *
	 * @example
	 * ```typescript
	 * const dependencies = await checkDependencies(['UserService', 'DatabaseService']);
	 * // Returns:
	 * // {
	 * //   'UserService': { status: 'healthy', message: '...', responseTime: 5 },
	 * //   'DatabaseService': { status: 'unhealthy', message: '...', responseTime: 3 }
	 * // }
	 * ```
	 */

	private async checkDependencies(services: string[]): Promise<Record<string, Interfaces.DependencyResponse>> {
		const dependencies: Record<string, Interfaces.DependencyResponse> = {};
		const checkers = this.healthRegistry.getCheckers();

		await Promise.all(
			Array.from(checkers.entries()).map(async ([name, checker]) => {
				const serviceStartTime = this.clock.timestamp();

				try {
					const result = await checker.checkHealth();
					dependencies[name] = {
						status: result.status,
						message: result.message || 'Operational',
						responseTime: this.clock.timestamp() - serviceStartTime,
					};
				} catch (error) {
					dependencies[name] = {
						status: 'unhealthy',
						message: error instanceof Error ? error.message : 'Unknown error',
						responseTime: this.clock.timestamp() - serviceStartTime,
					};
				}
			})
		);

		for (const service of services) {
			if (!dependencies[service]) {
				dependencies[service] = {
					status: 'unhealthy',
					message: `Critical service ${service} is failed`,
					responseTime: 0,
				};
			}
		}

		return dependencies;
	}

	/**
	 * Retrieves current system information including memory usage and uptime.
	 *
	 * Calculates memory statistics by examining total system memory, free memory,
	 * and derived used memory. The percentage is calculated as (used/total * 100)
	 * and rounded to the nearest integer.
	 *
	 * @returns {Interfaces.SystemInfoResponse} An object containing:
	 *   - memory: Object with used, free, total memory in bytes and usage percentage
	 *   - uptime: System uptime in seconds
	 *
	 * @private
	 */

	private getSystemInfo(): Interfaces.SystemInfoResponse {
		const totalMemory = os.totalmem();
		const freeMemory = os.freemem();
		const usedMemory = totalMemory - freeMemory;

		return {
			memory: {
				used: usedMemory,
				free: freeMemory,
				total: totalMemory,
				percentage: Math.round((usedMemory / totalMemory) * 100),
			},
			uptime: os.uptime(),
		};
	}

	/**
	 * Determines the overall health status of the system based on the health of its dependencies,
	 * JWKS (JSON Web Key Set) health, and database connectivity.
	 *
	 * @param dependencies - An object containing the health responses of various dependencies, keyed by dependency name.
	 * @param jwksHealth - The health response object for the JWKS endpoint.
	 * @param databaseHealth - The health response object for the database connection.
	 * @returns The overall health status, which can be 'healthy', 'unhealthy', or 'degraded'.
	 */

	private determineOverallStatus(
		dependencies: Record<string, Interfaces.DependencyResponse>
		// TODO F1
		// jwksHealth: Interfaces.JwksHealthResponse
		// TODO F2
		// databaseHealth: Interfaces.DatabaseHealthResponse
	): 'healthy' | 'unhealthy' | 'degraded' {
		const statuses = Object.values(dependencies).map((dep) => dep.status);

		if (statuses.some((s) => s === 'unhealthy')) {
			return 'unhealthy';
		}

		// TODO F1
		// if (jwksHealth.status !== 'healthy') {
		// 	return 'unhealthy';
		// }

		// TODO F2
		// if (!databaseHealth.connected) {
		// 	return 'unhealthy';
		// }

		if (statuses.some((status) => status === 'unhealthy')) {
			return 'unhealthy';
		} else if (statuses.some((status) => status === 'healthy')) {
			return 'healthy';
		} else {
			return 'degraded';
		}
	}

	/**
	 * Handles errors that occur during health check operations and sends an appropriate error response.
	 *
	 * This method logs the error details and returns a 503 Service Unavailable status with health
	 * information. If an error occurs while processing the health check error (e.g., config access fails),
	 * a safe fallback response is provided.
	 *
	 * @param req - The Express request object containing optional requestId
	 * @param res - The Express response object used to send the error response
	 * @param error - The error that occurred during the health check
	 * @param type - The type of health check that failed ('basic' or 'deep')
	 * @returns A promise that resolves when the error response has been sent
	 *
	 * @remarks
	 * - Generates a new requestId if one is not present in the request
	 * - Logs error details including message, stack trace, and requestId
	 * - Returns a 503 status code with partial health response data
	 * - Provides a safe fallback response if the error handling itself fails
	 * - The fallback response avoids accessing this.config to prevent cascading failures
	 */

	public async handleHealthError(req: Request, res: Response, error: Error, type: 'basic' | 'deep'): Promise<void> {
		try {
			const requestId = req.requestId || this.uuid.generate();

			this.logger.error(`${type} health check failed`, {
				requestId,
				error: error.message,
				stack: error.stack,
			});

			const errorResponse: Partial<Interfaces.HealthResponse> = {
				status: 'unhealthy',
				timestamp: this.clock.isoString(),
				service: this.config.serviceName,
				version: this.config.version,
				uptime: Math.floor(process.uptime() * 1000),
				requestId,
			};

			res.status(503).json(errorResponse);
		} catch (_) {
			// Fallback response: do NOT access this.config here because tests may install
			// getters that throw when reading config; return a safe static fallback instead.
			res.status(503).json({
				status: 'unhealthy',
				timestamp: new Date().toISOString(),
				service: undefined,
				version: '0.0.0',
				uptime: 0,
				error: 'Health check system failure',
			});
		}
	}

	/**
	 * Checks the availability and validity of the JWKS (JSON Web Key Set) service.
	 *
	 * This method performs a health check on the JWKS service by:
	 * - Resolving the JWKS service from the dependency container.
	 * - Fetching the JWKS and validating its structure and contents.
	 * - Ensuring the presence of required key fields and supported key types/algorithms.
	 * - Measuring and logging the response time and any issues encountered.
	 *
	 * @returns {Promise<Interfaces.JwksHealthResponse>} A promise that resolves to an object describing the health status of the JWKS service, including status, message, key count, and response time.
	 *
	 * remarks
	 * The method logs detailed warnings and errors for various unhealthy states, such as missing service, invalid response structure, empty key set, malformed keys, or unsupported key types/algorithms.
	 * If the JWKS service is operational and returns valid RSA keys, the status is reported as 'healthy'.
	 */

	// TODO F1
	// @LogContextMethod()
	// private async checkJwksAvailability(): Promise<Interfaces.JwksHealthResponse> {
	// 	const startTime = this.clock.timestamp();

	// 	try {
	// 		const jwksService = this.c.resolve('JwksService');

	// 		if (!jwksService) {
	// 			const responseTime = this.clock.timestamp() - startTime;
	// 			this.logger.warn('JWKS Service not available in container', { responseTime });
	// 			return {
	// 				status: 'unhealthy',
	// 				message: 'JWKS Service is not register or resolvable in container',
	// 				keyCount: 0,
	// 				responseTime,
	// 			};
	// 		}

	// 		const jwksResponse = await jwksService.getJwks();

	// 		if (!jwksResponse || !jwksResponse.keys || !Array.isArray(jwksResponse.keys)) {
	// 			const responseTime = this.clock.timestamp() - startTime;
	// 			this.logger.warn('JWKS Service returned invalid response structure', {
	// 				responseTime,
	// 				hasResponse: !!jwksResponse,
	// 				hasKeys: !!jwksResponse?.keys,
	// 				isKeyArray: Array.isArray(jwksResponse.keys),
	// 			});

	// 			return {
	// 				status: 'unhealthy',
	// 				message: 'JWKS Service returned invalid response structure',
	// 				keyCount: 0,
	// 				responseTime,
	// 			};
	// 		}

	// 		const keyCount = jwksResponse.keys.length;
	// 		const responseTime = this.clock.timestamp() - startTime;

	// 		if (keyCount === 0) {
	// 			this.logger.warn('JWKS Service returned empty key set', { responseTime });
	// 			return {
	// 				status: 'unhealthy',
	// 				message: 'JWKS Service returned empty key set - not cryptographic keys',
	// 				keyCount: 0,
	// 				responseTime,
	// 			};
	// 		}

	// 		const firstKey = jwksResponse.keys[0];
	// 		const requiredFields = ['kty', 'kid', 'use', 'alg', 'n', 'e'];
	// 		const hasRequiredFields = requiredFields.every((field) => Object.prototype.hasOwnProperty.call(firstKey, field));

	// 		if (!hasRequiredFields) {
	// 			const missingFields = requiredFields.filter((field) => !Object.prototype.hasOwnProperty.call(firstKey, field));
	// 			this.logger.warn('JWKS contains malformed keys', { responseTime, keyCount, missingFields, firstKeyFields: Object.keys(firstKey) });
	// 			return {
	// 				status: 'unhealthy',
	// 				message: `JWKS contains malformed keys missing required fields: ${missingFields.join(', ')}}`,
	// 				keyCount,
	// 				responseTime,
	// 			};
	// 		}

	// 		if (firstKey.kty !== 'RSA' || firstKey.alg !== 'RS256') {
	// 			this.logger.warn('JWKS contains unsupported key type or algorithm', {
	// 				responseTime,
	// 				keyCount,
	// 				keyType: firstKey.kty,
	// 				algorithm: firstKey.alg,
	// 			});

	// 			return {
	// 				status: 'unhealthy',
	// 				message: `JWKS contains unsupported key type (${firstKey.kty})or algorithm (${firstKey.alg})`,
	// 				keyCount,
	// 				responseTime,
	// 			};
	// 		}

	// 		this.logger.debug('JWKS availability check successful', { responseTime, keyCount, keyIds: jwksResponse.keys.map((k) => k.kid) });

	// 		return {
	// 			status: 'healthy',
	// 			message: `JWKS Service operational with ${keyCount} valid RSA keys${keyCount === 1 ? '' : 's'} for JWT operations`,
	// 			keyCount,
	// 			responseTime,
	// 		};
	// 	} catch (error) {
	// 		const responseTime = this.clock.timestamp() - startTime;
	// 		const errorMessage = getErrMsg(error);

	// 		this.logger.error('JWKS availability check failed', {
	// 			error: errorMessage,
	// 			responseTime,
	// 			stack: error instanceof Error ? error.stack : undefined,
	// 		});

	// 		return {
	// 			status: 'unhealthy',
	// 			message: `JWKS service check failed: ${errorMessage}`,
	// 			keyCount: 0,
	// 			responseTime,
	// 		};
	// 	}
	// }

	// TODO F2
	/**
	 * Checks the health status of the database by invoking the `dbHealthChecker` service.
	 *
	 * This method returns an object containing the connection status, latency, and the availability
	 * of specific tables. If the health checker is not available or an error occurs during the check,
	 * it returns a default response indicating failure and logs the error.
	 *
	 * @returns {Promise<Interfaces.DatabaseHealthResponse>} A promise that resolves to the database health status.
	 */

	// @LogContextMethod()
	// private async checkDatabaseHealth(): Promise<Interfaces.DatabaseHealthResponse> {
	// 	const defaultResponse: Interfaces.DatabaseHealthResponse = {
	// 		connected: false,
	// 		latency: 0,
	// 		tables: {
	// 			users: false,
	// 			oAuthClients: false,
	// 			authCodes: false,
	// 			refreshTokens: false,
	// 		},
	// 	};

	// 	try {
	// 		if (!this.dbHealthChecker) {
	// 			this.logger.warn('DataBaseHealthChecker not available in container');
	// 			return defaultResponse;
	// 		}

	// 		const healthStatus = await this.dbHealthChecker.getHealthStatus();

	// 		this.logger.debug('Database health check completed via DataBaseHealthCheckerService', {
	// 			connected: healthStatus.connected,
	// 			latency: healthStatus.latency,
	// 		});

	// 		return healthStatus;
	// 	} catch (error) {
	// 		this.logger.error('Database health check failed', {
	// 			error: getErrMsg(error),
	// 		});

	// 		return {
	// 			...defaultResponse,
	// 			error: getErrMsg(error),
	// 		};
	// 	}
	// }
}
