import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { IJwtVerifier, ILogger } from '@interfaces';
import { withLoggerContext } from '@shared';
import { createAuthMiddleware } from '@presentation';

vi.mock('@shared', () => {
	function AuthenticatedError(message?: string) {
		const err = new Error(message);
		Object.setPrototypeOf(err, AuthenticatedError.prototype);
		return err;
	}
	AuthenticatedError.missingAuthHeader = vi.fn(() => new Error('Missing auth header'));
	AuthenticatedError.invalidTokenFormat = vi.fn(() => new Error('Invalid token format'));
	return {
		withLoggerContext: vi.fn(),
		Injectable: vi.fn(),
		AuthenticatedError,
	};
});

describe('createAuthMiddleware', () => {
	let mockJwtVerifier: IJwtVerifier;
	let mockLogger: ILogger;
	let mockCtxLogger: ILogger;
	let req: Partial<Request>;
	let res: Partial<Response>;
	let next: NextFunction;

	beforeEach(() => {
		mockJwtVerifier = {
			verify: vi.fn(),
		} as unknown as IJwtVerifier;
		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		} as unknown as ILogger;
		mockCtxLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			child: vi.fn(),
			log: vi.fn(),
			checkHealth: vi.fn(),
		};
		(withLoggerContext as any).mockReturnValue(mockCtxLogger);
		req = {
			headers: {},
			path: '/test',
			method: 'GET',
			requestId: 'test-request-id',
		};
		res = {};
		next = vi.fn();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should authenticate successfully and set req.user', async () => {
		const token = 'valid.jwt.token';
		const payload = { sub: 'user123', client_id: 'client456', scope: 'read' };
		if (!req.headers) req.headers = {};
		req.headers.authorization = `Bearer ${token}`;
		(mockJwtVerifier.verify as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(payload);

		const middleware = createAuthMiddleware(mockJwtVerifier, mockLogger);
		await middleware(req as Request, res as Response, next);

		expect(mockJwtVerifier.verify).toHaveBeenCalledWith(token);
		expect(req.user).toEqual(payload);
		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Processing authentication', {
			requestId: 'test-request-id',
			path: '/test',
			method: 'GET',
			hasAuthHeader: true,
		});
		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Request authenticated successfully', {
			requestId: 'test-request-id',
			userId: 'user123',
			clientId: 'client456',
			scope: 'read',
		});
		expect(next).toHaveBeenCalledWith();
	});

	it('should call next with error when auth header is missing', async () => {
		const middleware = createAuthMiddleware(mockJwtVerifier, mockLogger);
		await middleware(req as Request, res as Response, next);

		expect(next).toHaveBeenCalledWith(new Error('Missing auth header'));
		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Processing authentication', {
			requestId: 'test-request-id',
			path: '/test',
			method: 'GET',
			hasAuthHeader: false,
		});
	});

	it('should call next with error when auth header does not start with Bearer', async () => {
		if (!req.headers) req.headers = {};
		req.headers.authorization = 'Basic token';
		const middleware = createAuthMiddleware(mockJwtVerifier, mockLogger);
		await middleware(req as Request, res as Response, next);

		expect(next).toHaveBeenCalledWith(new Error('Missing auth header'));
	});

	it('should call next with error when token is empty', async () => {
		if (!req.headers) req.headers = {};
		req.headers.authorization = 'Bearer ';
		const middleware = createAuthMiddleware(mockJwtVerifier, mockLogger);
		await middleware(req as Request, res as Response, next);

		expect(next).toHaveBeenCalledWith(new Error('Empty token in authorization header'));
	});

	it('should call next with error when token format is invalid', async () => {
		if (!req.headers) req.headers = {};
		req.headers.authorization = 'Bearer invalid-token';
		const middleware = createAuthMiddleware(mockJwtVerifier, mockLogger);
		await middleware(req as Request, res as Response, next);

		expect(next).toHaveBeenCalledWith(new Error('Invalid token format'));
	});

	it('should call next with error when jwtVerifier.verify throws', async () => {
		const token = 'valid.jwt.token';
		if (!req.headers) req.headers = {};
		req.headers.authorization = `Bearer ${token}`;
		const error = new Error('Verification failed');
		(mockJwtVerifier.verify as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(error);

		const middleware = createAuthMiddleware(mockJwtVerifier, mockLogger);
		await middleware(req as Request, res as Response, next);

		expect(next).toHaveBeenCalledWith(error);
	});

	it('should use unknown as requestId when req.requestId is undefined', async () => {
		req.requestId = undefined;
		if (!req.headers) req.headers = {};
		req.headers.authorization = 'Bearer valid.jwt.token';
		(mockJwtVerifier.verify as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ sub: 'user123' });

		const middleware = createAuthMiddleware(mockJwtVerifier, mockLogger);
		await middleware(req as Request, res as Response, next);

		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Processing authentication', {
			requestId: 'unknown',
			path: '/test',
			method: 'GET',
			hasAuthHeader: true,
		});
	});
});
