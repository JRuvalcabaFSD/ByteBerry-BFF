/* eslint-disable @typescript-eslint/no-explicit-any */
import cors from 'cors';

import { Request, Response, NextFunction } from 'express';

import { createCORSMiddleware } from '@infrastructure';
import { CorsOriginError } from '@shared';
import type { IConfig } from '@interfaces';

vi.mock('cors');

describe('CORSMiddleware', () => {
	let mockConfig: IConfig;
	let mockCorsMiddleware: any;
	let originCallback: (origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) => void;

	beforeEach(() => {
		mockConfig = {
			corsOrigins: ['https://example.com', 'https://app.example.com'],
		} as IConfig;

		// Capture the origin callback for testing
		(cors as any).mockImplementation((options: any) => {
			originCallback = options.origin;
			return mockCorsMiddleware;
		});

		mockCorsMiddleware = vi.fn((req: Request, res: Response, next: NextFunction) => next());
	});

	describe('Configuration', () => {
		it('should configure CORS with correct options', () => {
			createCORSMiddleware(mockConfig);

			expect(cors).toHaveBeenCalledWith(
				expect.objectContaining({
					credentials: true,
					optionsSuccessStatus: 200,
					methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
					allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
				})
			);
		});

		it('should return cors middleware', () => {
			const middleware = createCORSMiddleware(mockConfig);

			expect(middleware).toBe(mockCorsMiddleware);
		});
	});

	describe('Origin Validation', () => {
		beforeEach(() => {
			createCORSMiddleware(mockConfig);
		});

		it('should allow requests without origin (same-origin)', () => {
			const callback = vi.fn();

			originCallback(undefined, callback);

			expect(callback).toHaveBeenCalledWith(null, true);
		});

		it('should allow requests from allowed origins', () => {
			const callback = vi.fn();

			originCallback('https://example.com', callback);

			expect(callback).toHaveBeenCalledWith(null, true);
		});

		it('should allow multiple configured origins', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			originCallback('https://example.com', callback1);
			originCallback('https://app.example.com', callback2);

			expect(callback1).toHaveBeenCalledWith(null, true);
			expect(callback2).toHaveBeenCalledWith(null, true);
		});

		it('should reject requests from non-allowed origins with CorsOriginError', () => {
			const callback = vi.fn();
			const unauthorizedOrigin = 'https://malicious.com';

			originCallback(unauthorizedOrigin, callback);

			expect(callback).toHaveBeenCalledWith(expect.any(CorsOriginError), false);

			const error = callback.mock.calls[0][0] as CorsOriginError;
			expect(error.name).toBe('CorsOriginError');
			expect(error.origin).toBe(unauthorizedOrigin);
			expect(error.message).toContain(unauthorizedOrigin);
		});

		it('should handle empty allowed origins list', () => {
			const emptyConfig = { corsOrigins: [] } as unknown as IConfig;
			createCORSMiddleware(emptyConfig);

			const callback = vi.fn();
			originCallback('https://example.com', callback);

			expect(callback).toHaveBeenCalledWith(expect.any(CorsOriginError), false);
		});
	});

	describe('CorsOriginError', () => {
		it('should create error with origin information', () => {
			const origin = 'https://unauthorized.com';
			const error = new CorsOriginError(origin);

			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe('CorsOriginError');
			expect(error.origin).toBe(origin);
			expect(error.message).toBe(`Origin ${origin} not allowed by CORS`);
		});

		it('should be throwable and catchable', () => {
			const origin = 'https://bad-origin.com';

			const throwError = () => {
				throw new CorsOriginError(origin);
			};

			expect(throwError).toThrow(CorsOriginError);
			expect(throwError).toThrow('Origin https://bad-origin.com not allowed by CORS');
		});
	});
});
