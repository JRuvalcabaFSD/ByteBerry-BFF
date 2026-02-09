import { RequestHandler, Router } from 'express';
import { UserController } from '../controllers/user.controller.js';

export function createUserRoutes(controller: UserController, requireAuth: RequestHandler): Router {
	const router = Router();
	router.post('/register', controller.registerUser);
	router.get('/me', requireAuth, controller.getProfile);
	router.put('/me', requireAuth, controller.updateProfile);
	router.put('/me/password', requireAuth, controller.updatePassword);
	return router;
}
