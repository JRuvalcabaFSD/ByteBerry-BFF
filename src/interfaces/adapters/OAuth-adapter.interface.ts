/* eslint-disable @typescript-eslint/no-explicit-any */
//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		AuthClient: IAuthClient;
	}
}

/**
 * Parameters required to generate an OAuth2 authorization URL.
 *
 * @property clientId - The client application's unique identifier issued by the authorization server.
 * @property redirectUri - The URI to which the authorization server will redirect the user after authorization.
 * @property scope - A space-delimited list of scopes that specify the level of access requested.
 * @property state - An opaque value used to maintain state between the request and callback, typically for CSRF protection.
 * @property codeChallenge - A challenge derived from the code verifier, used in PKCE to enhance security.
 * @property codeChallengeMethod - The method used to generate the code challenge, either 'S256' (SHA-256) or 'plain'.
 */

export interface AuthorizationUrlParams {
	clientId: string;
	redirectUri: string;
	scope: string;
	state: string;
	codeChallenge: string;
	codeChallengeMethod: 'S256' | 'plain';
}

/**
 * Represents the response from an OAuth token endpoint, containing access token details.
 * @interface TokenResponse
 * @property {string} access_token - The access token string.
 * @property {string} token_type - The type of the token (e.g., "Bearer").
 * @property {number} expires_in - The number of seconds until the token expires.
 * @property {string | undefined} refresh_token - Optional refresh token for obtaining a new access token.
 * @property {string | undefined} scope - Optional scope of the access token.
 */

export interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string | undefined;
	scope?: string | undefined;
}

/**
 * Represents the response from a token validation operation.
 *
 * @interface TokenValidationResponse
 * @property {boolean} valid - Indicates whether the token is valid.
 * @property {any} [payload] - The decoded payload of the token, if valid.
 * @property {string} [error] - An error message if the token is invalid.
 */

export interface TokenValidationResponse {
	valid: boolean;
	payload?: any;
	error?: string;
}

/**
 * Interface for an authentication client that handles OAuth2 authorization flows.
 * This interface defines methods for generating authorization URLs, exchanging codes for tokens,
 * validating tokens, refreshing tokens, and revoking tokens.
 */

export interface IAuthClient {
	/**
	 * Generates the authorization URL for initiating the OAuth2 flow.
	 * @param params - The parameters required to build the authorization URL.
	 * @returns The fully constructed authorization URL as a string.
	 */

	getAuthorizationUrl(params: AuthorizationUrlParams): string;

	/**
	 * Exchanges an authorization code for an access token and refresh token.
	 * @param code - The authorization code received from the authorization server.
	 * @param codeVerifier - The code verifier used in the PKCE flow.
	 * @param redirectUri - The redirect URI used in the authorization request.
	 * @returns A promise that resolves to the token response containing access and refresh tokens.
	 */

	exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string): Promise<TokenResponse>;

	/**
	 * Validates the given access token.
	 * @param token - The access token to validate.
	 * @returns A promise that resolves to the token validation response.
	 */

	validateToken(token: string): Promise<TokenValidationResponse>;

	/**
	 * Refreshes an access token using the provided refresh token.
	 * @param refreshToken - The refresh token to use for obtaining a new access token.
	 * @returns A promise that resolves to the new token response.
	 */

	refreshToken(refreshToken: string): Promise<TokenResponse>;

	/**
	 * Revokes the specified token.
	 * @param token - The token to revoke (access or refresh).
	 * @param tokenTypeHint - Optional hint about the type of token being revoked.
	 * @returns A promise that resolves when the token has been revoked.
	 */

	revokeToken(token: string, tokenTypeHint?: string): Promise<void>;
}
