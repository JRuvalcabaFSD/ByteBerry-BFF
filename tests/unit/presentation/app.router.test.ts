import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import type { IConfig, IClock, IHealthService } from '@interfaces';
import { AppRouter } from '@presentation';

describe('AppRouter', () => {
	let app: Express;
	let mockConfig: IConfig;
	let mockClock: IClock;
	let mockHealthService: IHealthService;
	let appRouter: AppRouter;

	beforeEach(() => {
		mockConfig = {
			serviceName: 'TestService',
			version: '1.0.0',
			nodeEnv: 'test',
			serviceUrl: 'http://localhost',
			port: 3000,
		} as IConfig;

		mockClock = {
			isoString: vi.fn(() => '2024-01-01T00:00:00.000Z'),
		} as unknown as IClock;

		mockHealthService = {
			getHealth: vi.fn(async (_req, res) => {
				res.status(200).json({ status: 'healthy' });
			}),
			getDeepHealth: vi.fn(async (_req, res) => {
				res.status(200).json({ status: 'healthy' });
			}),
		} as unknown as IHealthService;

		appRouter = new AppRouter(mockConfig, mockClock, mockHealthService);

		app = express();
		app.use((req, _res, next) => {
			req.requestId = 'test-request-id';
			next();
		});
		app.use(appRouter.getRoutes());
	});

	describe('getRoutes', () => {
		it('should return a Router instance', () => {
			const router = appRouter.getRoutes();
			expect(router).toBeDefined();
		});
	});

	describe('GET /', () => {
		it('should return home response with correct metadata', async () => {
			const response = await request(app).get('/');

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				service: 'TestService',
				version: '1.0.0',
				status: 'running',
				timestamp: '2024-01-01T00:00:00.000Z',
				requestId: 'test-request-id',
				environment: 'test',
			});
		});

		it('should return endpoints list in home response', async () => {
			const response = await request(app).get('/');

			expect(response.body.endpoints).toBeDefined();
			expect(response.body.endpoints['home [GET]']).toBe('http://localhost:3000/');
			expect(response.body.endpoints['health [GET]']).toBe('http://localhost:3000/health');
			expect(response.body.endpoints['deepHealth [GET]']).toBe('http://localhost:3000/health/deep');
		});
	});

	describe('404 Handler', () => {
		it('should return 404 for unmatched routes', async () => {
			const response = await request(app).get('/nonexistent');

			expect(response.status).toBe(404);
			expect(response.body).toMatchObject({
				error: 'Not found',
				message: 'Route GET /nonexistent not found',
				requestId: 'test-request-id',
				timestamp: '2024-01-01T00:00:00.000Z',
			});
		});

		it('should include endpoints list in 404 response', async () => {
			const response = await request(app).get('/invalid-path');

			expect(response.body.endpoints).toBeDefined();
			expect(response.body.endpoints['home [GET]']).toBe('http://localhost:3000/');
		});
	});

	describe('Clock integration', () => {
		it('should call clock.isoString for home endpoint', async () => {
			await request(app).get('/');

			expect(mockClock.isoString).toHaveBeenCalled();
		});

		it('should call clock.isoString for 404 handler', async () => {
			vi.clearAllMocks();
			await request(app).get('/invalid');

			expect(mockClock.isoString).toHaveBeenCalled();
		});
	});
});
