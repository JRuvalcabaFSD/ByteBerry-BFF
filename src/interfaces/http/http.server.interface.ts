import { Application } from 'express';
import { HealthCheckable } from '../services/health.service.interface.js';

/**
 * Extends the global ServiceMap interface to include the IConfig interface.
 * This allows for type-safe access to configuration settings throughout the application.
 * @module @ServiceMap
 * @interface ServiceMap
 */

declare module '@ServiceMap' {
	interface ServiceMap {
		HttpServer: IHttpServer;
	}
}

/**
 * Represents the runtime information and status of an HTTP server.
 *
 * @property {number} port - The port number on which the server is listening.
 * @property {boolean} isRunning - Indicates whether the server is currently running.
 * @property {Date} [startTime] - The timestamp when the server was started. Optional field that may be undefined if the server hasn't been started yet.
 */
export type ServerInfo = {
	port: number;
	isRunning: boolean;
	startTime?: Date;
};

/**
 * Interface defining the contract for HTTP server implementations.
 *
 * @interface IHttpServer
 *
 * @remarks
 * This interface provides methods to manage the lifecycle of an HTTP server,
 * including starting, stopping, and querying its current state.
 *
 * @example
 * ```typescript
 * class MyHttpServer implements IHttpServer {
 *   async start(): Promise<void> {
 *     // Implementation
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface IHttpServer extends HealthCheckable {
	start(): Promise<void>;
	stop(): Promise<void>;
	getApp(): Promise<Application>;
	isRunning(): boolean;
	getServeInfo(): ServerInfo;
}
