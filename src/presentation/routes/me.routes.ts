import { MeController } from '@presentation';
import { Router } from 'express';

//TODO documentar
export function createMeRoutes(ctl: MeController): Router {
	const router = Router();

	router.get('/me', ctl.handle);
	return router;
}
