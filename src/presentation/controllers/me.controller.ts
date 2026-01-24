import type { IGetCurrentUserUseCase } from '@interfaces';
import { Injectable } from '@shared';
import { NextFunction, Request, Response } from 'express';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		MeController: MeController;
	}
}

//TODO documentar
@Injectable({ name: 'MeController', depends: ['GetCurrentUserUseCase'] })
export class MeController {
	constructor(private readonly currentUserUseCase: IGetCurrentUserUseCase) {}

	public handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const payload = req.user;
			const requestId = req.requestId;

			const response = await this.currentUserUseCase.execute(payload, requestId!);
			res.status(200).json(response.toJSON());
		} catch (error) {
			next(error);
		}
	};
}
