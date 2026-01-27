import { CallbackQuery, CallbackResponse, LoginResponse, LogoutResponse } from '@application';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		LoginUseCase: ILoginUseCase;
		CallbackUseCase: ICallbackUseCase;
		LogoutUseCase: ILogoutUseCase;
	}
}

/**
 * Interface representing the login use case.
 * Defines the contract for executing a login operation.
 *
 * @interface ILoginUseCase
 */

export interface ILoginUseCase {
	execute(): LoginResponse;
}

/**
 * Use case interface for handling authentication callbacks.
 *
 * @remarks
 * Implement this interface to define the logic for processing authentication callback queries,
 * such as those received from OAuth providers or other external authentication mechanisms.
 *
 * @method execute
 * @param query - The callback query containing relevant authentication data.
 * @returns A promise that resolves to a {@link CallbackResponse} object.
 */

export interface ICallbackUseCase {
	execute(query: CallbackQuery): Promise<CallbackResponse>;
}

/**
 * Represents the use case for logging out a user session.
 *
 * @remarks
 * This interface defines the contract for implementing the logout functionality,
 * which typically involves invalidating a user session identified by a session ID.
 *
 * @method execute
 * Executes the logout process for the specified session.
 *
 * @param sessionId - The unique identifier of the session to be terminated.
 * @returns A promise that resolves to a {@link LogoutResponse} indicating the result of the logout operation.
 */

export interface ILogoutUseCase {
	execute(sessionId: string): Promise<LogoutResponse>;
}
