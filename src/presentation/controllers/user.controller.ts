import type { IGetUserByTokenUseCase, IGetUserProfileUseCase } from '@interfaces';
import { Injectable } from '@shared';
import { NextFunction, Request, Response } from 'express';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		UserController: UserController;
	}
}

@Injectable({ name: 'UserController', depends: ['GetUserProfileUseCase', 'GetUserByTokenUseCase'] })
export class UserController {
	constructor(
		private readonly getProfileUseCase: IGetUserProfileUseCase,
		private readonly getMeUseCase: IGetUserByTokenUseCase
	) {}

	public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const accessToken = req.session?.accessToken;
			const response = await this.getMeUseCase.execute(accessToken!);

			res.status(200).json(response);
		} catch (error) {
			next(error);
		}
	};

	public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const accessToken = req.session?.accessToken;
			const response = await this.getProfileUseCase.execute(accessToken!);

			res.status(200).json(response);
		} catch (error) {
			next(error);
		}
	};
}
