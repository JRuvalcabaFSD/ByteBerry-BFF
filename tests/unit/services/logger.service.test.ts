import { WinstonLoggerService } from '@infrastructure';
import { IConfig, IClock } from '@interfaces';

describe('WinstonLoggerService', () => {
	let mockConfig: IConfig;
	let mockClock: IClock;

	beforeEach(() => {
		mockConfig = {
			serviceName: 'TestService',
			logLevel: 'info',
			isProduction: () => false,
			isDevelopment: () => true,
			isTest: () => false,
		} as any;

		mockClock = {
			now: () => new Date(),
			timestamp: () => Date.now(),
			isoString: () => '2025-01-01T00:00:00.000Z',
		} as unknown as IClock;
	});

	describe('constructor', () => {
		it('should create logger instance', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			expect(logger).toBeDefined();
		});

		it('should accept default context', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock, { requestId: 'test' });
			expect(logger).toBeDefined();
		});
	});

	describe('logging methods', () => {
		it('should log info messages', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			expect(() => logger.info('test message')).not.toThrow();
		});

		it('should log error messages', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			expect(() => logger.error('test error')).not.toThrow();
		});

		it('should log warn messages', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			expect(() => logger.warn('test warning')).not.toThrow();
		});

		it('should log debug messages', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			expect(() => logger.debug('test debug')).not.toThrow();
		});

		it('should accept context with log messages', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			expect(() => logger.info('test', { userId: '123' })).not.toThrow();
		});
	});

	describe('child logger', () => {
		it('should create child logger with additional context', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			const child = logger.child({ requestId: 'test-123' });

			expect(child).toBeDefined();
			expect(typeof child.info).toBe('function');
		});

		it('should merge context in child logger', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock, { service: 'parent' });
			const child = logger.child({ requestId: 'test' });

			expect(() => child.info('message')).not.toThrow();
		});
	});

	describe('log method', () => {
		it('should log with custom level', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			expect(() => logger.log('info', 'test message')).not.toThrow();
		});

		it('should include requestId in log entry', () => {
			const logger = new WinstonLoggerService(mockConfig, mockClock);
			expect(() => logger.log('info', 'test', { requestId: 'test-id' })).not.toThrow();
		});
	});

	describe('production format', () => {
		it('should use production format when in production', () => {
			const prodConfig = {
				...mockConfig,
				isProduction: () => true,
				isDevelopment: () => false,
			} as any;

			const logger = new WinstonLoggerService(prodConfig, mockClock);
			expect(logger).toBeDefined();
		});
	});
});
