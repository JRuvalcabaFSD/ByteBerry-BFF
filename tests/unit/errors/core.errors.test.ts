import { AppError } from '@domain';
import { BootstrapError, CircularDependencyError, ConfigError, ContainerCreationError, ContainerError, TokenAlreadyRegisteredError, TokenNotRegisteredError } from '@shared';

describe('Bootstrap Errors', () => {
	describe('BootstrapError', () => {
		it('should create BootstrapError with message', () => {
			const error = new BootstrapError('Failed to start service');
			expect(error.message).toBe('Failed to start service');
			expect(error.name).toBe('BootstrapError');
			expect(error.errorType).toBe('bootstrap');
		});

		it('should include context when provided', () => {
			const context = { dbHost: 'localhost' };
			const error = new BootstrapError('DB connection failed', context);
			expect(error.context).toEqual(context);
		});

		it('should have undefined context when not provided', () => {
			const error = new BootstrapError('Test error');
			expect(error.context).toBeUndefined();
		});
	});
});

describe('Config Errors', () => {
	describe('ConfigError', () => {
		it('should create ConfigError with message', () => {
			const error = new ConfigError('Invalid config');
			expect(error.message).toBe('Invalid config');
			expect(error.name).toBe('ConfigError');
			expect(error.errorType).toBe('config');
		});

		it('should include context when provided', () => {
			const context = { variable: 'DATABASE_URL' };
			const error = new ConfigError('Missing variable', context);
			expect(error.context).toEqual(context);
		});

		it('should have undefined context when not provided', () => {
			const error = new ConfigError('Test error');
			expect(error.context).toBeUndefined();
		});
	});
});

describe('Container Errors', () => {
	describe('ContainerError', () => {
		it('should create ContainerError with message and token', () => {
			const error = new ContainerError('Test error', 'Config');
			expect(error.message).toBe('Test error');
			expect(error.token).toBe('Config');
			expect(error.name).toBe('ContainerError');
		});
	});

	describe('ContainerCreationError', () => {
		it('should create error with service not registered message', () => {
			const error = new ContainerCreationError('Logger');
			expect(error.message).toBe('Logger service not registered');
			expect(error.token).toBe('Logger');
		});
	});

	describe('TokenAlreadyRegisteredError', () => {
		it('should create error with already registered message', () => {
			const error = new TokenAlreadyRegisteredError('Logger');
			expect(error.message).toBe('Token Logger is already registered');
			expect(error.token).toBe('Logger');
		});
	});

	describe('TokenNotRegisteredError', () => {
		it('should create error with not registered message', () => {
			const error = new TokenNotRegisteredError('Config');
			expect(error.message).toBe('Token Config is not registered');
			expect(error.token).toBe('Config');
		});
	});

	describe('CircularDependencyError', () => {
		it('should create error with dependency chain description', () => {
			const error = new CircularDependencyError(['Config', 'Logger'], 'Config');
			expect(error.message).toContain('circular dependency detected');
			expect(error.message).toContain('Config');
			expect(error.message).toContain('Logger');
		});
	});
});

describe('Domain Errors', () => {
	describe('AppError', () => {
		it('should create AppError with message and type', () => {
			const error = new AppError('Test error', 'domain');
			expect(error.message).toBe('Test error');
			expect(error.errorType).toBe('domain');
			expect(error.name).toBe('AppError');
		});

		it('should support all error types', () => {
			const types = ['bootstrap', 'config', 'container', 'http', 'oauth', 'domain'];
			types.forEach((type) => {
				const error = new AppError('Test', type as any);
				expect(error.errorType).toBe(type);
			});
		});

		it('should capture stack trace', () => {
			const error = new AppError('Test error', 'domain');
			expect(error.stack).toBeDefined();
		});
	});
});
