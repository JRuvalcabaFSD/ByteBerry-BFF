import { AuthenticatedError, Injectable } from '@shared';
import { NextFunction, Request, Response } from 'express';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		MeController: MeController;
	}
}

//TODO documentar
@Injectable({ name: 'MeController' })
export class MeController {
	public handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			if (!req.user) throw new AuthenticatedError('User not authenticated. Auth middleware may not be applied');

			const userInfo = req.user;
			const requestId = req.requestId;

			const response = {
				data: userInfo,
				timestamp: new Date().toISOString(),
				requestId,
			};
			res.status(200).json(response);
		} catch (error) {
			next(error);
		}
	};
}
