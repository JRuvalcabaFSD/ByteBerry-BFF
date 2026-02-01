import type { IConfig, IGetUserProfileUseCase, IHttpClient, ILogger } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';
import { UserResponse } from 'src/application/dtos/user.dto.js';

/**
 * Use case for retrieving the current authenticated user's information.
 *
 * Fetches user details from the OAuth2 service using the provided access token.
 *
 * @implements {IGetUserProfileUseCase}
 *
 * @example
 * ```typescript
 * const useCase = new GetCurrentUseCase(config, httpClient, logger);
 * const userResponse = await useCase.execute(accessToken);
 * ```
 */

@LogContextClass()
@Injectable({ name: 'GetUserProfileUseCase', depends: ['Config', 'HttpClient', 'Logger'] })
export class GetCurrentUseCase implements IGetUserProfileUseCase {
	private readonly oauth2BaseUrl: string;

	constructor(
		config: IConfig,
		private readonly httpClient: IHttpClient,
		public readonly logger: ILogger
	) {
		this.oauth2BaseUrl = config.oauth2ServiceUrl;
	}

	/**
	 * Retrieves the current user's information using the provided access token.
	 *
	 * @param accessToken - The OAuth2 access token used for authentication.
	 * @returns A promise that resolves to the current user's information.
	 *
	 * @throws Will throw an error if the HTTP request fails after the specified number of retries.
	 */

	@LogContextMethod()
	public async execute(accessToken: string): Promise<UserResponse> {
		this.logger.debug('Getting current user info');

		const response = await this.httpClient.get<UserResponse>(`${this.oauth2BaseUrl}/user/me`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			retry: true,
			maxRetries: 2,
		});

		this.logger.debug('User info retrieved successfully', {
			userId: response.data.user.id,
		});

		return response.data;
	}
}
