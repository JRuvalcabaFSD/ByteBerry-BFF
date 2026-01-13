import { HttpServer } from '@infrastructure';
import type { IConfig, IClock, ILogger, IUuid } from '@interfaces';
import { AppRouter } from '@presentation';

describe('HttpServer', () => {
	let httpServer: HttpServer;
	let mockConfig: IConfig;
	let mockClock: IClock;
	let mockLogger: ILogger;
	let mockUuid: IUuid;
	let mockAppRouter: AppRouter;

	beforeEach(() => {
		mockConfig = {
			port: 3000,
			logRequests: true,
		} as IConfig;

		mockClock = {
			now: vi.fn().mockReturnValue(new Date()),
		} as unknown as IClock;

		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
		} as unknown as ILogger;

		mockUuid = {
			generate: vi.fn().mockReturnValue('test-uuid'),
		} as unknown as IUuid;

		mockAppRouter = {
			getRoutes: vi.fn().mockReturnValue((req:any, res:any, next:any) => next()),
		} as unknown as AppRouter;

		httpServer = new HttpServer(mockConfig, mockClock, mockLogger, mockUuid, mockAppRouter);
	});

	afterEach(async () => {
		if (httpServer.isRunning()) {
			await httpServer.stop();
		}
	});

	describe('constructor', () => {
		it('should initialize with correct dependencies', () => {
			expect(httpServer).toBeDefined();
		});

		it('should setup middlewares during construction', async () => {
			const app = await httpServer.getApp();
			expect(app).toBeDefined();
		});
	});

	describe('start', () => {
		it('should start the server successfully', async () => {
			await httpServer.start();
			expect(httpServer.isRunning()).toBe(true);
			expect(mockLogger.info).toHaveBeenCalledWith('Http Server started successfully');
		});

		it('should set startTime when server starts', async () => {
			await httpServer.start();
			const info = httpServer.getServeInfo();
			expect(info.startTime).toBeDefined();
		});

		it('should listen on configured port', async () => {
			await httpServer.start();
			const info = httpServer.getServeInfo();
			expect(info.port).toBeDefined();
		});

		it('should handle server error event during start', async () => {
			const testConfig = {
				...mockConfig,
				port: -1, // Invalid port to trigger error
			};
			const testServer = new HttpServer(testConfig, mockClock, mockLogger, mockUuid, mockAppRouter);

			await expect(testServer.start()).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to start Http Server',
				expect.objectContaining({ error: expect.any(String) })
			);
		});
	});

	describe('stop', () => {
		it('should stop running server', async () => {
			await httpServer.start();
			expect(httpServer.isRunning()).toBe(true);

			await httpServer.stop();
			expect(httpServer.isRunning()).toBe(false);
			expect(mockLogger.info).toHaveBeenCalledWith('Http Server stopped successfully');
		});

		it('should handle stop when server not running', async () => {
			await httpServer.stop();
			expect(mockLogger.warn).toHaveBeenCalledWith('Http Server stop called but server is not running');
		});

		it('should handle errors during server stop', async () => {
			await httpServer.start();

			// Mock the close method to trigger an error
			const server = (httpServer as any).server;
			const originalClose = server.close.bind(server);
			server.close = vi.fn((callback) => {
				callback(new Error('Error closing server'));
			});

			await expect(httpServer.stop()).rejects.toThrow('Error closing server');
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error stopping Http Server',
				expect.objectContaining({ error: expect.any(String) })
			);

			// Restore original close and cleanup
			server.close = originalClose;
			await new Promise<void>((resolve) => server.close(() => resolve()));
		});
	});

	describe('getApp', () => {
		it('should return Express application instance', async () => {
			const app = await httpServer.getApp();
			expect(app).toBeDefined();
			expect(typeof app.use).toBe('function');
		});
	});

	describe('isRunning', () => {
		it('should return false when server not started', () => {
			expect(httpServer.isRunning()).toBe(false);
		});

		it('should return true when server is running', async () => {
			await httpServer.start();
			expect(httpServer.isRunning()).toBe(true);
		});
	});

	describe('getServeInfo', () => {
		it('should return configured port when server not running', () => {
			const info = httpServer.getServeInfo();
			expect(info.port).toBe(mockConfig.port);
			expect(info.isRunning).toBe(false);
		});

		it('should return server info when running', async () => {
			await httpServer.start();
			const info = httpServer.getServeInfo();
			expect(info.isRunning).toBe(true);
			expect(info.startTime).toBeDefined();
		});
	});

	describe('checkHealth', () => {
		it('should return healthy status', async () => {
			const health = await httpServer.checkHealth();
			expect(health.status).toBe('healthy');
			expect(health.message).toBe('HttpServer service is available and operational');
		});
	});
});
