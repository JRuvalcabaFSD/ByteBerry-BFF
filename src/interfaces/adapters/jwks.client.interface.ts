//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		JwksClient: IJwksClient;
	}
}

/**
 * Represents a JSON Web Key (JWK) as defined in RFC 7517.
 * This interface describes the structure of a JSON Web Key, typically used for cryptographic operations.
 * It includes properties for an RSA public key, such as the key type, intended use, algorithm, key ID, modulus, and exponent.
 *
 * @interface JWK
 */

export interface JWK {
	kty: string;
	use: string;
	alg: string;
	kid: string;
	n: string;
	e: string;
}

/**
 * Represents a JSON Web Key Set (JWKS) response.
 * Contains an array of JSON Web Keys (JWKs) used for verifying JSON Web Tokens.
 */

export interface JWKSResponse {
	keys: JWK[];
}

/**
 * Interface for adapting JWKS (JSON Web Key Set) client operations.
 * Provides methods to retrieve public keys, convert JWKs to PEM format, and manage caching.
 */

export interface IJwksClient {
	/**
	 * Retrieves the public key associated with the specified key ID (kid).
	 * @param kid - The key ID of the public key to retrieve.
	 * @returns A promise that resolves to the public key as a string.
	 */

	getPublicKey(kid: string): Promise<string>;

	/**
	 * Converts a JSON Web Key (JWK) object to PEM format.
	 * @param jwk - The JWK object to convert.
	 * @returns The PEM-formatted string representation of the key.
	 */

	jwkToPem(jwk: JWK): string;

	/**
	 * Clears any cached public keys or related data.
	 */

	clearCache(): void;
}
