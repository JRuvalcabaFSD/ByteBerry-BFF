import type { LoginResponse } from '@application';
import { generatePKCEParams, Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { IOAuthClient, IConfig, ILogger, ILoginUseCase, IPKCEStateManager } from '@interfaces';

/**
 * Handles the OAuth2 login flow using PKCE for enhanced security.
 *
 * The `LoginUseCase` class is responsible for initiating the login process by generating
 * PKCE parameters, storing the code verifier, and constructing the authorization URL
 * for the OAuth2 flow. It logs the initiation of the flow and returns the authorization URL
 * to the caller.
 *
 * @remarks
 * This use case is intended to be used in a BFF (Backend For Frontend) context,
 * where it manages the OAuth2 login redirection and PKCE state management.
 *
 * @implements {ILoginUseCase}
 *
 * @param config - Application configuration containing OAuth2 client details.
 * @param oauthClient - Service for building OAuth2 authorization URLs.
 * @param pkceManager - Service for managing PKCE state and code verifiers.
 * @param logger - Logger for audit and debugging purposes.
 *
 * @method execute
 * Initiates the OAuth2 login flow and returns the authorization URL.
 *
 * @returns {LoginResponse} An object containing the authorization URL for the OAuth2 login.
 */

@LogContextClass()
@Injectable({ name: 'LoginUseCase', depends: ['Config', 'OAuthClient', 'PKCEStateManager', 'Logger'] })
export class LoginUseCase implements ILoginUseCase {
	private readonly bffClientId: string;
	private readonly redirectUri: string;
	private readonly defaultScope: string;

	constructor(
		config: IConfig,
		private readonly oauthClient: IOAuthClient,
		private readonly pkceManager: IPKCEStateManager,
		private readonly logger: ILogger
	) {
		this.bffClientId = config.bffClientId;
		this.redirectUri = config.bffClientRedirectUri;
		this.defaultScope = 'read write';
	}

	/**
	 * Initiates the OAuth2 authorization flow using PKCE.
	 *
	 * Generates PKCE parameters (state, codeVerifier, codeChallenge), stores the codeVerifier for later use,
	 * constructs the authorization URL, logs the initiation of the flow, and returns the authorization URL.
	 *
	 * @returns {LoginResponse} An object containing the generated authorization URL for the OAuth2 flow.
	 */

	@LogContextMethod()
	public execute(): LoginResponse {
		// Generate PKCE parameters
		const { state, codeVerifier, codeChallenge } = generatePKCEParams();

		// Store codeVerifier for later use in callback
		this.pkceManager.store(state, codeVerifier);

		// Build authorization URL
		const authorizationUrl = this.oauthClient.getAuthorizationUrl({
			clientId: this.bffClientId,
			redirectUri: this.redirectUri,
			scope: this.defaultScope,
			state,
			codeChallenge,
			codeChallengeMethod: 'S256',
		});

		this.logger.info('OAuth2 authorization flow initiated', {
			state,
			redirectUri: this.redirectUri,
			scope: this.defaultScope,
		});

		return { authorizationUrl };
	}
}
