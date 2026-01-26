//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		PKCEStateManager: IPKCEStateManager;
	}
}

/**
 * Interface for managing PKCE (Proof Key for Code Exchange) state and code verifiers.
 * This is used in OAuth 2.0 flows to securely handle authorization codes and prevent replay attacks.
 */

export interface IPKCEStateManager {
	/**
	 * Stores the given state and its associated code verifier.
	 * @param state - The unique state string used in the OAuth flow.
	 * @param codeVerifier - The code verifier string generated for PKCE.
	 */

	store(state: string, codeVerifier: string): void;

	/**
	 * Consumes and returns the code verifier for the given state, removing it from storage.
	 * @param state - The state string to look up.
	 * @returns The code verifier if found, or null if not present.
	 */

	consume(state: string): string | null;

	/**
	 * Cleans up expired or invalid entries from storage.
	 * @returns The number of entries that were cleaned up.
	 */

	cleanup(): number;
}
