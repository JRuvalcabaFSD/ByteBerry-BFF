import type { IOAuthClient, ICallbackUseCase, IConfig, IJwtVerifierClient, ILogger, IPKCEStateManager, ISessionManager } from '@interfaces';
import { AuthenticatedError, Injectable, LogContextClass, ValidateRequestError } from '@shared';
import { CallbackQuery, CallbackResponse } from 'src/application/dtos/auth.dto.js';

/**
 * Handles the OAuth2 callback flow, including error handling, PKCE state validation,
 * exchanging authorization codes for tokens, session creation, and user redirection.
 *
 * @remarks
 * This use case is responsible for processing the OAuth2 callback request after the user
 * authorizes the application. It validates the required parameters, verifies the PKCE state,
 * exchanges the authorization code for tokens, decodes the access token, creates a user session,
 * and returns a response with a redirect URL to the frontend.
 *
 * @constructor
 * @param config - Application configuration containing redirect URIs.
 * @param oauthClient - OAuth2 client for exchanging authorization codes for tokens.
 * @param pkceManager - PKCE state manager for validating and consuming code verifiers.
 * @param sessionManager - Session manager for creating and managing user sessions.
 * @param jwtVerifier - JWT verifier for decoding and validating access tokens.
 * @param logger - Logger instance for logging events and errors.
 *
 * @method execute
 * Processes the OAuth2 callback query, handles errors, validates PKCE state, exchanges code for tokens,
 * creates a session, and returns a response with user information and a redirect URL.
 *
 * @throws AuthenticatedError - If an OAuth2 error occurs or the state parameter is invalid or expired.
 * @throws ValidateRequestError - If required parameters are missing.
 *
 * @returns A promise that resolves to a {@link CallbackResponse} containing a success message,
 * the user ID, and a redirect URL.
 */

@LogContextClass()
@Injectable({
	name: 'CallbackUseCase',
	depends: ['Config', 'OAuthClient', 'PKCEStateManager', 'SessionManager', 'JwtVerifierClient', 'Logger'],
})
export class CallbackUseCase implements ICallbackUseCase {
	private readonly redirectUri: string;
	private readonly frontendUrl: string;

	constructor(
		config: IConfig,
		private readonly oauthClient: IOAuthClient,
		private readonly pkceManager: IPKCEStateManager,
		private readonly sessionManager: ISessionManager,
		private readonly jwtVerifier: IJwtVerifierClient,
		private readonly logger: ILogger
	) {
		this.redirectUri = config.bffClientRedirectUri;
		this.frontendUrl = config.frontendUrl;
	}
	/**
	 * Handles the OAuth2 callback flow by validating the authorization response,
	 * exchanging the authorization code for tokens, decoding the access token,
	 * and creating a user session.
	 *
	 * @param query - The callback query containing OAuth2 parameters such as code, state, and potential errors.
	 * @returns A promise that resolves to a `CallbackResponse` containing a success message, user ID, and redirect URL.
	 * @throws {AuthenticatedError} If an OAuth2 error is present or the state parameter is invalid or expired.
	 * @throws {ValidateRequestError} If required parameters (code or state) are missing.
	 */

	public async execute(query: CallbackQuery): Promise<CallbackResponse> {
		// Handle OAuth2 errors
		if (query.error) {
			this.logger.error('OAuth2 authorization error', {
				error: query.error,
				description: query.error_description,
			});
			throw new AuthenticatedError(query.error_description || query.error, 'OAuth2 Error');
		}

		// Validate required parameters
		if (!query.code || !query.state) throw new ValidateRequestError('Missing code or state parameter');

		// Retrieve and consume code_verifier (one-time use)
		const codeVerifier = this.pkceManager.consume(query.state);

		if (!codeVerifier) {
			this.logger.error('Invalid or expired state parameter', {
				state: query.state,
			});
			throw new AuthenticatedError('Invalid or expired state parameter', 'invalid state');
		}

		this.logger.debug('PKCE state validated', { state: query.state });

		// Exchange authorization code for tokens
		const tokens = await this.oauthClient.exchangeCodeForToken(query.code, codeVerifier, this.redirectUri);

		this.logger.info('Authorization code exchanged successfully', {
			tokenType: tokens.token_type,
			expiresIn: tokens.expires_in,
		});

		const payload = this.jwtVerifier.decode(tokens.access_token);

		const sessionId = this.sessionManager.createSession(payload.sub, {
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token!,
			token_type: tokens.token_type,
			expires_in: tokens.expires_in,
		});

		this.logger.info('User session created', {
			sessionId,
			userId: payload.sub,
			email: payload.email,
		});

		return {
			message: 'Authentication successful',
			sessionId,
			userId: payload.sub,
			redirectTo: `${this.frontendUrl}/dashboard`,
		};
	}
}
