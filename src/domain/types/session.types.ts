/**
 * Represents the data associated with a user session.
 *
 * @property sessionId - Unique identifier for the session.
 * @property userId - Unique identifier for the user associated with the session.
 * @property accessToken - Access token issued for the session.
 * @property refreshToken - Refresh token used to obtain new access tokens.
 * @property tokenType - Type of the token (e.g., "Bearer").
 * @property expiresAt - Expiration timestamp (in milliseconds since epoch) for the access token.
 * @property createdAt - Timestamp (in milliseconds since epoch) when the session was created.
 * @property lastActivityAt - Timestamp (in milliseconds since epoch) of the user's last activity in the session.
 */

export interface SessionData {
	sessionId: string;
	userId: string;
	accessToken: string;
	refreshToken: string | null;
	tokenType: string;
	expiresAt: number;
	createdAt: number;
	lastActivityAt: number;
}

/**
 * Represents the state information required for a PKCE (Proof Key for Code Exchange) authentication flow.
 *
 * @property state - A unique string used to maintain state between the request and callback, and to prevent CSRF attacks.
 * @property codeVerifier - A cryptographically random string used as the code verifier in the PKCE flow.
 * @property expiresAt - The UNIX timestamp (in milliseconds) indicating when this PKCE state expires.
 */

export interface PKCEState {
	state: string;
	codeVerifier: string;
	expiresAt: number;
}
