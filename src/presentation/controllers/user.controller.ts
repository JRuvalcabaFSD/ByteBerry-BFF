import type * as UseCases from '@interfaces';
import { Injectable } from '@shared';
import { NextFunction, Request, Response } from 'express';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		UserController: UserController;
	}
}

@Injectable({
	name: 'UserController',
	depends: ['GetUserProfileUseCase', 'GetUserByTokenUseCase', 'RegisterUserUseCase', 'UpdateProfileUseCase', 'UpdateUserPasswordUseCase'],
})
export class UserController {
	constructor(
		private readonly getProfileUseCase: UseCases.IGetUserProfileUseCase,
		private readonly getMeUseCase: UseCases.IGetUserByTokenUseCase,
		private readonly registerUseCase: UseCases.IRegisterUserUseCase,
		private readonly updateUseCase: UseCases.IUpdateProfileUseCase,
		private readonly updatePasswordUseCase: UseCases.IUpdateUserPasswordUseCase
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

	public registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const response = await this.registerUseCase.execute(req.body);

			res.status(201).json(response);
		} catch (error) {
			next(error);
		}
	};

	public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const accessToken = req.session!.accessToken;
			const response = await this.updateUseCase.execute(accessToken, req.body);

			res.status(200).json(response);
		} catch (error) {
			next(error);
		}
	};

	public updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const accessToken = req.session!.accessToken;
			const response = await this.updatePasswordUseCase.execute(accessToken, req.body);

			res.status(200).json(response);
		} catch (error) {
			next(error);
		}
	};
}
