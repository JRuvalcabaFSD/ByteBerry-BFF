import { PKCEState } from '@domain';
import type { IClock, IConfig, ILogger, IPKCEStateManager } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Manages PKCE (Proof Key for Code Exchange) states in memory for secure OAuth flows.
 * This implementation stores states with their associated code verifiers and expiration times,
 * providing methods to store, consume, and clean up expired states.
 *
 * @implements {IPKCEStateManager}
 */

@LogContextClass()
@Injectable({ name: 'PKCEStateManager', depends: ['Config', 'Clock', 'Logger'] })
export class PKCEStateManager implements IPKCEStateManager {
	private readonly states: Map<string, PKCEState> = new Map();
	private readonly stateTtl: number;

	constructor(
		config: IConfig,
		private readonly clock: IClock,
		private readonly logger: ILogger
	) {
		this.stateTtl = config.pkceStateTtl * 1000;
		this.logger.info('PKCEStateManager initialized', {
			stateTtl: this.stateTtl,
		});
	}

	/**
	 * Stores the PKCE state and associated code verifier with an expiration timestamp.
	 * The state is stored in memory and will expire after the configured TTL.
	 *
	 * @param state - The unique state string used in the PKCE flow.
	 * @param codeVerifier - The code verifier string generated for the PKCE challenge.
	 */

	@LogContextMethod()
	public store(state: string, codeVerifier: string): void {
		const expiresAt = this.clock.timestamp() + this.stateTtl;

		this.states.set(state, {
			state,
			codeVerifier,
			expiresAt,
		});

		this.logger.debug('PKCE state stored', {
			state,
			expiresAt: new Date(expiresAt).toISOString(),
		});
	}

	/**
	 * Consumes the PKCE state associated with the given state string.
	 * If the state exists and has not expired, it returns the code verifier and removes the state.
	 * If the state is not found or has expired, it returns null and logs a warning.
	 * @param state - The state string to consume.
	 * @returns The code verifier if the state is valid and not expired, otherwise null.
	 */

	@LogContextMethod()
	public consume(state: string): string | null {
		const pkceState = this.states.get(state);

		if (!pkceState) {
			this.logger.warn('PKCE state not found', { state });
			return null;
		}

		if (this.clock.timestamp() > pkceState.expiresAt) {
			this.logger.warn('PKCE state expired', { state });
			this.states.delete(state);
			return null;
		}

		this.states.delete(state);
		this.logger.debug('PKCE state consumed', { state });

		return pkceState.codeVerifier;
	}

	/**
	 * Cleans up expired PKCE states from the in-memory store.
	 * Iterates through all stored states, removes those that have expired based on the current timestamp,
	 * and logs the cleanup process. Returns the number of states that were cleaned up.
	 *
	 * @returns The number of expired PKCE states that were removed.
	 */

	@LogContextMethod()
	public cleanup(): number {
		const before = this.states.size;
		const now = this.clock.timestamp();

		for (const [state, pkceState] of this.states.entries()) {
			if (now > pkceState.expiresAt) {
				this.states.delete(state);
				this.logger.debug('Expired PKCE state cleaned up', { state });
			}
		}

		const cleaned = before - this.states.size;

		if (cleaned > 0) {
			this.logger.info('PKCE state cleanup completed', {
				cleaned,
				remaining: this.states.size,
			});
		}

		return cleaned;
	}
}
