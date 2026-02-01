import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';

export function createUserRoutes(controller: UserController): Router {
	const router = Router();
	router.get('/me', controller.getProfile);
	return router;
}
