import type { Request, Response } from 'express';
import { DatabaseHealthResponse, DeepHealthResponse, HealthResponse } from '@interfaces';
import { ServiceMap } from '@ServiceMap';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		HealthService: IHealthService;
		HealthRegistry: IHealthRegistry;
	}
}

/**
 * Interface for performing health checks on the database.
 *
 * @remarks
 * This interface defines methods to verify the database connection,
 * check the existence and health of specific tables, and retrieve
 * an overall health status report for the database.
 *
 * @method checkConnection Checks if the database connection is healthy.
 * @returns A promise that resolves to `true` if the connection is healthy, otherwise `false`.
 *
 * @method checkTables Checks the health status of critical tables in the database.
 * @returns A promise that resolves to an object indicating the health of each table.
 *
 * @method getHealthStatus Retrieves a comprehensive health status report for the database.
 * @returns A promise that resolves to a {@link DatabaseHealthResponse} object.
 */

export interface IDatabaseHealthChecker {
	checkConnection(): Promise<boolean>;
	checkTables(): Promise<{ users: boolean; oAuthClients: boolean; authCodes: boolean; refreshTokens: boolean }>;
	getHealthStatus(): Promise<DatabaseHealthResponse>;
}

/**
 * Interface representing a health service for monitoring application and service status.
 *
 * @interface IHealthService
 *
 * @remarks
 * This interface defines methods for retrieving health information about the application and its services.
 * It includes methods for obtaining simple and deep health checks, as well as a generic method for checking the health of specified services.
 *
 * @method getHealth Retrieves a simple health status of the application.
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @returns A promise that resolves when the health status has been sent in the response.
 *
 * @method getDeepHealth Retrieves a detailed health status of the application and its dependencies.
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @returns A promise that resolves when the detailed health status has been sent in the response.
 *
 * @method checkHealth Performs a health check on specified services.
 * @param type - The type of health check to perform ('simple' or 'deep').
 * @param requestId - A unique identifier for the request.
 * @param services - An array of service names to check.
 * @returns A promise that resolves to either a simple {@link HealthResponse} or a detailed {@link DeepHealthResponse} based on the specified type.
 *
 * @example
 * ```typescript
 * const healthService: IHealthService = getHealthServiceInstance();
 *
 * // Perform a simple health check
 * const simpleHealth = await healthService.checkHealth('simple', 'req-123', ['database', 'cache']);
 *
 * // Perform a deep health check
 * const deepHealth = await healthService.checkHealth('deep', 'req-456', ['database', 'cache', 'externalApi']);
 * ```
 */

export interface IHealthService {
	getHealth(req: Request, res: Response): Promise<void>;
	getDeepHealth(req: Request, res: Response): Promise<void>;
	checkHealth<T extends 'simple' | 'deep'>(
		type: T,
		requestId: string,
		services: string[]
	): Promise<T extends 'deep' ? DeepHealthResponse : HealthResponse>;
}

/**
 * Interface for services that can perform a health check.
 *
 * Implementing classes should provide a method to check their health status,
 * returning a promise that resolves to an object indicating whether the service
 * is 'healthy' or 'unhealthy', with an optional message for additional context.
 */

export interface HealthCheckable {
	checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }>;
}

/**
 * Interface for a health registry that manages health checkable services.
 *
 * @remarks
 * This interface allows for the registration of services that can be health-checked,
 * and provides a method to retrieve all registered health checkers.
 *
 * @interface IHealthRegistry
 */

export interface IHealthRegistry {
	register(name: string, service: HealthCheckable): void;
	getCheckers(): Map<keyof ServiceMap, HealthCheckable>;
}
