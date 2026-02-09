import * as Dtos from '@application';

/**
 * Extensión del mapa de servicios para incluir casos de uso relacionados con usuarios.
 *
 * Este módulo declara interfaces adicionales en el mapa de servicios global,
 * permitiendo la inyección de dependencias para los casos de uso de usuario.
 */
declare module '@ServiceMap' {
	interface ServiceMap {
		GetUserProfileUseCase: IGetUserProfileUseCase;
		GetUserByTokenUseCase: IGetUserByTokenUseCase;
		RegisterUserUseCase: IRegisterUserUseCase;
		UpdateProfileUseCase: IUpdateProfileUseCase;
		UpdateUserPasswordUseCase: IUpdateUserPasswordUseCase;
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
	execute(accessToken: string): Promise<Dtos.UserResponse>;
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
	execute(accessToken: string): Promise<Dtos.UserTokenResponse>;
}

/**
 * Use case interface for registering a new user.
 *
 * @remarks
 * Implementations of this interface should handle the logic required to register a user,
 * including validation, persistence, and any necessary side effects.
 *
 * @method execute
 * @param data - The registration request containing user details.
 * @returns A promise that resolves to the registration response.
 */

export interface IRegisterUserUseCase {
	execute(data: Dtos.RegisterUserRequest): Promise<Dtos.RegisterUserResponse>;
}

/**
 * Use case interface for updating a user's profile.
 *
 * @remarks
 * Implementations of this interface should handle the logic required to update a user profile,
 * including validation, persistence, and any necessary side effects.
 *
 * @method execute
 * @param data - The update request containing user details.
 * @returns A promise that resolves to the update response.
 */

export interface IUpdateProfileUseCase {
	execute(accessToken: string, data: Dtos.UpdateUserRequest): Promise<Dtos.UpdateUserResponse>;
}

/**
 * Use case interface for updating a user's password.
 *
 * @remarks
 * Implementations of this interface should handle the logic required to update a user's password,
 * including validation, security checks, and any necessary side effects.
 *
 * @method execute
 * @param accessToken - The access token used to authenticate the user.
 * @param data - The update request containing password details.
 * @returns A promise that resolves to the update response.
 */

export interface IUpdateUserPasswordUseCase {
	execute(accessToken: string, data: Dtos.UpdatePasswordRequest): Promise<Dtos.UpdatePasswordResponse>;
}
