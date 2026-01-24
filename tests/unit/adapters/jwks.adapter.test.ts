import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import crypto from 'crypto';
import type { IConfig, ILogger, JWK, JWKSResponse } from '@interfaces';
import { AuthenticatedError } from '@shared';
import { JwksAdapter } from '@infrastructure';

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock crypto.createPublicKey
const createPublicKeyMock = vi.fn();
crypto.createPublicKey = createPublicKeyMock;

describe('JwksAdapter', () => {
	let mockConfig: IConfig;
	let mockLogger: ILogger;
	let adapter: JwksAdapter;

	beforeEach(() => {
		mockConfig = {
			jwksCacheTtl: 300, // 5 minutes
			jwksUrl: 'https://example.com/.well-known/jwks.json',
			serviceName: 'TestService',
			version: '1.0.0',
		} as IConfig;

		mockLogger = {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
		} as unknown as ILogger;

		adapter = new JwksAdapter(mockConfig, mockLogger);

		// Reset mocks
		fetchMock.mockClear();
		createPublicKeyMock.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		it('should initialize properties correctly', () => {
			expect(adapter['CACHE_TTL']).toBe(300000); // 300 * 1000
			expect(adapter['jwksUrl']).toBe('https://example.com/.well-known/jwks.json');
			expect(adapter['serviceName']).toBe('TestService');
			expect(adapter['version']).toBe('1.0.0');
		});
	});

	describe('getPublicKey', () => {
		const mockJwk: JWK = {
			kid: 'test-kid',
			kty: 'RSA',
			n: 'test-n',
			e: 'AQAB',
		} as unknown as JWK;

		const mockJwksResponse: JWKSResponse = {
			keys: [mockJwk],
		};

		const mockPem = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END PUBLIC KEY-----';

		beforeEach(() => {
			createPublicKeyMock.mockReturnValue({
				export: vi.fn().mockReturnValue(mockPem),
			});
		});

		it('should return cached key if cache is valid and key exists', async () => {
			// Simulate valid cache with key
			adapter['cache'].set('test-kid', mockPem);
			adapter['cacheTimestamp'] = Date.now();

			const result = await adapter.getPublicKey('test-kid');

			expect(result).toBe(mockPem);
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.getPublicKey] Returning cached public key', { kid: 'test-kid' });
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('should fetch and return key if cache is invalid', async () => {
			// Simulate invalid cache
			adapter['cacheTimestamp'] = 0;

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(mockJwksResponse),
			});

			const result = await adapter.getPublicKey('test-kid');

			expect(result).toBe(mockPem);
			expect(fetchMock).toHaveBeenCalledWith('https://example.com/.well-known/jwks.json', expect.any(Object));
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.isCacheValid] JWKS cache expired');
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.getPublicKey] Fetching JWKS from OAuth2', { jwksUrl: 'https://example.com/.well-known/jwks.json' });
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.updateCache] JWKS cache updated', {
				keyCount: 1,
				kids: ['test-kid'],
			});
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.getPublicKey] Public key fetched successfully', { kid: 'test-kid' });
		});

		it('should throw AuthenticatedError if fetch fails', async () => {
			adapter['cacheTimestamp'] = 0;

			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
			});

			await expect(adapter.getPublicKey('test-kid')).rejects.toThrow(AuthenticatedError);
		});

		it('should throw AuthenticatedError if JWKS response is invalid', async () => {
			adapter['cacheTimestamp'] = 0;

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue({ keys: [] }),
			});

			await expect(adapter.getPublicKey('test-kid')).rejects.toThrow(AuthenticatedError);
		});

		it('should throw AuthenticatedError if key not found after fetch', async () => {
			adapter['cacheTimestamp'] = 0;

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(mockJwksResponse),
			});

			await expect(adapter.getPublicKey('non-existent-kid')).rejects.toThrow(AuthenticatedError);
		});

		it('should throw AuthenticatedError on network error', async () => {
			adapter['cacheTimestamp'] = 0;

			fetchMock.mockRejectedValueOnce(new Error('Network error'));

			await expect(adapter.getPublicKey('test-kid')).rejects.toThrow(AuthenticatedError);
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	describe('jwkToPem', () => {
		it('should convert JWK to PEM', () => {
			const mockJwk: JWK = {
				kid: 'test-kid',
				kty: 'RSA',
				n: 'test-n',
				e: 'AQAB',
			} as unknown as JWK;

			const mockPem = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END PUBLIC KEY-----';

			createPublicKeyMock.mockReturnValue({
				export: vi.fn().mockReturnValue(mockPem),
			});

			const result = adapter.jwkToPem(mockJwk);

			expect(result).toBe(mockPem);
			expect(createPublicKeyMock).toHaveBeenCalledWith({
				key: {
					kty: 'RSA',
					n: 'test-n',
					e: 'AQAB',
				},
				format: 'jwk',
			});
		});
	});

	describe('clearCache', () => {
		it('should clear cache and reset timestamp', () => {
			adapter['cache'].set('test-kid', 'pem');
			adapter['cacheTimestamp'] = Date.now();

			adapter.clearCache();

			expect(adapter['cache'].size).toBe(0);
			expect(adapter['cacheTimestamp']).toBe(0);
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter] JWKS cache cleared');
		});
	});

	// Private methods are tested indirectly through public methods
	describe('cache behavior', () => {
		it('should update cache correctly', async () => {
			const mockJwk: JWK = {
				kid: 'test-kid',
				kty: 'RSA',
				n: 'test-n',
				e: 'AQAB',
			} as unknown as JWK;

			const mockJwksResponse: JWKSResponse = {
				keys: [mockJwk],
			};

			const mockPem = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END PUBLIC KEY-----';

			createPublicKeyMock.mockReturnValue({
				export: vi.fn().mockReturnValue(mockPem),
			});

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValue(mockJwksResponse),
			});

			await adapter.getPublicKey('test-kid');

			expect(adapter['cache'].get('test-kid')).toBe(mockPem);
			expect(adapter['cacheTimestamp']).toBeGreaterThan(0);
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.isCacheValid] JWKS cache expired');
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.getPublicKey] Fetching JWKS from OAuth2', { jwksUrl: 'https://example.com/.well-known/jwks.json' });
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.updateCache] JWKS cache updated', {
				keyCount: 1,
				kids: ['test-kid'],
			});
			expect(mockLogger.debug).toHaveBeenCalledWith('[JwksAdapter.getPublicKey] Public key fetched successfully', { kid: 'test-kid' });
		});
	});
});
