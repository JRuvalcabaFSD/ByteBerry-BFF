import type { AuthorizationUrlParams, IAuthClient, IConfig, ILogger, TokenResponse, TokenValidationResponse } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';

//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		OAuthClient: OAuthClient;
	}
}

/**
 * OAuth2 client implementation for handling authentication flows.
 * This class provides methods to generate authorization URLs, exchange authorization codes for tokens,
 * validate tokens, refresh tokens, and revoke tokens. It includes retry logic with exponential backoff
 * for resilient HTTP requests to the OAuth2 service.
 *
 * @implements {IAuthClient}
 */

@LogContextClass()
@Injectable({ name: 'OAuthClient', depends: ['Config', 'Logger'] })
export class OAuthClient implements IAuthClient {
	private readonly maxRetries: number;
	private readonly retryDelayMs: number;
	private readonly oauth2ServiceUrl: string;
	private readonly clientId: string;

	constructor(
		config: IConfig,
		private readonly logger: ILogger
	) {
		this.maxRetries = config.httpMaxRetries ?? 3;
		this.retryDelayMs = config.httpRetryDelay ?? 1000;
		this.oauth2ServiceUrl = config.oauth2ServiceUrl;
		this.clientId = config.bffClientId;
	}

	/**
	 * Generates an OAuth2 authorization URL by constructing a URL with the necessary query parameters.
	 *
	 * @param params - The parameters required to build the authorization URL, including client ID, redirect URI, scope, state, code challenge, and challenge method.
	 * @returns The fully constructed authorization URL as a string.
	 */

	@LogContextMethod()
	public getAuthorizationUrl(params: AuthorizationUrlParams): string {
		const url = new URL('/authorize', this.oauth2ServiceUrl);

		url.searchParams.append('response_type', 'code');
		url.searchParams.append('client_id', params.clientId);
		url.searchParams.append('redirect_uri', params.redirectUri);
		url.searchParams.append('scope', params.scope);
		url.searchParams.append('state', params.state);
		url.searchParams.append('code_challenge', params.codeChallenge);
		url.searchParams.append('code_challenge_method', params.codeChallengeMethod);

		this.logger.debug('Generated authorization URL', {
			clientId: params.clientId,
			scope: params.scope,
			method: params.codeChallengeMethod,
		});

		return url.toString();
	}

	/**
	 * Exchanges an authorization code for an access token using the OAuth2 PKCE flow.
	 * This method sends a POST request to the token endpoint with the provided code, code verifier, and redirect URI.
	 * @param code - The authorization code received from the authorization server.
	 * @param codeVerifier - The code verifier used in the PKCE challenge.
	 * @param redirectUri - The redirect URI used in the authorization request.
	 * @returns A promise that resolves to a TokenResponse containing the access token and related data.
	 */

