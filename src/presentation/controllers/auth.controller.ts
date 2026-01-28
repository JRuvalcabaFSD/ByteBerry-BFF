import { CallbackQuery } from '@application';
import type { ICallbackUseCase, IConfig, ILoginUseCase, ILogoutUseCase } from '@interfaces';
import { Injectable } from '@shared';
import { NextFunction, Request, Response } from 'express';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		AuthController: AuthController;
	}
}

/**
 * Controller responsible for handling authentication-related HTTP requests.
 *
 * This includes login, callback, and logout operations. It manages session cookies
 * and delegates business logic to corresponding use cases.
 *
 * @remarks
 * - Uses injected configuration for cookie and session management.
 * - Relies on `ILoginUseCase`, `ICallbackUseCase`, and `ILogoutUseCase` for core authentication logic.
 *
 * @example
 * ```typescript
 * const controller = new AuthController(config, loginUseCase, callbackUseCase, logoutUseCase);
 * ```
 */

@Injectable({ name: 'AuthController', depends: ['Config', 'LoginUseCase', 'CallbackUseCase', 'LogoutUseCase'] })
export class AuthController {
	private readonly sessionCookieName: string;
	private readonly cookieOptions: {
		httpOnly: boolean;
		secure: boolean;
		sameSite: 'strict' | 'lax' | 'none';
		domain: string;
		maxAge: number;
	};

	constructor(
		config: IConfig,
		private readonly loginUseCase: ILoginUseCase,
		private readonly callbackUseCase: ICallbackUseCase,
		private readonly logoutUseCase: ILogoutUseCase
	) {
		this.sessionCookieName = config.sessionCookieName;
		this.cookieOptions = {
			httpOnly: config.cookieHttpOnly,
			secure: config.isProduction(),
			sameSite: config.cookieSameSite,
			domain: config.cookieDomain,
			maxAge: config.sessionMaxAge,
		};
	}

	/**
	 * Handles the login request by initiating the authentication flow.
	 * Executes the login use case to obtain the authorization URL and redirects the user to it.
	 * If an error occurs during the process, it forwards the error to the next middleware.
	 *
	 * @param req - Express request object.
	 * @param res - Express response object.
	 * @param next - Express next middleware function.
	 * @returns A promise that resolves when the response is sent or an error is handled.
	 */

	public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { authorizationUrl } = this.loginUseCase.execute();

			res.redirect(authorizationUrl);
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Handles the authentication callback by processing the query parameters,
	 * executing the callback use case, and redirecting the user to the appropriate URL.
	 *
	 * @param req - The Express request object containing the callback query parameters.
	 * @param res - The Express response object used to redirect the user.
	 * @param next - The Express next function for error handling.
	 * @returns A Promise that resolves when the redirect is performed or an error is passed to the next middleware.
	 */

	public callback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const query = req.query as unknown as CallbackQuery;

			const result = await this.callbackUseCase.execute(query);

			res.cookie(this.sessionCookieName, result.sessionId, this.cookieOptions);

			// TODO Cambiar a rediredcción
			res.redirect(result.redirectTo);
		} catch (error) {
			next(error);
		}
	};

	/**
	 * Handles user logout by clearing the session cookie and invoking the logout use case.
	 *
	 * @param req - Express request object containing cookies.
	 * @param res - Express response object used to clear the session cookie and send the response.
	 * @param next - Express next function for error handling.
	 * @returns A promise that resolves when the logout process is complete.
	 *
	 * @throws Passes any errors to the next middleware for centralized error handling.
	 */

	public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const sessionId = req.cookies[this.sessionCookieName];

			const result = await this.logoutUseCase.execute(sessionId);

			res.clearCookie(this.sessionCookieName, {
				httpOnly: this.cookieOptions.httpOnly,
				secure: this.cookieOptions.secure,
				sameSite: this.cookieOptions.sameSite,
				domain: this.cookieOptions.domain,
			});

			res.status(200).json(result);
		} catch (error) {
			next(error);
		}
	};
}
