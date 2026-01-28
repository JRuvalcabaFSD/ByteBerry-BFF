/**
 * Represents the response from a login operation, typically used in authentication flows
 * such as OAuth, where the client needs to redirect the user to an authorization URL.
 * @interface LoginResponse
 */

export interface LoginResponse {
	authorizationUrl: string;
}

/**
 * Represents the query parameters received in an OAuth or authentication callback.
 * This interface is used to handle responses from authorization servers, including success and error cases.
 * @interface CallbackQuery
 */

export interface CallbackQuery {
	/** The authorization code returned by the authorization server upon successful authentication. */
	code: string;
	/** The state parameter used to maintain state between the request and callback, typically to prevent CSRF attacks. */
	state: string;
	/** An optional error code indicating that the authorization request failed. */
	error?: string;
	/** An optional human-readable description of the error, providing more details about the failure. */
	error_description?: string;
}

/**
 * Represents the response returned from an authentication callback.
 * @interface CallbackResponse
 * @property {string} message - A message describing the result of the callback operation.
 * @property {string} userId - The unique identifier of the authenticated user.
 * @property {string} sessionId - The unique identifier for the user's session.
 * @property {string} redirectTo - The URL path or endpoint to redirect the user to after authentication.
 */

export interface CallbackResponse {
	message: string;
	userId: string;
	sessionId: string;
	redirectTo: string;
}

/**
 * Represents the response returned after a successful logout operation.
 * @property {string} message - A descriptive message about the logout result.
 * @property {string} timestamp - The ISO string timestamp of when the logout occurred.
 */

export interface LogoutResponse {
	message: string;
	timestamp: string;
}
