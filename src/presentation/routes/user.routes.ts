import { RequestHandler, Router } from 'express';
import { UserController } from '../controllers/user.controller.js';

export function createUserRoutes(controller: UserController, requireAuth: RequestHandler): Router {
	const router = Router();
	router.get('/me', requireAuth, controller.getProfile);
	router.post('/register', controller.registerUser);
	router.put('/me', requireAuth, controller.updateProfile);
	return router;
}
