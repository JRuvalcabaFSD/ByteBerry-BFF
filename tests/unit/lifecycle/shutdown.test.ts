import { CleanupFunction, GracefulShutdown } from '@infrastructure';
import type { ILogger } from '@interfaces';
import * as realProcess from 'process';

// Mock the logger
const mockLogger = {
	info: vi.fn(),
	debug: vi.fn(),
	error: vi.fn(),
} as unknown as ILogger;


// Mock process methods y forzar stub global
const mockProcessOn = vi.fn();
const mockProcessOff = vi.fn();
const mockProcessRemoveListener = vi.fn();
const mockProcessExit = vi.fn();

(global as any).process = {
	...realProcess,
	on: mockProcessOn,
	off: mockProcessOff,
	removeListener: mockProcessRemoveListener,
	exit: mockProcessExit,
};

describe('GracefulShutdown', () => {
	let shutdown: GracefulShutdown;

	beforeEach(() => {
		vi.clearAllMocks();
		shutdown = new GracefulShutdown(mockLogger);
	});

	afterEach(() => {

	});

	describe('constructor', () => {
		it('should initialize with empty cleanup functions and setup signal handlers', () => {
			expect(shutdown.registerCleanupsCount).toBe(0);
			expect(mockProcessOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
			expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
			expect(mockProcessOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
			expect(mockProcessOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
		});
	});

	describe('registerCleanup', () => {
		it('should add cleanup function and increment count', () => {
			const cleanup: CleanupFunction = vi.fn();
			shutdown.registerCleanup(cleanup);
			expect(shutdown.registerCleanupsCount).toBe(1);
			// Access private property for testing (assuming test environment allows)
			expect((shutdown as any).cleanupFunctions).toHaveLength(1);
		});
	});

	describe('shutdown', () => {
		it('should return the same promise on multiple calls', async () => {
			const promise1 = shutdown.shutdown();
			const promise2 = shutdown.shutdown();
			expect(promise1).toBe(promise2);
			await promise1;
		});

		it('should clear shutdown promise after completion', async () => {
			await shutdown.shutdown();
			expect((shutdown as any).shutdownPromise).toBeUndefined();
		});
	});

	describe('performShutdown', () => {
		it('should execute all cleanup functions in parallel and log appropriately', async () => {
			const cleanup1 = vi.fn().mockResolvedValue(undefined);
			const cleanup2 = vi.fn().mockRejectedValue(new Error('Test error'));
			shutdown.registerCleanup(cleanup1);
			shutdown.registerCleanup(cleanup2);

			await (shutdown as any).performShutdown();

			expect(mockLogger.info).toHaveBeenCalledWith('[GracefulShutdown.performShutdown] Starting 2 cleanup process...');
			expect(mockLogger.debug).toHaveBeenCalledWith('[GracefulShutdown.performShutdown] Running cleanup function 1');
			expect(mockLogger.debug).toHaveBeenCalledWith('[GracefulShutdown.performShutdown] Cleanup function 1 completed');
			expect(mockLogger.debug).toHaveBeenCalledWith('[GracefulShutdown.performShutdown] Running cleanup function 2');
			expect(mockLogger.error).toHaveBeenCalledWith('[GracefulShutdown.performShutdown] Cleanup function 2 failed', { error: 'Test error' });
			expect(mockLogger.info).toHaveBeenCalledWith('[GracefulShutdown.performShutdown] Cleanup process completed');
		});
	});

	describe('setupSignalHandlers', () => {
		it('should handle SIGTERM signal', () => {
			const sigtermCall = mockProcessOn.mock.calls.find(call => call[0] === 'SIGTERM');
			expect(sigtermCall).toBeDefined(); // Asegura que existe la llamada
			const handler = sigtermCall && sigtermCall[1];
			if (handler) {
				handler();
				expect(mockLogger.info).toHaveBeenCalledWith('[GracefulShutdown] Received SIGTERM, starting graceful shutdown...');
			}
			// Note: shutdown promise resolution would call process.exit, but we mock it
		});

		it('should handle uncaughtException', () => {
			const uncaughtCall = mockProcessOn.mock.calls.find(call => call[0] === 'uncaughtException');
			expect(uncaughtCall).toBeDefined();
			const handler = uncaughtCall![1];
			handler(new Error('Test uncaught'));
			expect(mockLogger.error).toHaveBeenCalledWith('[GracefulShutdown] Uncaught exception', { error: 'Test uncaught' });
		});

		it('should handle unhandledRejection', () => {
			const rejectionCall = mockProcessOn.mock.calls.find(call => call[0] === 'unhandledRejection');
			expect(rejectionCall).toBeDefined();
			const handler = rejectionCall![1];
			handler(new Error('Test rejection'));
			expect(mockLogger.error).toHaveBeenCalledWith(
				'[GracefulShutdown] Unhandled rejection',
				{ reason: "Error: Test rejection" }
			);
		});
	});
});
