import type { IGetUserByTokenUseCase, IJwtVerifierClient, ILogger } from '@interfaces';
import { AuthenticatedError, Injectable, LogContextClass, LogContextMethod } from '@shared';
import { UserTokenResponse } from 'src/application/dtos/user.dto.js';

/**
 * Use case for retrieving user information based on a provided JWT access token.
 *
 * This class verifies the given access token using the injected `IJwtVerifierClient`
 * and extracts user details from the token payload. If the token is invalid or
 * improperly formatted, an `AuthenticatedError.invalidTokenFormat` is thrown.
 *
 * @implements IGetUserByTokenUseCase
 *
 * @constructor
 * @param jwtVerifier - The client responsible for verifying JWT access tokens.
 * @param logger - Logger instance for debugging and tracing execution.
 *
 * @method execute
 * @param accessToken - The JWT access token to verify and extract user information from.
 * @returns A promise that resolves to a `UserTokenResponse` containing user details.
 * @throws AuthenticatedError.invalidTokenFormat if the token is invalid or cannot be verified.
 */

@LogContextClass()
@Injectable({ name: 'GetUserByTokenUseCase', depends: ['JwtVerifierClient', 'Logger'] })
export class GetUserByTokenUseCase implements IGetUserByTokenUseCase {
	constructor(
		private readonly jwtVerifier: IJwtVerifierClient,
		public readonly logger: ILogger
	) {}

	/**
	 * Retrieves the current user's information based on the provided access token.
	 *
	 * @param accessToken - The JWT access token used to identify and authenticate the user.
	 * @returns A promise that resolves to a {@link UserTokenResponse} containing user details such as userId, email, username, roles, and scope.
	 * @throws {AuthenticatedError} If the token format is invalid or verification fails.
	 */

	@LogContextMethod()
	public async execute(accessToken: string): Promise<UserTokenResponse> {
		this.logger.debug('Getting current user info');

		const payload = await this.jwtVerifier.verify(accessToken);

		if (!payload) {
			throw AuthenticatedError.invalidTokenFormat();
		}

		this.logger.debug('User info retrieved successfully', {
			userId: payload.sub,
		});

		return {
			userId: payload.sub,
			email: payload.email,
			username: payload.username,
			roles: payload.roles ?? [],
			scope: payload.scope ?? '',
		};
	}
}
