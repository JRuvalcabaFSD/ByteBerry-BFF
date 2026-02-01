import crypto from 'crypto';

import type { IConfig, IHttpClient, IJwksClient, ILogger, JWK, JWKSResponse } from '@interfaces';
import { AuthenticatedError, getErrMessage, Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Adapter for fetching and caching JSON Web Key Sets (JWKS) from an OAuth2 service.
 * This class implements the IJwksClientAdapter interface and provides methods to retrieve
 * public keys by their Key ID (kid), convert JWK to PEM format, and manage a local cache
 * to reduce network requests.
 *
 * The cache is invalidated after a configurable TTL (Time To Live) period, ensuring
 * that keys are refreshed periodically. If a requested key is not found in the cache
 * or after a fresh fetch, an AuthenticatedError is thrown.
 *
 * @example
 * ```typescript
 * const adapter = new JwksAdapter(config, logger);
 * const publicKey = await adapter.getPublicKey('some-kid');
 * ```
 */

@LogContextClass()
@Injectable({ name: 'JwksClient', depends: ['Config', 'HttpClient', 'Logger'] })
export class JwksClient implements IJwksClient {
	private cache: Map<string, string> = new Map();
	private cacheTimestamp: number = 0;
	private readonly CACHE_TTL: number;
	private readonly jwksUrl: string;

	constructor(
		config: IConfig,
		private readonly httpClient: IHttpClient,
		private readonly logger: ILogger
	) {
		this.CACHE_TTL = config.jwksCacheTtl * 1000;
		this.jwksUrl = config.jwksUrl;
	}

	/**
	 * Retrieves the public key associated with the specified key ID (kid) from the JWKS endpoint.
	 * If the key is cached and the cache is valid, it returns the cached key.
	 * Otherwise, it fetches the JWKS from the OAuth2 service, updates the cache, and returns the key.
	 *
	 * @param kid - The key ID of the public key to retrieve.
	 * @returns A promise that resolves to the public key as a string.
	 * @throws {AuthenticatedError} If the JWKS fetch fails, the response is invalid, or the key is not found.
	 */

	// TODO Revisar errores personalizados
	@LogContextMethod()
	public async getPublicKey(kid: string): Promise<string> {
		if (this.isCacheValid() && this.cache.has(kid)) {
			this.logger.debug('Returning cached public key', { kid });
			return this.cache.get(kid)!;
		}

		this.logger.debug('Fetching JWKS from OAuth2', { jwksUrl: this.jwksUrl });

		try {
			const response = await this.httpClient.get<JWKSResponse>(this.jwksUrl, {
				headers: {
					Accept: 'application/json',
				},
				timeout: 5000,
				retry: true,
				maxRetries: 3,
			});

			const jwks = response.data;

			if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0)
				throw new AuthenticatedError('Invalid JWKS response: no keys found', 'Invalid Jwks Response');

			this.updateCache(jwks.keys);

			const publicKey = this.cache.get(kid);

			if (!publicKey) throw new AuthenticatedError(`Public key not found for kid: ${kid}`, 'KEY_NOT_FOUND');

			this.logger.debug('Public key fetched successfully', { kid });

			return publicKey;
		} catch (error) {
			if (error instanceof AuthenticatedError) {
				throw error;
			}

			this.logger.error('Error fetching JWKS', { error: getErrMessage(error), jwksUrl: this.jwksUrl });

			throw new AuthenticatedError('Failed to fetch public key from OAuth2 service', 'JWKS_FETCH_ERROR');
		}
	}

	/**
	 * Converts a JSON Web Key (JWK) to its PEM representation.
	 *
	 * This method takes a JWK object containing RSA modulus (n) and exponent (e),
	 * creates a public key object using Node.js crypto module, and exports it
	 * in SPKI PEM format.
	 *
	 * @param jwk - The JSON Web Key object with RSA parameters.
	 * @returns The PEM-encoded public key as a string.
	 */

	public jwkToPem(jwk: JWK): string {
		const { n, e } = jwk;

		const keyObject = crypto.createPublicKey({
			key: {
				kty: 'RSA',
				n: n,
				e: e,
			},
			format: 'jwk',
		});
		return keyObject.export({
			type: 'spki',
			format: 'pem',
		}) as string;
	}

	/**
	 * Clears the JWKS cache, resets the cache timestamp to 0, and logs a debug message.
	 */

	public clearCache(): void {
		this.cache.clear();
		this.cacheTimestamp = 0;
		this.logger.debug('JWKS cache cleared');
	}

	/**
	 * Checks if the JWKS cache is still valid based on the cache timestamp and TTL.
	 * Logs a debug message if the cache has expired.
	 * @returns {boolean} True if the cache is valid, false otherwise.
	 */

	@LogContextMethod()
	private isCacheValid(): boolean {
		const now = Date.now();
		const isValid = now - this.cacheTimestamp < this.CACHE_TTL;

		if (!isValid) {
			this.logger.debug('JWKS cache expired');
		}

		return isValid;
	}

	/**
	 * Updates the JWKS cache by clearing the existing cache and populating it with the provided JWK keys.
	 * Each key is converted to PEM format and stored using its 'kid' as the cache key.
	 * Also updates the cache timestamp and logs the update details.
	 *
	 * @param keys - An array of JWK objects to be added to the cache.
	 * @private
	 */

	@LogContextMethod()
	private updateCache(keys: JWK[]) {
		this.cache.clear();

		for (const key of keys) {
			if (key.kid) {
				const pem = this.jwkToPem(key);
				this.cache.set(key.kid, pem);
			}
		}
		this.cacheTimestamp = Date.now();

		this.logger.debug('JWKS cache updated', {
			keyCount: this.cache.size,
			kids: Array.from(this.cache.keys()),
		});
	}
}
