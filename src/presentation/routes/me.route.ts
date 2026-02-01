import { UserController } from '@presentation';
import { Router } from 'express';

/**
 * Creates an Express router for user-related endpoints.
 *
 * Registers the `/me` GET endpoint, which retrieves information about the currently authenticated user.
 *
 * @param controller - An instance of `UserController` that handles the request logic for the `/me` endpoint.
 * @returns An Express `Router` with the `/me` route configured.
 */

export function createMeRouter(controller: UserController): Router {
	const router = Router();
	router.get('/me', controller.getMe);
	return router;
}
