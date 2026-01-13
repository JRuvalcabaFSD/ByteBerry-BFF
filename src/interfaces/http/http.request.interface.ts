import { NodeEnv } from '@interfaces';

/**
 * Represents the response containing system information.
 *
 * @property memory - An object containing memory statistics:
 *   - used: The amount of memory currently used (in bytes).
 *   - free: The amount of free memory available (in bytes).
 *   - total: The total amount of memory (in bytes).
 *   - percentage: The percentage of memory used (0-100).
 * @property uptime - The system uptime in seconds.
 */

export type SystemInfoResponse = { memory: { used: number; free: number; total: number; percentage: number }; uptime: number };

/**
 * Represents the health check response of a dependency.
 *
 * @property status - Indicates whether the dependency is 'healthy' or 'unhealthy'.
 * @property message - A descriptive message about the health status.
 * @property responseTime - (Optional) The response time of the dependency in milliseconds.
 */

export type DependencyResponse = { status: 'healthy' | 'unhealthy'; message: string; responseTime?: number };

/**
 * Represents the response structure for the home/root endpoint of the service.
 *
 * @interface HomeResponse
 * @property {string} service - The name of the service
 * @property {string} version - The current version of the service
 * @property {string} status - The operational status of the service
 * @property {string} timestamp - The timestamp when the response was generated
 * @property {string | undefined} [requestId] - Optional unique identifier for the request
 * @property {NodeEnv} environment - The current environment (e.g., development, production)
 * @property {Record<string, unknown> | string[]} endpoints - Available API endpoints, either as an object or array of strings
 */

export interface HomeResponse {
	service: string;
	version: string;
	status: string;
	timestamp: string;
	requestId?: string | undefined;
	environment: NodeEnv;
	endpoints: Record<string, unknown> | string[];
}

/**
 * Represents the health status response of a service.
 *
 * @property status - The current health status of the service. Can be 'healthy', 'unhealthy', or 'degraded'.
 * @property timestamp - The ISO timestamp when the health check was performed.
 * @property service - The name or identifier of the service being checked.
 * @property version - The version of the service.
 * @property uptime - The uptime of the service in seconds.
 * @property requestId - The unique identifier for the health check request.
 * @property environment - The environment in which the service is running (e.g., development, production).
 */

export interface HealthResponse {
	status: 'healthy' | 'unhealthy' | 'degraded';
	timestamp: string;
	service: string;
	version: string;
	uptime: number;
	requestId: string;
	environment: NodeEnv;
}

/**
 * Represents the health status of the database, including connection state,
 * latency, table availability, record counts, and any error information.
 *
 * @property connected - Indicates if the database is currently connected.
 * @property latency - The measured latency (in milliseconds) for database operations.
 * @property tables - An object indicating the availability of key tables in the database.
 * @property tables.users - Whether the 'users' table is accessible.
 * @property tables.oAuthClients - Whether the 'oAuthClients' table is accessible.
 * @property tables.authCodes - Whether the 'authCodes' table is accessible.
 * @property tables.refreshTokens - Whether the 'refreshTokens' table is accessible.
 * @property recordCounts - (Optional) The number of records in each key table.
 * @property recordCounts.users - The number of records in the 'users' table.
 * @property recordCounts.oAuthClients - The number of records in the 'oAuthClients' table.
 * @property recordCounts.authCodes - The number of records in the 'authCodes' table.
 * @property recordCounts.refreshTokens - The number of records in the 'refreshTokens' table.
 * @property error - (Optional) Error message if the health check failed or encountered issues.
 */

export interface DatabaseHealthResponse {
	connected: boolean;
	latency: number;
	tables: {
		users: boolean;
		oAuthClients: boolean;
		authCodes: boolean;
		refreshTokens: boolean;
	};
	recordCounts?: {
		users: number;
		oAuthClients: number;
		authCodes: number;
		refreshTokens: number;
	};
	error?: string;
}

/**
 * Represents the health check response for a JWKS (JSON Web Key Set) endpoint.
 *
 * @property status - Indicates the health status of the JWKS endpoint. Can be either 'healthy' or 'unhealthy'.
 * @property message - A descriptive message providing additional information about the health status.
 * @property keyCount - The number of keys currently available in the JWKS endpoint.
 * @property responseTime - The response time (in milliseconds) taken to check the JWKS endpoint's health.
 */

export interface JwksHealthResponse {
	status: 'healthy' | 'unhealthy';
	message: string;
	keyCount: number;
	responseTime: number;
}

/**
 * Represents a detailed health check response, extending the basic `HealthResponse`.
 *
 * @remarks
 * This interface provides additional information about the application's health,
 * including the status of dependencies, JWKS, database, and system information.
 *
 * @extends HealthResponse
 *
 * @property {Record<string, unknown>} dependencies - A record containing the health status of various dependencies.
 * @property {JwksHealthResponse} jwks - The health status of the JSON Web Key Set (JWKS) service.
 * @property {DatabaseHealthResponse} database - The health status of the database connection.
 * @property {ISystemInfoResponse} system - Information about the system's health and environment.
 */

export interface DeepHealthResponse extends HealthResponse {
	dependencies: Record<string, unknown>;
	jwks: JwksHealthResponse;
	database: DatabaseHealthResponse;
	system: SystemInfoResponse;
}
