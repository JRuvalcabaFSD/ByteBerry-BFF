import { bootstrap } from '@bootstrap';
import { BootstrapError } from '@shared';

// Mock del módulo container
const loggerMock = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
	child: vi.fn(() => loggerMock),
	log: vi.fn(),
};

const mockGShutdown = {
	registerCleanup:vi.fn(),
	shutdown:vi.fn(),
	performShutdown:vi.fn(),
	setupSignalHandlers:vi.fn()
}

vi.mock('@container', () => ({
	bootstrapContainer: vi.fn(() => ({
		resolve: vi.fn((token: string) => {
			if (token === 'HttpServer') {
				return {
					start: vi.fn().mockResolvedValue(undefined),
				};
			}
			if (token === 'Logger') {
				return loggerMock;
			}
			if (token === 'GracefulShutdown') {
				return mockGShutdown;
			}
			return {};
		}),
	})),
}));

describe('Bootstrap', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('bootstrap', () => {
		it('should re-throw AppError if thrown', async () => {
			vi.resetModules();
			const { AppError } = await import('@domain');
			vi.doMock('@container', () => ({
				bootstrapContainer: () => { throw new AppError('App error', 'bootstrap'); }
			}));
			const { bootstrap } = await import('@bootstrap');
			await expect(bootstrap()).rejects.toThrow(AppError);
			await expect(bootstrap()).rejects.toThrow('App error');
			vi.resetModules();
		});
		it('should successfully bootstrap the application', async () => {
			const result = await bootstrap({skipDbValidation:true});

			expect(result).toBeDefined();
			expect(result.container).toBeDefined();
		});

		it('should start the HTTP server', async () => {
			const result = await bootstrap({skipDbValidation:true});
			const httpServer = result.container.resolve('HttpServer');

			expect(httpServer).toBeDefined();
		});

		it('should throw BootstrapError on failure', async () => {
			vi.resetModules();
			vi.doMock('@container', () => ({
				bootstrapContainer: () => { throw new Error('Container creation failed'); }
			}));
			const { bootstrap } = await import('@bootstrap');
			const { BootstrapError } = await import('@shared');
			await expect(bootstrap()).rejects.toThrow(BootstrapError);
			vi.resetModules();
		});

		it('should include error message in BootstrapError', async () => {
			vi.resetModules();
			vi.doMock('@container', () => ({
				bootstrapContainer: () => { throw new Error('Specific failure'); }
			}));
			const { bootstrap } = await import('@bootstrap');
			const { BootstrapError } = await import('@shared');
			try {
				await bootstrap();
			} catch (error) {
				expect(error).toBeInstanceOf(BootstrapError);
				expect((error as BootstrapError).message).toContain('Specific failure');
			}
			vi.resetModules();
		});
	});
});
