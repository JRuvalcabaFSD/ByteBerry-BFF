import { createErrorMiddleware } from '@infrastructure';
import { ILogger, IConfig } from '@interfaces';
import { HttpError, CorsOriginError } from '@shared';

describe('Error Middleware', () => {
	const mockLogger: ILogger = {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
		child: vi.fn(),
		log: vi.fn(),
	} as unknown as ILogger;

	const mockConfig: IConfig = {
		isDevelopment: () => true,
		isProduction: () => false,
		isTest: () => false,
		logRequests: false,
		getSummary: () => ({}),
	} as any;

	describe('createErrorMiddleware', () => {
				it('should handle CorsOriginError with generic message in production', () => {
					const prodConfig = { ...mockConfig, isDevelopment: () => false };
					const middleware = createErrorMiddleware(mockLogger, prodConfig);
					const error = new CorsOriginError('https://evil.com');
					const req = { requestId: 'test-id' } as any;
					const res = {
						status: vi.fn().mockReturnThis(),
						json: vi.fn(),
					} as any;
					const next = vi.fn();

					middleware(error, req, res, next);

					expect(res.status).toHaveBeenCalledWith(200);
					expect(res.json).toHaveBeenCalledWith(
						expect.objectContaining({
							message: 'Origin not allowed by CORS',
							error: 'Invalid Cors',
						})
					);
				});
		it('should create an error middleware function', () => {
			const middleware = createErrorMiddleware(mockLogger, mockConfig);
			expect(typeof middleware).toBe('function');
		});

		it('should handle HttpError correctly', () => {
			const middleware = createErrorMiddleware(mockLogger, mockConfig);
			const error = new HttpError('Not Found', 'http', 'ResourceMissing', 404);
			const req = { requestId: 'test-id' } as any;
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as any;
			const next = vi.fn();

			middleware(error, req, res, next);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'ResourceMissing',
					message: 'Not Found',
				})
			);
		});

		it('should handle generic errors with 500 status', () => {
			const middleware = createErrorMiddleware(mockLogger, mockConfig);
			const error = new Error('Generic error');
			const req = { requestId: 'test-id' } as any;
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as any;
			const next = vi.fn();

			middleware(error, req, res, next);

			expect(res.status).toHaveBeenCalledWith(500);
		});
	});
});
