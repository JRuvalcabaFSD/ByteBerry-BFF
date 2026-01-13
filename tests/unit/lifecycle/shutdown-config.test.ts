import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureShutdown, GracefulShutdown, HttpServer } from '@infrastructure';
import { IHttpServer, ILogger } from '@interfaces';
import { withLoggerContext } from '@shared';

vi.mock('@shared', async () => {
	const actual = await vi.importActual<typeof import('@shared')>('@shared');
	return {
		...actual,
		withLoggerContext: vi.fn(),
	};
});

describe('configureShutdown', () => {
	let mockGShutdown: GracefulShutdown;
	let mockLogger: ILogger;
	let mockHttpServer: IHttpServer;
	let mockCtxLogger: ILogger;

	beforeEach(() => {
		mockGShutdown = {
			registerCleanup: vi.fn(),
		} as any;

		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		} as unknown as ILogger;

		mockHttpServer = {
			stop: vi.fn(),
		}as unknown as HttpServer;

		mockCtxLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		}as unknown as ILogger;

		(withLoggerContext as any).mockReturnValue(mockCtxLogger);
	});

	it('should configure shutdown and register HTTP server cleanup', () => {
		const result = configureShutdown(mockGShutdown, mockLogger, mockHttpServer);

		expect(withLoggerContext).toHaveBeenCalledWith(mockLogger, 'configureShutdown');
		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Configuring graceful shutdown');
		expect(mockGShutdown.registerCleanup).toHaveBeenCalledTimes(1);
		expect(result).toBe(mockGShutdown);
	});

	it('should execute cleanup successfully for HTTP server', async () => {
		configureShutdown(mockGShutdown, mockLogger, mockHttpServer);

		const cleanupFn = (mockGShutdown.registerCleanup as any).mock.calls[0][0];
		await cleanupFn();

		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Closing Http Server');
		expect(mockHttpServer.stop).toHaveBeenCalled();
		expect(mockCtxLogger.info).toHaveBeenCalledWith('Http Server closed');
	});

	it('should handle error during HTTP server stop', async () => {
		const error = new Error('Stop failed');
		mockHttpServer.stop = vi.fn().mockRejectedValue(error);

		configureShutdown(mockGShutdown, mockLogger, mockHttpServer);

		const cleanupFn = (mockGShutdown.registerCleanup as any).mock.calls[0][0];
		await expect(cleanupFn()).rejects.toThrow(error);

		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Closing Http Server');
		expect(mockHttpServer.stop).toHaveBeenCalled();
		expect(mockCtxLogger.error).toHaveBeenCalledWith('Failed to stop Http Server', { error: error.message });
	});

	it('should not call stop if httpServer is null', async () => {
		configureShutdown(mockGShutdown, mockLogger, null as any);

		const cleanupFn = (mockGShutdown.registerCleanup as any).mock.calls[0][0];
		await cleanupFn();

		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Closing Http Server');
		expect(mockHttpServer.stop).not.toHaveBeenCalled();
	});

	it('should not call stop if httpServer does not have stop method', async () => {
		const mockHttpServerNoStop = {} as IHttpServer;
		configureShutdown(mockGShutdown, mockLogger, mockHttpServerNoStop);

		const cleanupFn = (mockGShutdown.registerCleanup as any).mock.calls[0][0];
		await cleanupFn();

		expect(mockCtxLogger.debug).toHaveBeenCalledWith('Closing Http Server');
		expect(mockHttpServer.stop).not.toHaveBeenCalled();
	});
});
