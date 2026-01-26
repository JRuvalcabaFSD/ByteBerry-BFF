import { RANDOM_STRING_LENGTH } from '@shared';
import { createHash, randomBytes } from 'crypto';

/**
 * Generates a random string of the specified length using cryptographically secure random bytes,
 * and encodes it in a URL-safe Base64 format.
 *
 * @param length - The desired length of the random string. Defaults to `RANDOM_STRING_LENGTH`.
 * @returns A URL-safe Base64 encoded random string.
 */

export function generateRandomString(length: number = RANDOM_STRING_LENGTH): string {
	const bytes = randomBytes(length);
	return base64UrlEncode(bytes);
}

/**
 * Generates a code verifier string for PKCE (Proof Key for Code Exchange) authentication flows.
 * Utilizes a random string generator with a predefined length.
 *
 * @returns {string} A securely generated random string to be used as a code verifier.
 */

export function generateCodeVerifier(): string {
	return generateRandomString(RANDOM_STRING_LENGTH);
}

/**
 * Generates a PKCE (Proof Key for Code Exchange) code challenge from a given code verifier.
 *
 * This function creates a SHA-256 hash of the provided code verifier and encodes it using base64 URL encoding,
 * as specified in the PKCE (RFC 7636) standard for OAuth 2.0.
 *
 * @param codeVerifier - The original code verifier string to be transformed into a code challenge.
 * @returns The base64 URL-encoded SHA-256 hash of the code verifier, suitable for use as a PKCE code challenge.
 */

export function generateCodeChallenge(codeVerifier: string): string {
	const hash = createHash('sha256').update(codeVerifier).digest();
	return base64UrlEncode(hash);
}

/**
 * Generates a random state string for use in authentication flows or other scenarios
 * where a unique, unpredictable value is required.
 *
 * @returns {string} A randomly generated string of length defined by `RANDOM_STRING_LENGTH`.
 */

export function generateState(): string {
	return generateRandomString(RANDOM_STRING_LENGTH);
}

/**
 * Encodes a Buffer into a base64url string.
 *
 * This function converts the input Buffer to a base64-encoded string,
 * then replaces characters to make the output URL-safe according to the base64url specification:
 * - Replaces '+' with '-'
 * - Replaces '/' with '_'
 * - Removes '=' padding characters
 *
 * @param buffer - The Buffer to encode.
 * @returns The base64url-encoded string representation of the input buffer.
 */

function base64UrlEncode(buffer: Buffer): string {
	return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generates PKCE (Proof Key for Code Exchange) parameters for OAuth 2.0 authentication flows.
 *
 * This function creates a random state, a code verifier, and a code challenge
 * according to the PKCE specification. These parameters are used to enhance the
 * security of OAuth 2.0 authorization code flows by mitigating authorization code interception attacks.
 *
 * @returns An object containing:
 * - `state`: A cryptographically random string used to maintain state between the request and callback.
 * - `codeVerifier`: A high-entropy cryptographic random string used as the PKCE code verifier.
 * - `codeChallenge`: A base64-url-encoded SHA256 hash of the code verifier, used as the PKCE code challenge.
 */

export function generatePKCEParams(): {
	state: string;
	codeVerifier: string;
	codeChallenge: string;
} {
	const state = generateState();
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = generateCodeChallenge(codeVerifier);

	return {
		state,
		codeVerifier,
		codeChallenge,
	};
}
