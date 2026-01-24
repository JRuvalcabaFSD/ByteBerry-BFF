import jwt from 'jsonwebtoken';

import type { IConfig, IJwksClientAdapter, IJwtPayload, IJwtVerifier, ILogger } from '@interfaces';
import { AuthenticatedError, Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Adapter for verifying and decoding JSON Web Tokens (JWTs) using JWKS (JSON Web Key Set).
 * This class implements the IJwtVerifier interface and handles token verification against
 * expected issuer and audience, fetching public keys from a JWKS client, and logging relevant events.
 * It supports RS256 algorithm and includes audience validation for both string and array audiences.
 *
 * @implements {IJwtVerifier}
 */

@LogContextClass()
@Injectable({ name: 'JwtVerifier', depends: ['Config', 'JwksClientAdapter', 'Logger'] })
export class JwtVerifierAdapter implements IJwtVerifier {
	private readonly expectedIssuer: string;
	private readonly expectedAudience: string;

	constructor(
		config: IConfig,
		private readonly jwksClient: IJwksClientAdapter,
		private readonly logger: ILogger
	) {
		this.expectedIssuer = config.jwtIssuer;
		this.expectedAudience = config.jwtAudience;
	}

	/**
	 * Verifies a JWT token using the JWKS client and validates its claims.
	 *
	 * This method extracts the token header, fetches the corresponding public key,
	 * and verifies the token against specified options including issuer and clock tolerance.
	 * It also validates the audience claim. If verification succeeds, it returns the decoded payload.
	 *
	 * @param token - The JWT token string to verify.
	 * @returns A promise that resolves to the decoded JWT payload if verification is successful.
	 * @throws {AuthenticatedError} If the token is missing required headers, expired, invalid, or verification fails.
	 */

	@LogContextMethod()
	public async verify(token: string): Promise<IJwtPayload> {
		try {
			const header = this.getTokenHeader(token);

			if (!header.kid) throw AuthenticatedError.missingAuthHeader();

			this.logger.debug('Fetching public key for verification', { kid: header.kid });
			const publicKey = await this.jwksClient.getPublicKey(header.kid);

			const options: jwt.VerifyOptions = {
				algorithms: ['RS256'],
				issuer: this.expectedIssuer,
				clockTolerance: 30,
			};

			const verified = jwt.verify(token, publicKey, options) as IJwtPayload;

			this.validateAudience(verified.aud);
			this.logger.debug('Token verified successfully', { sub: verified.sub, client_id: verified.client_id, scope: verified.scope });

			return verified;
		} catch (error) {
			if (error instanceof AuthenticatedError) {
				throw error;
			}

			if (error instanceof jwt.TokenExpiredError) {
				this.logger.warn('Token expired', {
					expiredAt: error.expiredAt,
				});
				throw new AuthenticatedError('Token has expired', 'TOKEN_EXPIRED');
			}

			if (error instanceof jwt.JsonWebTokenError) {
				this.logger.warn('JWT verification failed', {
					error: error.message,
					name: error.name,
				});
				throw new AuthenticatedError(`Invalid token: ${error.message}`, 'INVALID_TOKEN');
			}

			this.logger.error('Unexpected error during token verification', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new AuthenticatedError('Token verification failed', 'VERIFICATION_FAILED');
		}
	}

	/**
	 * Decodes a JWT token without verification and returns the payload.
	 * If decoding fails, logs the error and throws an AuthenticatedError.
	 *
	 * @param token - The JWT token string to decode.
	 * @returns The decoded JWT payload as an IJwtPayload object.
	 * @throws {AuthenticatedError} If the token format is invalid.
	 */

	@LogContextMethod()
	public decode(token: string): IJwtPayload {
		try {
			return this.decodeWithoutVerification(token);
		} catch (error) {
			this.logger.error('Failed to decode token', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw new AuthenticatedError('Invalid token format', 'INVALID_TOKEN_FORMAT');
		}
	}

	/**
	 * Extracts the header from a JWT token.
	 * @param token - The JWT token string to decode.
	 * @returns The header object of the decoded token.
	 * @throws {AuthenticatedError} If the token is invalid or cannot be decoded.
	 */

	private getTokenHeader(token: string) {
		const decoded = jwt.decode(token, { complete: true });

		if (!decoded || typeof decoded !== 'object' || !decoded.header) {
			throw AuthenticatedError.invalidTokenFormat();
		}

		return decoded.header;
	}

	/**
	 * Validates the audience of the JWT token against the expected audience.
	 * If the token audience is an array, checks if the expected audience is present in it.
	 * If it's a string, performs a case-insensitive comparison.
	 * Throws an AuthenticatedError if the audience is invalid.
	 * Logs a debug message on successful validation.
	 * @private
	 * @param tokenAudience - The audience from the token, either a string or an array of strings.
	 * @throws {AuthenticatedError} Thrown when the audience does not match the expected value.
	 */

	@LogContextMethod()
	private validateAudience(tokenAudience: string | string[]) {
		if (Array.isArray(tokenAudience)) {
			const foundInArray = tokenAudience.some((aud) => aud === this.expectedAudience);

			if (!foundInArray) {
				throw new AuthenticatedError(
					`Invalid audience. Expected '${this.expectedAudience}' but token has [${tokenAudience.join(', ')}]`,
					'INVALID_AUDIENCE'
				);
			}

			this.logger.debug('Audience validated successfully (array)', {
				expectedAudience: this.expectedAudience,
				tokenAudiences: tokenAudience,
			});

			return;
		}

		if (tokenAudience.toLowerCase() !== this.expectedAudience) {
			throw new AuthenticatedError(
				`Invalid audience. Expected '${this.expectedAudience}' but token has '${tokenAudience}'`,
				'INVALID_AUDIENCE'
			);
		}

		this.logger.debug('Audience validated successfully (string)', {
			expectedAudience: this.expectedAudience,
			tokenAudience,
		});
	}

	/**
	 * Decodes a JWT token without verifying its signature or claims.
	 * This method attempts to parse the token and extract the payload.
	 * If decoding fails, it logs an error and throws an AuthenticatedError.
	 *
	 * @param token - The JWT token string to decode.
	 * @returns The decoded JWT payload as an IJwtPayload object.
	 * @throws {AuthenticatedError} If the token format is invalid or decoding fails.
	 */

	@LogContextMethod()
	private decodeWithoutVerification(token: string): IJwtPayload {
		try {
			return this.decodeWithoutVerification(token);
		} catch (error) {
			this.logger.error('Failed to decode token', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			throw new AuthenticatedError('Invalid token format', 'INVALID_TOKEN_FORMAT');
		}
	}
}
