import { wrapContainerLogger } from '@shared';
describe('wrapContainerLogger', () => {
	it('should wrap logger when resolving Logger token', () => {
		const logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			log: vi.fn(),
			child: vi.fn().mockReturnThis(),
		};
		const container = {
			resolve: vi.fn((token) => {
				if (token === 'Logger') return logger;
				return 'other';
			}),
		};

		const proxied = wrapContainerLogger(container, 'CTX');
		const wrappedLogger = proxied.resolve('Logger') as typeof logger;
		expect(wrappedLogger).not.toBe(logger); // debe estar decorado
		wrappedLogger.debug('msg');
		expect(logger.debug).toHaveBeenCalledWith('[CTX] msg');
	});

	it('should not wrap non-logger tokens', () => {
		const container = {
			resolve: vi.fn((token) => 'other'),
		};
		const proxied = wrapContainerLogger(container, 'CTX');
		const result = proxied.resolve('OtherToken');
		expect(result).toBe('other');
	});
});
import { withLoggerContext, LogContextClass, LogContextMethod } from '@shared';
import type { ILogger } from '@interfaces';

describe('Logger Decorators', () => {
	const createMockLogger = (): ILogger => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		log: vi.fn(),
		child: vi.fn().mockReturnThis(),
	} as unknown as ILogger);

	describe('withLoggerContext', () => {
				it('should wrap a function and call logger.debug if logger arg present', () => {
					const mockLogger = {
						debug: vi.fn(),
					};
					// función dummy que solo retorna un string
					const fn = (arg: any) => 'ok';
					const wrapped = withLoggerContext(fn, 'CTX');
					// Llama con un objeto que tiene .logger
					wrapped({ logger: mockLogger });
					expect(mockLogger.debug).toHaveBeenCalledWith('[CTX] Function executed');
				});
		it('should wrap logger methods with context prefix', () => {
			const mockLogger = createMockLogger();
			const wrappedLogger = withLoggerContext(mockLogger, 'TestService');

			wrappedLogger.debug('test message');

			expect(mockLogger.debug).toHaveBeenCalledWith('[TestService] test message');
		});

		it('should not double-wrap with same context', () => {
			const mockLogger = createMockLogger();
			const wrapped1 = withLoggerContext(mockLogger, 'TestService');
			const wrapped2 = withLoggerContext(wrapped1, 'TestService');

			expect(wrapped1).toBe(wrapped2);
		});

		it('should handle non-string first arguments', () => {
			const mockLogger = createMockLogger();
			const wrappedLogger = withLoggerContext(mockLogger, 'TestService');

			wrappedLogger.info('message', { data: 'test' });

			expect(mockLogger.info).toHaveBeenCalled();
		});
	});

	describe('LogContextClass', () => {
		it('should wrap logger in class constructor', () => {
			const mockLogger = createMockLogger();

			@LogContextClass()
			class TestService {
				constructor(public logger: ILogger) {}
			}

			const service = new TestService(mockLogger);
			service.logger.debug('test');

			expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('TestService'));
		});
	});

	describe('LogContextMethod', () => {
		it('should wrap logger for method duration', () => {
			const mockLogger = createMockLogger();

			class TestService {
				logger: ILogger;

				constructor(logger: ILogger) {
					this.logger = logger;
				}

				@LogContextMethod()
				testMethod() {
					return 'test';
				}
			}

			const service = new TestService(mockLogger);
			const result = service.testMethod();

			expect(result).toBe('test');
		});
	});
});
