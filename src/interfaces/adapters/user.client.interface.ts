import * as Interfaces from '@application';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		UserClient: IUserClient;
	}
}

/**
 * Interface representing the user client adapter for user-related operations.
 *
 * @remarks
 * This interface defines methods for registering users, updating user profiles,
 * changing user passwords, and revoking refresh tokens. All methods return promises
 * and interact with user data through defined request and response interfaces.
 *
 * @method registerUser Registers a new user with the provided data.
 * @param data - The registration request data.
 * @returns A promise resolving to the registration response.
 *
 * @method updateUserProfile Updates the profile of an authenticated user.
 * @param accessToken - The access token of the user.
 * @param data - The profile update request data.
 * @returns A promise resolving to the profile update response.
 *
 * @method changeUserPassword Changes the password of an authenticated user.
 * @param accessToken - The access token of the user.
 * @param data - The password change request data.
 * @returns A promise resolving to the password change response.
 *
 * @method revokeRefreshToken Revokes a user's refresh token.
 * @param refreshToken - The refresh token to be revoked.
 * @returns A promise that resolves when the token is revoked.
 */

export interface IUserClient {
	registerUser(data: Interfaces.RegisterUserRequest): Promise<Interfaces.RegisterUserResponse>;
	updateUserProfile(accessToken: string, data: Interfaces.UpdateUserProfileRequest): Promise<Interfaces.UpdateUserProfileResponse>;
	changeUserPassword(accessToken: string, data: Interfaces.ChangePasswordRequest): Promise<Interfaces.ChangePasswordResponse>;
	revokeRefreshToken(refreshToken: string): Promise<void>;
}