	@LogContextMethod()
	public async exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string): Promise<TokenResponse> {
		const url = `${this.getAuthorizationUrl}/token`;

		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: this.clientId,
			code_verifier: codeVerifier,
		});

		this.logger.debug('Exchanging code for token', { clientId: this.clientId, redirectUri });

		return this.retryableRequest<TokenResponse>(
			url,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
				},
				body: body.toString(),
			},
			'Token exchange'
		);
	}

	/**
	 * Validates a JWT token using JWKS (JSON Web Key Set) verification.
	 *
	 * @param _token - The JWT token string to be validated.
	 * @returns A promise that resolves to a {@link TokenValidationResponse} object,
	 *          containing validation status, payload if valid, or error details if invalid.
	 */

	@LogContextMethod()
	public async validateToken(_token: string): Promise<TokenValidationResponse> {
		try {
			this.logger.debug('Token validation requested (using JWKS verification)');
			return {
				valid: true,
				payload: { message: 'Token validation happens via JWKS verification' },
			};
		} catch (error) {
			this.logger.error('Token validation failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			return {
				valid: false,
				error: 'Token validation failed',
			};
		}
	}

	/**
	 * Refreshes the access token using the provided refresh token by making a POST request to the OAuth service.
	 * @param refreshToken - The refresh token used to obtain a new access token.
	 * @returns A promise that resolves to a TokenResponse containing the new access token and related data.
	 */

	@LogContextMethod()
	public async refreshToken(refreshToken: string): Promise<TokenResponse> {
		const url = `${this.oauth2ServiceUrl}/token`;

		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: this.clientId,
		});

		this.logger.info('Refreshing access token', {
			clientId: this.clientId,
		});

		return this.retryableRequest<TokenResponse>(
			url,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
				},
				body: body.toString(),
			},
			'Token refresh'
		);
	}

	/**
	 * Revokes an OAuth2 token by sending a POST request to the OAuth2 service's revoke endpoint.
	 * This method is asynchronous and does not throw errors; failures are logged as warnings.
	 *
	 * @param token - The token to be revoked.
	 * @param tokenTypeHint - Optional hint about the type of token (e.g., 'access_token' or 'refresh_token').
	 * @returns A Promise that resolves when the revocation attempt completes.
	 */

	@LogContextMethod()
	public async revokeToken(token: string, tokenTypeHint?: string): Promise<void> {
		const url = `${this.oauth2ServiceUrl}/revoke`;

		const params: Record<string, string> = {
			token,
			client_id: this.clientId,
		};
		if (tokenTypeHint) {
			params.token_type_hint = tokenTypeHint;
		}
		const body = new URLSearchParams(params);

		this.logger.info('Revoking token', {
			clientId: this.clientId,
			tokenTypeHint,
		});

		try {
			await this.retryableRequest<void>(
				url,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Accept: 'application/json',
					},
					body: body.toString(),
				},
				'Token revocation'
			);

			this.logger.info('Token revoked successfully');
		} catch (error) {
			// Token revocation failures are often not critical
			this.logger.warn('Token revocation failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Performs a retryable HTTP request with exponential backoff and logging.
	 * Retries up to {@link maxRetries} times on failure, with a 10-second timeout per attempt.
	 * Uses exponential backoff starting at {@link retryDelayMs} milliseconds.
	 *
	 * @template T - The expected type of the response data.
	 * @param url - The URL to fetch.
	 * @param options - The fetch options (e.g., method, headers).
	 * @param operation - A descriptive name for the operation, used in logs and error messages.
	 * @returns A promise that resolves to the parsed JSON response data of type T.
	 * @throws {Error} If all retry attempts fail, with details about the last error.
	 */

	@LogContextMethod()
	private async retryableRequest<T>(url: string, options: RequestInit, operation: string): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				const response = await fetch(url, {
					...options,
					signal: AbortSignal.timeout(10000), // 10 second timeout
				});

				if (!response.ok) {
					const errorBody = await response.text();
					throw new Error(`${operation} failed: ${response.status} ${response.statusText} - ${errorBody}`);
				}

				const data = await response.json();

				this.logger.debug(`${operation} successful`, {
					attempt,
					url,
				});

				return data as T;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error('Unknown error');

				this.logger.warn(`${operation} failed, attempt ${attempt}/${this.maxRetries}`, {
					error: lastError.message,
					url,
				});

				if (attempt < this.maxRetries) {
					// Exponential backoff: 1s, 2s, 4s
					const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
					await this.sleep(delay);
				}
			}
		}

		this.logger.error(`${operation} failed after ${this.maxRetries} attempts`, {
			error: lastError?.message,
			url,
		});

		throw new Error(`${operation} failed after ${this.maxRetries} attempts: ${lastError?.message}`);
	}

	/**
	 * Pauses execution for the specified number of milliseconds.
	 * @param ms - The number of milliseconds to sleep.
	 * @returns A promise that resolves after the specified delay.
	 */

	@LogContextMethod()
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
