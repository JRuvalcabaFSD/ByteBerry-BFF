import { IHealthService } from '@interfaces';
import { Router } from 'express';

/**
 * Creates and returns an Express router with health check endpoints.
 *
 * @param service - An implementation of the IHealthService interface providing health check handlers.
 * @returns An Express Router instance with `/` and `/deep` GET endpoints for health checks.
 *
 * - `GET /` invokes `service.getHealth` for a basic health check.
 * - `GET /deep` invokes `service.getDeepHealth` for a more comprehensive health check.
 */

export function createHealthRoutes(service: IHealthService): Router {
	const router = Router();
	router.get('/', service.getHealth);
	router.get('/deep', service.getDeepHealth);
	return router;
}
