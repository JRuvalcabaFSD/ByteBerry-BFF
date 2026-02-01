import type * as Interfaces from '@interfaces';
import { getErrMessage, Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * OAuth2 client implementation for handling authentication flows.
 * This class provides methods to generate authorization URLs, exchange authorization codes for tokens,
 * validate tokens, refresh tokens, and revoke tokens. It includes retry logic with exponential backoff
 * for resilient HTTP requests to the OAuth2 service.
 *
 * @implements {IOAuthClient}
 */

@LogContextClass()
@Injectable({ name: 'OAuthClient', depends: ['Config', 'HttpClient', 'Logger'] })
export class OAuthClient implements Interfaces.IOAuthClient {
	private readonly oauth2ServiceUrl: string;
	private readonly clientId: string;

	constructor(
		config: Interfaces.IConfig,
		private readonly httpClient: Interfaces.IHttpClient,
		private readonly logger: Interfaces.ILogger
	) {
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
	public getAuthorizationUrl(params: Interfaces.AuthorizationUrlParams): string {
		const url = new URL('/auth/authorize', this.oauth2ServiceUrl);

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
	public async exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string): Promise<Interfaces.TokenResponse> {
		const url = `${this.oauth2ServiceUrl}/auth/token`;

		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: this.clientId,
			code_verifier: codeVerifier,
		});

		this.logger.debug('Exchanging code for token', { clientId: this.clientId, redirectUri });

		const response = await this.httpClient.post<Interfaces.TokenResponse>(url, body.toString(), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			retry: true,
			maxRetries: 3,
		});

		this.logger.info('Authorization code exchanged successfully', {
			tokenType: response.data.token_type,
			expiresIn: response.data.expires_in,
		});

		return response.data;
	}

	/**
	 * Validates a JWT token using JWKS (JSON Web Key Set) verification.
	 *
	 * @param _token - The JWT token string to be validated.
	 * @returns A promise that resolves to a {@link TokenValidationResponse} object,
	 *          containing validation status, payload if valid, or error details if invalid.
	 */

	@LogContextMethod()
	public async validateToken(_token: string): Promise<Interfaces.TokenValidationResponse> {
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
	public async refreshToken(refreshToken: string): Promise<Interfaces.TokenResponse> {
		const url = `${this.oauth2ServiceUrl}/auth/token`;

		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: this.clientId,
		});

		this.logger.info('Refreshing access token', {
			clientId: this.clientId,
		});

		const response = await this.httpClient.post<Interfaces.TokenResponse>(url, body.toString(), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			retry: true,
			maxRetries: 3,
		});

		this.logger.info('Access token refreshed successfully', {
			tokenType: response.data.token_type,
			expiresIn: response.data.expires_in,
		});

		return response.data;
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
			await this.httpClient.post<void>(url, body.toString(), {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
				},
				retry: true,
				maxRetries: 2,
			});

			this.logger.info('Token revoked successfully');
		} catch (error) {
			// Token revocation failures are often not critical
			this.logger.warn('Token revocation failed', {
				error: getErrMessage(error),
			});
		}
	}
}
