import { createLoggingMiddleware } from '@infrastructure';
import { ILogger, IClock } from '@interfaces';
import type { Request, Response, NextFunction } from 'express';

describe('Logger Middleware', () => {
	let mockLogger: ILogger;
	let mockClock: IClock;
	let req: Partial<Request>;
	let res: Partial<Response>;
	let next: NextFunction;

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
			child: vi.fn().mockReturnThis(),
			log: vi.fn(),
		} as unknown as ILogger;

		mockClock = {
			now: () => new Date(),
			timestamp: () => 1234567890,
			isoString: () => new Date().toISOString(),
		} as unknown as IClock;

		req = {
			method: 'GET',
			originalUrl: '/test',
			url: '/test',
			headers: {
				'user-agent': 'test-agent',
			},
			ip: '127.0.0.1',
			socket: {
				remoteAddress: '127.0.0.1',
			} as any,
		};

		res = {
			statusCode: 200,
			get: vi.fn(),
			end: vi.fn(),
		};

		next = vi.fn();
	});

	describe('createLoggingMiddleware', () => {
		it('should return no-op middleware when logging disabled', () => {
			const middleware = createLoggingMiddleware(mockLogger, mockClock, false);
			const req = {} as any;
			const res = {} as any;
			const next = vi.fn();

			middleware(req, res, next);
			expect(next).toHaveBeenCalled();
			expect(mockLogger.info).not.toHaveBeenCalled();
		});

		it('should create logging middleware when enabled', () => {
			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			expect(typeof middleware).toBe('function');
		});

		it('should throw error if requestId not present', () => {
			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			const req = {} as any;
			const res = {} as any;
			const next = vi.fn();

			middleware(req, res, next);
			expect(next).toHaveBeenCalledWith(expect.any(Error));
		});

		it('should attach child logger to request', () => {
			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';

			middleware(req as Request, res as Response, next);

			expect(mockLogger.child).toHaveBeenCalledWith({
				requestId: 'test-123',
				method: 'GET',
				url: '/test',
				userAgent: 'test-agent',
				ip: '127.0.0.1',
			});
		});

		it('should attach startTime to request', () => {
			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';

			middleware(req as Request, res as Response, next);

			expect((req as any).startTime).toBe(1234567890);
		});

		it('should log incoming request', () => {
			const childLogger = {
				info: vi.fn(),
				warn: vi.fn(),
			} as any;
			mockLogger.child = vi.fn().mockReturnValue(childLogger);

			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';

			middleware(req as Request, res as Response, next);

			expect(childLogger.info).toHaveBeenCalledWith(
				'Incoming request',
				expect.objectContaining({
					method: 'GET',
					url: '/test',
				})
			);
		});

		it('should use socket remoteAddress when ip not available', () => {
			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';
			delete (req as any).ip;

			middleware(req as Request, res as Response, next);

			expect(mockLogger.child).toHaveBeenCalledWith(
				expect.objectContaining({
					ip: '127.0.0.1',
				})
			);
		});

		it('should use "unknown" when no ip available', () => {
			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';
			delete (req as any).ip;
			delete (req as any).socket;

			middleware(req as Request, res as Response, next);

			expect(mockLogger.child).toHaveBeenCalledWith(
				expect.objectContaining({
					ip: 'unknown',
				})
			);
		});

		it('should intercept response.end and log completion', () => {
			const childLogger = {
				info: vi.fn(),
				warn: vi.fn(),
			} as any;
			mockLogger.child = vi.fn().mockReturnValue(childLogger);

			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';
			(req as any).startTime = 1234567890;

			const originalEnd = res.end as any;
			middleware(req as Request, res as Response, next);

			// Simular que la respuesta termina
			mockClock.timestamp = vi.fn(() => 1234567990);
			res.statusCode = 200;
			(res.end as any)();

			expect(childLogger.info).toHaveBeenCalledWith(
				'Request completed',
				expect.objectContaining({
					statusCode: 200,
					duration: 100,
				})
			);
		});

		it('should log warning for 4xx status codes', () => {
			const childLogger = {
				info: vi.fn(),
				warn: vi.fn(),
			} as any;
			mockLogger.child = vi.fn().mockReturnValue(childLogger);

			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';
			(req as any).startTime = 1234567890;

			middleware(req as Request, res as Response, next);

			mockClock.timestamp = vi.fn(() => 1234567990);
			res.statusCode = 404;
			(res.end as any)();

			expect(childLogger.warn).toHaveBeenCalledWith(
				'Request completed with error',
				expect.objectContaining({
					statusCode: 404,
				})
			);
		});

		it('should log warning for 5xx status codes', () => {
			const childLogger = {
				info: vi.fn(),
				warn: vi.fn(),
			} as any;
			mockLogger.child = vi.fn().mockReturnValue(childLogger);

			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';
			(req as any).startTime = 1234567890;

			middleware(req as Request, res as Response, next);

			mockClock.timestamp = vi.fn(() => 1234567990);
			res.statusCode = 500;
			(res.end as any)();

			expect(childLogger.warn).toHaveBeenCalledWith(
				'Request completed with error',
				expect.objectContaining({
					statusCode: 500,
				})
			);
		});

		it('should include Content-Length in log', () => {
			const childLogger = {
				info: vi.fn(),
				warn: vi.fn(),
			} as any;
			mockLogger.child = vi.fn().mockReturnValue(childLogger);

			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';
			(req as any).startTime = 1234567890;

			res.get = vi.fn((header: string) => {
				if (header === 'Content-Length') return '1234';
				return undefined;
			});

			middleware(req as Request, res as Response, next);

			mockClock.timestamp = vi.fn(() => 1234567990);
			(res.end as any)();

			expect(childLogger.info).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					contentLength: '1234',
				})
			);
		});

		it('should pass through arguments to original end', () => {
			const originalEnd = vi.fn();
			res.end = originalEnd as any;

			const middleware = createLoggingMiddleware(mockLogger, mockClock, true);
			req.requestId = 'test-123';

			middleware(req as Request, res as Response, next);

			const chunk = 'test chunk';
			const encoding = 'utf8';
			const callback = vi.fn();

			(res.end as any)(chunk, encoding, callback);

			expect(originalEnd).toHaveBeenCalledWith(chunk, encoding, callback);
		});
	});
});
