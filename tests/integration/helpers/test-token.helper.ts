import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { IJwtPayload, JWK, JWKSResponse } from '@interfaces';

/**
 * Helper class for generating test tokens and JWKS for integration tests
 */
export class TestTokenHelper {
	private readonly privateKey: crypto.KeyObject;
	private readonly publicKey: crypto.KeyObject;
	private readonly keyId: string;

	constructor(keyId: string = 'test-key-1') {
		const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
			modulusLength: 2048,
		});
		this.privateKey = privateKey;
		this.publicKey = publicKey;
		this.keyId = keyId;
	}

	/**
	 * Gets the key ID used for this helper
	 */
	public getKeyId(): string {
		return this.keyId;
	}

	/**
	 * Gets the public key in PEM format
	 */
	public getPublicKeyPem(): string {
		return this.publicKey.export({ type: 'spki', format: 'pem' }) as string;
	}

	/**
	 * Gets the private key in PEM format
	 */
	public getPrivateKeyPem(): string {
		return this.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
	}

	/**
	 * Generates a valid JWT token with the specified payload
	 */
	public generateToken(payload: Partial<IJwtPayload>, options: { expiresIn?: number; skipKid?: boolean } = {}): string {
		const now = Math.floor(Date.now() / 1000);
		const defaultPayload: IJwtPayload = {
			iss: 'http://localhost:4001',
			sub: 'test-user-id',
			aud: 'bff-client',
			exp: now + (options.expiresIn ?? 3600),
			iat: now,
			email: 'test@example.com',
			username: 'testuser',
			roles: ['user'],
			client_id: 'test-client',
			scope: 'read write',
		};

		const finalPayload = { ...defaultPayload, ...payload };

		const signOptions: jwt.SignOptions = {
			algorithm: 'RS256',
		};

		if (!options.skipKid) {
			signOptions.keyid = this.keyId;
		}

		return jwt.sign(finalPayload, this.getPrivateKeyPem(), signOptions);
	}

	/**
	 * Generates an expired token
	 */
	public generateExpiredToken(payload: Partial<IJwtPayload> = {}): string {
		return this.generateToken({
			...payload,
			exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
		});
	}

	/**
	 * Generates a token that will expire soon (within 5 minutes)
	 */
	public generateExpiringSoonToken(payload: Partial<IJwtPayload> = {}): string {
		return this.generateToken({
			...payload,
			exp: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
		});
	}

	/**
	 * Generates a token without the kid in header
	 */
	public generateTokenWithoutKid(payload: Partial<IJwtPayload> = {}): string {
		return this.generateToken(payload, { skipKid: true });
	}

	/**
	 * Generates a token with invalid signature (signed with different key)
	 */
	public generateTokenWithInvalidSignature(payload: Partial<IJwtPayload> = {}): string {
		const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
		const now = Math.floor(Date.now() / 1000);
		const defaultPayload: IJwtPayload = {
			iss: 'http://localhost:4001',
			sub: 'test-user-id',
			aud: 'bff-client',
			exp: now + 3600,
			iat: now,
			email: 'test@example.com',
			username: 'testuser',
			roles: ['user'],
			client_id: 'test-client',
			scope: 'read write',
		};

		return jwt.sign({ ...defaultPayload, ...payload }, privateKey.export({ type: 'pkcs8', format: 'pem' }) as string, {
			algorithm: 'RS256',
			keyid: this.keyId,
		});
	}

	/**
	 * Generates a JWK representation of the public key
	 */
	public getJwk(): JWK {
		const jwk = this.publicKey.export({ format: 'jwk' }) as { n: string; e: string };
		return {
			kty: 'RSA',
			use: 'sig',
			alg: 'RS256',
			kid: this.keyId,
			n: jwk.n,
			e: jwk.e,
		};
	}

	/**
	 * Generates a JWKS response containing the public key
	 */
	public getJwksResponse(): JWKSResponse {
		return {
			keys: [this.getJwk()],
		};
	}
}

/**
 * Creates a mock JWKS response handler for testing
 */
export function createMockJwksHandler(helper: TestTokenHelper) {
	return () => ({
		status: 200,
		body: helper.getJwksResponse(),
	});
}

/**
 * Default test configuration matching expected JWT claims
 */
export const TEST_CONFIG = {
	jwtIssuer: 'http://localhost:4001',
	jwtAudience: 'bff-client',
	jwksCacheTtl: 300, // 5 minutes
	serviceName: 'BFF-Test',
	version: '1.0.0',
};
