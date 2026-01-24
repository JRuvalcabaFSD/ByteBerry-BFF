//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		JwtVerifier: IJwtVerifier;
	}
}

/**
 * Represents the payload of a JSON Web Token (JWT), containing standard claims and additional fields.
 * This interface defines the structure for JWT payloads used in authentication and authorization processes.
 *
 * @interface IJwtPayload
 * @property {string} iss - The issuer of the JWT, typically a unique identifier for the entity that issued the token.
 * @property {string} sub - The subject of the JWT, usually a unique identifier for the user or entity the token is about.
 * @property {string} aud - The audience of the JWT, indicating the intended recipients or services that should accept the token.
 * @property {number} exp - The expiration time of the JWT, represented as a Unix timestamp (seconds since epoch).
 * @property {number} iat - The issued at time of the JWT, represented as a Unix timestamp indicating when the token was issued.
 * @property {string} client_id - The client identifier, often used in OAuth flows to identify the client application.
 * @property {string | undefined} scope - Optional scope of the JWT, defining the permissions or access levels granted by the token.
 * @property {string} kid - Optional key identifier, used to specify which key was used to sign the JWT, aiding in key selection for verification.
 */

export interface IJwtPayload {
	iss: string;
	sub: string;
	aud: string | string[];
	exp: number;
	iat: number;
	email: string;
	username: string;
	roles: string[];
	client_id: string;
	scope?: string | undefined;
	kid?: string;
}

/**
 * Interface for JWT verification services.
 */
export interface IJwtVerifier {
	/**
	 * Verifies a JWT token and returns the payload if valid.
	 * @param token - The JWT token to verify.
	 * @returns A promise that resolves to the JWT payload.
	 */
	verify(token: string): Promise<IJwtPayload>;

	/**
	 * Decodes a JWT token without verification.
	 * @param token - The JWT token to decode.
	 * @returns The decoded JWT payload.
	 */
	decode(token: string): IJwtPayload;
}
