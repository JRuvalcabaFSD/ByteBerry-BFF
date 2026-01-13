import { HealthCheckable } from '../services/health.service.interface.js';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		Config: IConfig;
	}
}

/**
 * Represents the possible values for the Node.js environment.
 *
 * - `'development'`: Used during development.
 * - `'production'`: Used in production deployments.
 * - `'test'`: Used when running tests.
 */

export type NodeEnv = 'development' | 'production' | 'test';

/**
 * Represents the available logging levels for application output.
 *
 * - `'debug'`: Detailed information, typically of interest only when diagnosing problems.
 * - `'info'`: Informational messages that highlight the progress of the application.
 * - `'warn'`: Potentially harmful situations that are not necessarily errors.
 * - `'error'`: Error events that might still allow the application to continue running.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

//TODO documentar
export interface IConfig extends HealthCheckable {
	// Core environments
	readonly nodeEnv: NodeEnv;
	readonly port: number;
	readonly version: string;
	readonly serviceName: string;
	readonly serviceUrl: string;
	readonly logLevel: LogLevel;
	readonly logRequests: boolean;

	//Security
	readonly corsOrigins: string[];

	//Functions.
	isDevelopment(): boolean;
	isProduction(): boolean;
	isTest(): boolean;
}
