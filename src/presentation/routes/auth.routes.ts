import { AuthController } from '@presentation';
import { Router } from 'express';

//TODO documentar
export function createAuthRoutes(controller: AuthController): Router {
	const router = Router();

	router.get('/login', controller.login);
	router.get('/callback', controller.callback);
	router.post('/logout', controller.logout);

	return router;
}
