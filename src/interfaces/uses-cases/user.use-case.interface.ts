import { UserInfoDTO } from '@application';
import { IJwtPayload } from '@interfaces';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		GetCurrentUserUseCase: IGetCurrentUserUseCase;
	}
}

/**
 * Interface for the use case to retrieve the current user's information.
 */

export interface IGetCurrentUserUseCase {
	/**
	 * Executes the use case to get the current user based on token information.
	 * @param payload - The user information extracted from the token.
	 * @returns A promise that resolves to the user's information.
	 */

	execute(payload: IJwtPayload, requestId: string): Promise<UserInfoDTO>;
}
