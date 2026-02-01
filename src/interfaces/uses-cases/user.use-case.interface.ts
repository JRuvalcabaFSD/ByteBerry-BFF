import { UserResponse, UserTokenResponse } from '@application';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		GetUserProfileUseCase: IGetUserProfileUseCase;
		GetUserByTokenUseCase: IGetUserByTokenUseCase;
	}
}

/**
 * Represents a use case for retrieving the current authenticated user's information.
 *
 * @interface IGetCurrentUserUseCase
 *
 * @method execute - Retrieves the current user's information using an access token.
 * @param {string} accessToken - The access token used to authenticate and retrieve the current user.
 * @returns {Promise<UserResponse>} A promise that resolves to the current user's information.
 */

export interface IGetUserProfileUseCase {
	execute(accessToken: string): Promise<UserResponse>;
}

/**
 * Use case interface for retrieving a user based on an access token.
 *
 * @remarks
 * Implementations of this interface should handle the logic for validating the access token
 * and returning the corresponding user information.
 *
 * @method execute
 * @param accessToken - The access token used to identify and authenticate the user.
 * @returns A promise that resolves to a {@link UserTokenResponse} containing user details.
 */

export interface IGetUserByTokenUseCase {
	execute(accessToken: string): Promise<UserTokenResponse>;
}
