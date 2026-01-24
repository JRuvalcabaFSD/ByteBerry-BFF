import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import express, { Express } from 'express';
import { Server } from 'http';
import type { IConfig, ILogger, IJwtPayload, JWKSResponse } from '@interfaces';
import { JwksAdapter, JwtVerifierAdapter } from '@infrastructure';
import { createAuthMiddleware } from '@presentation';
import { GetCurrentUserUseCase } from '@application';
import { MeController } from '../../src/presentation/controllers/me.controller';
import { createMeRoutes } from '../../src/presentation/routes/me.routes';
import { TestTokenHelper, TEST_CONFIG } from './helpers/test-token.helper';

/**
 * Integration tests for BFF and OAuth2 Service integration
 *
 * Test checklist:
 * - [T083] AuthClient downloads JWKS correctly
 * - JWT validation with valid token from OAuth2 Service
 * - JWT validation rejects invalid tokens
 * - AuthGuard middleware works end-to-end
 * - Endpoint /me returns claims correctly
 * - JWKS cache expires and renews automatically
 */

describe('OAuth2 BFF Integration Tests', () => {
	let mockJwksServer: Express;
	let mockJwksServerInstance: Server;
	let mockJwksPort: number;
	let tokenHelper: TestTokenHelper;
	let fetchCallCount: number;

	// Store original fetch
	const originalFetch = global.fetch;

	beforeAll(async () => {
		tokenHelper = new TestTokenHelper('integration-test-key-1');

		// Create mock JWKS server
		mockJwksServer = express();
		mockJwksServer.get('/.well-known/jwks.json', (_req, res) => {
			fetchCallCount++;
			res.json(tokenHelper.getJwksResponse());
		});

		// Start mock server on a random port
		await new Promise<void>((resolve) => {
			mockJwksServerInstance = mockJwksServer.listen(0, () => {
				const address = mockJwksServerInstance.address();
				if (address && typeof address === 'object') {
					mockJwksPort = address.port;
				}
				resolve();
			});
		});
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => {
			mockJwksServerInstance.close(() => resolve());
		});
	});

	beforeEach(() => {
		fetchCallCount = 0;
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	/**
	 * Creates test configuration with actual JWKS server URL
	 */
	function createTestConfig(): IConfig {
		return {
			...TEST_CONFIG,
			jwksUrl: `http://localhost:${mockJwksPort}/.well-known/jwks.json`,
			oauth2ServiceUrl: `http://localhost:${mockJwksPort}`,
		} as IConfig;
	}

	/**
	 * Creates a mock logger for tests
	 */
	function createMockLogger(): ILogger {
		return {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			child: vi.fn().mockReturnThis(),
			log: vi.fn(),
			checkHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
		} as unknown as ILogger;
	}

	describe('[T083] AuthClient downloads JWKS correctly', () => {
		it('should fetch JWKS from OAuth2 service successfully', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);

			const publicKey = await jwksAdapter.getPublicKey('integration-test-key-1');

			expect(publicKey).toBeDefined();
			expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
			expect(publicKey).toContain('-----END PUBLIC KEY-----');
			expect(fetchCallCount).toBe(1);
		});

		it('should handle JWKS response with multiple keys', async () => {
			// Create a second token helper with different key
			const secondHelper = new TestTokenHelper('integration-test-key-2');
			const combinedJwks: JWKSResponse = {
				keys: [tokenHelper.getJwk(), secondHelper.getJwk()],
			};

			// Create a temporary server with multiple keys
			const multiKeyServer = express();
			multiKeyServer.get('/.well-known/jwks.json', (_req, res) => {
				res.json(combinedJwks);
			});

			const server = await new Promise<Server>((resolve) => {
				const s = multiKeyServer.listen(0, () => resolve(s));
			});

			const address = server.address();
			const port = typeof address === 'object' ? address?.port : 0;

			try {
				const config = {
					...createTestConfig(),
					jwksUrl: `http://localhost:${port}/.well-known/jwks.json`,
				} as IConfig;
				const logger = createMockLogger();
				const jwksAdapter = new JwksAdapter(config, logger);

				// Should be able to get both keys
				const key1 = await jwksAdapter.getPublicKey('integration-test-key-1');
				const key2 = await jwksAdapter.getPublicKey('integration-test-key-2');

				expect(key1).toBeDefined();
				expect(key2).toBeDefined();
				expect(key1).not.toBe(key2);
			} finally {
				await new Promise<void>((resolve) => server.close(() => resolve()));
			}
		});

		it('should throw error when JWKS endpoint is unreachable', async () => {
			const config = {
				...createTestConfig(),
				jwksUrl: 'http://localhost:59999/.well-known/jwks.json', // Non-existent port
			} as IConfig;
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);

			await expect(jwksAdapter.getPublicKey('test-key')).rejects.toThrow();
		});

		it('should throw error when key is not found in JWKS', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);

			await expect(jwksAdapter.getPublicKey('non-existent-key')).rejects.toThrow('Public key not found');
		});
	});

	describe('JWT Validation with valid token from OAuth2 Service', () => {
		it('should verify a valid token successfully', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const token = tokenHelper.generateToken({});
			const payload = await jwtVerifier.verify(token);

			expect(payload).toBeDefined();
			expect(payload.sub).toBe('test-user-id');
			expect(payload.email).toBe('test@example.com');
			expect(payload.username).toBe('testuser');
			expect(payload.roles).toEqual(['user']);
			expect(payload.iss).toBe(TEST_CONFIG.jwtIssuer);
			expect(payload.aud).toBe(TEST_CONFIG.jwtAudience);
		});

		it('should verify token with array audience', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const token = tokenHelper.generateToken({
				aud: ['bff-client', 'other-client'],
			});
			const payload = await jwtVerifier.verify(token);

			expect(payload).toBeDefined();
			expect(payload.aud).toEqual(['bff-client', 'other-client']);
		});

		it('should verify token with multiple scopes', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const token = tokenHelper.generateToken({
				scope: 'read write delete admin',
			});
			const payload = await jwtVerifier.verify(token);

			expect(payload.scope).toBe('read write delete admin');
		});

		it('should verify token with multiple roles', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const token = tokenHelper.generateToken({
				roles: ['user', 'admin', 'moderator'],
			});
			const payload = await jwtVerifier.verify(token);

			expect(payload.roles).toEqual(['user', 'admin', 'moderator']);
		});
	});

	describe('JWT Validation rejects invalid tokens', () => {
		it('should reject expired token', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const expiredToken = tokenHelper.generateExpiredToken();

			await expect(jwtVerifier.verify(expiredToken)).rejects.toThrow('Token has expired');
		});

		it('should reject token with invalid signature', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const invalidToken = tokenHelper.generateTokenWithInvalidSignature();

			await expect(jwtVerifier.verify(invalidToken)).rejects.toThrow();
		});

		it('should reject token without kid in header', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const tokenWithoutKid = tokenHelper.generateTokenWithoutKid();

			await expect(jwtVerifier.verify(tokenWithoutKid)).rejects.toThrow();
		});

		it('should reject token with wrong issuer', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const token = tokenHelper.generateToken({
				iss: 'https://malicious-issuer.com',
			});

			await expect(jwtVerifier.verify(token)).rejects.toThrow();
		});

		it('should reject token with wrong audience', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const token = tokenHelper.generateToken({
				aud: 'wrong-audience',
			});

			await expect(jwtVerifier.verify(token)).rejects.toThrow('Invalid audience');
		});

		it('should reject malformed token', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			await expect(jwtVerifier.verify('not-a-valid-token')).rejects.toThrow();
		});

		it('should reject token with tampered payload', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			// Generate valid token and tamper with it
			const validToken = tokenHelper.generateToken({});
			const parts = validToken.split('.');
			// Modify the payload (base64url encoded)
			const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
			payload.sub = 'hacked-user';
			parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
			const tamperedToken = parts.join('.');

			await expect(jwtVerifier.verify(tamperedToken)).rejects.toThrow();
		});
	});

	describe('AuthGuard middleware works end-to-end', () => {
		it('should pass authenticated request to next handler', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const middleware = createAuthMiddleware(jwtVerifier, logger);
			const token = tokenHelper.generateToken({});

			const mockReq = {
				headers: { authorization: `Bearer ${token}` },
				path: '/api/user/me',
				method: 'GET',
				requestId: 'test-request-123',
			} as any;
			const mockRes = {} as any;
			const nextFn = vi.fn();

			await middleware(mockReq, mockRes, nextFn);

			expect(nextFn).toHaveBeenCalledWith();
			expect(mockReq.user).toBeDefined();
			expect(mockReq.user.sub).toBe('test-user-id');
		});

		it('should reject request without authorization header', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const middleware = createAuthMiddleware(jwtVerifier, logger);

			const mockReq = {
				headers: {},
				path: '/api/user/me',
				method: 'GET',
				requestId: 'test-request-123',
			} as any;
			const mockRes = {} as any;
			const nextFn = vi.fn();

			await middleware(mockReq, mockRes, nextFn);

			expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should reject request with invalid Bearer token format', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const middleware = createAuthMiddleware(jwtVerifier, logger);

			const mockReq = {
				headers: { authorization: 'Basic invalid' },
				path: '/api/user/me',
				method: 'GET',
				requestId: 'test-request-123',
			} as any;
			const mockRes = {} as any;
			const nextFn = vi.fn();

			await middleware(mockReq, mockRes, nextFn);

			expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should reject request with expired token', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const middleware = createAuthMiddleware(jwtVerifier, logger);
			const expiredToken = tokenHelper.generateExpiredToken();

			const mockReq = {
				headers: { authorization: `Bearer ${expiredToken}` },
				path: '/api/user/me',
				method: 'GET',
				requestId: 'test-request-123',
			} as any;
			const mockRes = {} as any;
			const nextFn = vi.fn();

			await middleware(mockReq, mockRes, nextFn);

			expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should attach full payload to req.user on success', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

			const middleware = createAuthMiddleware(jwtVerifier, logger);
			const token = tokenHelper.generateToken({
				sub: 'user-123',
				email: 'user@test.com',
				username: 'testuser',
				roles: ['admin', 'user'],
				scope: 'read write',
				client_id: 'test-client-id',
			});

			const mockReq = {
				headers: { authorization: `Bearer ${token}` },
				path: '/api/user/me',
				method: 'GET',
				requestId: 'test-request-123',
			} as any;
			const mockRes = {} as any;
			const nextFn = vi.fn();

			await middleware(mockReq, mockRes, nextFn);

			expect(mockReq.user.sub).toBe('user-123');
			expect(mockReq.user.email).toBe('user@test.com');
			expect(mockReq.user.username).toBe('testuser');
			expect(mockReq.user.roles).toEqual(['admin', 'user']);
			expect(mockReq.user.scope).toBe('read write');
			expect(mockReq.user.client_id).toBe('test-client-id');
		});
	});

	describe('Endpoint /me returns claims correctly', () => {
		it('should return user info from JWT payload', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();

			const useCase = new GetCurrentUserUseCase(logger);
			const controller = new MeController(useCase);

			const payload: IJwtPayload = {
				iss: TEST_CONFIG.jwtIssuer,
				sub: 'user-123',
				aud: TEST_CONFIG.jwtAudience,
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				email: 'user@example.com',
				username: 'testuser',
				roles: ['user', 'admin'],
				client_id: 'test-client',
				scope: 'read write',
			};

			const mockReq = {
				user: payload,
				requestId: 'req-123',
			} as any;

			let responseData: any;
			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn((data) => {
					responseData = data;
				}),
			} as any;
			const nextFn = vi.fn();

			await controller.handle(mockReq, mockRes, nextFn);

			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(mockRes.json).toHaveBeenCalled();
			expect(responseData.user.userId).toBe('user-123');
			expect(responseData.user.email).toBe('user@example.com');
			expect(responseData.user.username).toBe('testuser');
			expect(responseData.user.roles).toEqual(['user', 'admin']);
			expect(responseData.user.scopes).toEqual(['read', 'write']);
			expect(responseData.requestId).toBe('req-123');
		});

		it('should include expiration info in response', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();

			const useCase = new GetCurrentUserUseCase(logger);
			const controller = new MeController(useCase);

			const now = Math.floor(Date.now() / 1000);
			const expiresAt = now + 3600;

			const payload: IJwtPayload = {
				iss: TEST_CONFIG.jwtIssuer,
				sub: 'user-123',
				aud: TEST_CONFIG.jwtAudience,
				exp: expiresAt,
				iat: now,
				email: 'user@example.com',
				username: 'testuser',
				roles: ['user'],
				client_id: 'test-client',
				scope: 'read',
			};

			const mockReq = {
				user: payload,
				requestId: 'req-123',
			} as any;

			let responseData: any;
			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn((data) => {
					responseData = data;
				}),
			} as any;
			const nextFn = vi.fn();

			await controller.handle(mockReq, mockRes, nextFn);

			expect(responseData.user.issuedAt).toBeDefined();
			expect(responseData.user.expiredAt).toBeDefined();
			expect(responseData.user.expiresIn).toBeGreaterThan(0);
			expect(responseData.user.expiresIn).toBeLessThanOrEqual(3600);
		});

		it('should handle token expiring soon flag', async () => {
			const logger = createMockLogger();
			const useCase = new GetCurrentUserUseCase(logger);
			const controller = new MeController(useCase);

			const now = Math.floor(Date.now() / 1000);
			// Token expires in 2 minutes (less than 5 minute threshold)
			const expiresAt = now + 120;

			const payload: IJwtPayload = {
				iss: TEST_CONFIG.jwtIssuer,
				sub: 'user-123',
				aud: TEST_CONFIG.jwtAudience,
				exp: expiresAt,
				iat: now,
				email: 'user@example.com',
				username: 'testuser',
				roles: ['user'],
				client_id: 'test-client',
				scope: 'read',
			};

			const mockReq = {
				user: payload,
				requestId: 'req-123',
			} as any;

			let responseData: any;
			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn((data) => {
					responseData = data;
				}),
			} as any;
			const nextFn = vi.fn();

			await controller.handle(mockReq, mockRes, nextFn);

			// The warning should have been logged
			expect(logger.warn).toHaveBeenCalled();
		});

		it('should return correct timestamp in response', async () => {
			const logger = createMockLogger();
			const useCase = new GetCurrentUserUseCase(logger);
			const controller = new MeController(useCase);

			const now = Math.floor(Date.now() / 1000);

			const payload: IJwtPayload = {
				iss: TEST_CONFIG.jwtIssuer,
				sub: 'user-123',
				aud: TEST_CONFIG.jwtAudience,
				exp: now + 3600,
				iat: now,
				email: 'user@example.com',
				username: 'testuser',
				roles: ['user'],
				client_id: 'test-client',
			};

			const mockReq = {
				user: payload,
				requestId: 'req-123',
			} as any;

			let responseData: any;
			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn((data) => {
					responseData = data;
				}),
			} as any;
			const nextFn = vi.fn();

			await controller.handle(mockReq, mockRes, nextFn);

			expect(responseData.timestamp).toBeDefined();
			// Timestamp should be a valid ISO string
			expect(() => new Date(responseData.timestamp)).not.toThrow();
		});

		it('should handle empty scopes', async () => {
			const logger = createMockLogger();
			const useCase = new GetCurrentUserUseCase(logger);
			const controller = new MeController(useCase);

			const now = Math.floor(Date.now() / 1000);

			const payload: IJwtPayload = {
				iss: TEST_CONFIG.jwtIssuer,
				sub: 'user-123',
				aud: TEST_CONFIG.jwtAudience,
				exp: now + 3600,
				iat: now,
				email: 'user@example.com',
				username: 'testuser',
				roles: ['user'],
				client_id: 'test-client',
				scope: undefined,
			};

			const mockReq = {
				user: payload,
				requestId: 'req-123',
			} as any;

			let responseData: any;
			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn((data) => {
					responseData = data;
				}),
			} as any;
			const nextFn = vi.fn();

			await controller.handle(mockReq, mockRes, nextFn);

			expect(responseData.user.scopes).toEqual([]);
		});
	});

	describe('JWKS cache expires and renews automatically', () => {
		it('should use cached key on subsequent requests', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);

			// Reset fetch count
			fetchCallCount = 0;

			// First request - should fetch from server
			await jwksAdapter.getPublicKey('integration-test-key-1');
			expect(fetchCallCount).toBe(1);

			// Second request - should use cache
			await jwksAdapter.getPublicKey('integration-test-key-1');
			expect(fetchCallCount).toBe(1); // Still 1, no new fetch
		});

		it('should fetch new JWKS after cache is cleared', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);

			// Reset fetch count
			fetchCallCount = 0;

			// First request
			await jwksAdapter.getPublicKey('integration-test-key-1');
			expect(fetchCallCount).toBe(1);

			// Clear cache
			jwksAdapter.clearCache();

			// Next request should fetch again
			await jwksAdapter.getPublicKey('integration-test-key-1');
			expect(fetchCallCount).toBe(2);
		});

		it('should refresh cache after TTL expires', async () => {
			// Create config with very short TTL (1 second)
			const config = {
				...createTestConfig(),
				jwksCacheTtl: 1, // 1 second TTL
			} as IConfig;
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);

			// Reset fetch count
			fetchCallCount = 0;

			// First request
			await jwksAdapter.getPublicKey('integration-test-key-1');
			expect(fetchCallCount).toBe(1);

			// Wait for TTL to expire
			await new Promise((resolve) => setTimeout(resolve, 1100));

			// Next request should fetch again due to expired cache
			await jwksAdapter.getPublicKey('integration-test-key-1');
			expect(fetchCallCount).toBe(2);
		});

		it('should handle key rotation gracefully', async () => {
			// Create a new token helper with rotated key
			const rotatedHelper = new TestTokenHelper('rotated-key-1');
			const combinedJwks: JWKSResponse = {
				keys: [tokenHelper.getJwk(), rotatedHelper.getJwk()],
			};

			// Create a server that returns rotated keys
			const rotationServer = express();
			rotationServer.get('/.well-known/jwks.json', (_req, res) => {
				res.json(combinedJwks);
			});

			const server = await new Promise<Server>((resolve) => {
				const s = rotationServer.listen(0, () => resolve(s));
			});

			const address = server.address();
			const port = typeof address === 'object' ? address?.port : 0;

			try {
				const config = {
					...createTestConfig(),
					jwksUrl: `http://localhost:${port}/.well-known/jwks.json`,
				} as IConfig;
				const logger = createMockLogger();
				const jwksAdapter = new JwksAdapter(config, logger);
				const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);

				// Should be able to verify tokens signed with both keys
				const token1 = tokenHelper.generateToken({});
				const token2 = rotatedHelper.generateToken({});

				const payload1 = await jwtVerifier.verify(token1);
				expect(payload1).toBeDefined();

				const payload2 = await jwtVerifier.verify(token2);
				expect(payload2).toBeDefined();
			} finally {
				await new Promise<void>((resolve) => server.close(() => resolve()));
			}
		});

		it('should log appropriate messages during cache operations', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();
			const jwksAdapter = new JwksAdapter(config, logger);

			// First request - cache miss
			await jwksAdapter.getPublicKey('integration-test-key-1');

			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Fetching JWKS'), expect.any(Object));
			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('JWKS cache updated'), expect.any(Object));

			// Reset debug mock
			(logger.debug as any).mockClear();

			// Second request - cache hit
			await jwksAdapter.getPublicKey('integration-test-key-1');

			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Returning cached public key'), expect.any(Object));
		});
	});

	describe('Full End-to-End Flow', () => {
		it('should complete full authentication flow: JWKS fetch -> JWT verify -> /me response', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();

			// Setup components
			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);
			const useCase = new GetCurrentUserUseCase(logger);
			const controller = new MeController(useCase);
			const authMiddleware = createAuthMiddleware(jwtVerifier, logger);

			// Generate token
			const token = tokenHelper.generateToken({
				sub: 'e2e-user-123',
				email: 'e2e@test.com',
				username: 'e2euser',
				roles: ['admin'],
				scope: 'read write delete',
			});

			// Simulate request
			const mockReq = {
				headers: { authorization: `Bearer ${token}` },
				path: '/api/user/me',
				method: 'GET',
				requestId: 'e2e-request-123',
			} as any;

			let responseData: any;
			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn((data) => {
					responseData = data;
				}),
			} as any;

			// Execute middleware and wait for completion
			await new Promise<void>((resolve, reject) => {
				authMiddleware(mockReq, mockRes, async (err?: any) => {
					if (err) {
						reject(err);
						return;
					}
					try {
						// After successful auth, call controller
						await controller.handle(mockReq, mockRes, vi.fn());
						resolve();
					} catch (e) {
						reject(e);
					}
				});
			});

			// Verify complete response
			expect(mockRes.status).toHaveBeenCalledWith(200);
			expect(responseData.user.userId).toBe('e2e-user-123');
			expect(responseData.user.email).toBe('e2e@test.com');
			expect(responseData.user.username).toBe('e2euser');
			expect(responseData.user.roles).toEqual(['admin']);
			expect(responseData.user.scopes).toEqual(['read', 'write', 'delete']);
			expect(responseData.requestId).toBe('e2e-request-123');
		});

		it('should reject unauthorized request in full flow', async () => {
			const config = createTestConfig();
			const logger = createMockLogger();

			const jwksAdapter = new JwksAdapter(config, logger);
			const jwtVerifier = new JwtVerifierAdapter(config, jwksAdapter, logger);
			const authMiddleware = createAuthMiddleware(jwtVerifier, logger);

			const expiredToken = tokenHelper.generateExpiredToken();

			const mockReq = {
				headers: { authorization: `Bearer ${expiredToken}` },
				path: '/api/user/me',
				method: 'GET',
				requestId: 'e2e-request-456',
			} as any;

			const mockRes = {} as any;
			const nextFn = vi.fn();

			await authMiddleware(mockReq, mockRes, nextFn);

			expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
			expect(mockReq.user).toBeUndefined();
		});
	});
});
