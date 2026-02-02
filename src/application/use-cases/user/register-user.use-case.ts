import { Injectable, LogContextClass, LogContextMethod, ValidateRequestError } from '@shared';
import type { RegisterUserRequest, RegisterUserResponse } from '@application';
import type { IConfig, IHttpClient, ILogger, IRegisterUserUseCase } from '@interfaces';

/**
 * Use case for registering a new user by proxying the request to an OAuth2 service.
 *
 * This class implements the `IRegisterUserUseCase` interface and handles the user registration
 * process by sending the registration data to an external OAuth2 service using the provided HTTP client.
 *
 * @remarks
 * - The registration request is proxied to the OAuth2 service endpoint (`/user`).
 * - The request includes retry logic with a maximum of 2 retries.
 * - Debug logs are generated with the user's email and username.
 *
 * @example
 * ```typescript
 * const useCase = new RegisterUserUseCase(config, httpClient, logger);
 * const response = await useCase.execute({ email: 'user@example.com', username: 'user123', ... });
 * ```
 *
 * @param config - Configuration object containing the OAuth2 service URL.
 * @param httpClient - HTTP client used to send requests to the OAuth2 service.
 * @param logger - Logger for debug and error messages.
 */

@LogContextClass()
@Injectable({ name: 'RegisterUserUseCase', depends: ['Config', 'HttpClient', 'Logger'] })
export class RegisterUserUseCase implements IRegisterUserUseCase {
	private readonly oauth2BaseUrl: string;
	constructor(
		config: IConfig,
		private readonly httpClient: IHttpClient,
		private readonly logger: ILogger
	) {
		this.oauth2BaseUrl = config.oauth2ServiceUrl;
	}

	/**
	 * Registers a new user by proxying the registration request to the OAuth2 service.
	 *
	 * @param data - The registration request containing user details such as email and username.
	 * @returns A promise that resolves to the registration response from the OAuth2 service.
	 */

	@LogContextMethod()
	public async execute(data: RegisterUserRequest): Promise<RegisterUserResponse> {
		if (data) {
			this.logger.debug('Proxying user registration to OAuth2', {
				email: data.email,
				username: data.username,
			});
		}

		const response = await this.httpClient.post<RegisterUserResponse>(`${this.oauth2BaseUrl}/user`, data, {
			headers: {
				'Content-Type': 'application/json',
			},
			retry: true,
			maxRetries: 2,
		});

		return response.data;
	}
}
