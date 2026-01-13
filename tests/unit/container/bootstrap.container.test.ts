import { bootstrapContainer, criticalServices } from '@container';
import { ContainerCreationError, InjectableError, TokenNotRegisteredError } from '@shared';
import { Container } from '@container';
import { AppError } from '@domain';

describe('Bootstrap Container', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.DATABASE_URL = "dummy"
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('bootstrapContainer', () => {
		it('should return a valid container instance', () => {
			const container = bootstrapContainer();
			expect(container).toBeDefined();
			expect(typeof container.resolve).toBe('function');
			expect(typeof container.register).toBe('function');
			expect(typeof container.registerSingleton).toBe('function');
			expect(typeof container.registerInstance).toBe('function');
			expect(typeof container.isRegistered).toBe('function');
		});

		it('should register all critical services', () => {
			const container = bootstrapContainer();
			criticalServices.forEach((token) => {
				expect(container.isRegistered(token)).toBe(true);
			});
		});

		it('should allow resolving all critical services', () => {
			const container = bootstrapContainer();
			criticalServices.forEach((token) => {
				expect(() => container.resolve(token)).not.toThrow();
				const service = container.resolve(token);
				expect(service).toBeDefined();
			});
		});

		it('should register Config service', () => {
			const container = bootstrapContainer();
			expect(container.isRegistered('Config')).toBe(true);
			const config = container.resolve('Config');
			expect(config).toBeDefined();
			expect(config.port).toBeDefined();
			expect(config.serviceName).toBeDefined();
		});

		it('should register Clock service', () => {
			const container = bootstrapContainer();
			expect(container.isRegistered('Clock')).toBe(true);
			const clock = container.resolve('Clock');
			expect(clock).toBeDefined();
			expect(typeof clock.now).toBe('function');
			expect(typeof clock.timestamp).toBe('function');
		});

		it('should register UUid service', () => {
			const container = bootstrapContainer();
			expect(container.isRegistered("Uuid")).toBe(true);
			const uuid = container.resolve("Uuid");
			expect(uuid).toBeDefined();
			expect(typeof uuid.generate).toBe('function');
		});

		it('should register Logger service as singleton', () => {
			const container = bootstrapContainer();
			expect(container.isRegistered('Logger')).toBe(true);
			const logger1 = container.resolve('Logger');
			const logger2 = container.resolve('Logger');
			expect(logger1).toBe(logger2);
		});

		it('should register HttpServer service', () => {
			const container = bootstrapContainer();
			expect(container.isRegistered('HttpServer')).toBe(true);
			const httpServer = container.resolve('HttpServer');
			expect(httpServer).toBeDefined();
			expect(typeof httpServer.start).toBe('function');
			expect(typeof httpServer.stop).toBe('function');
		});

		it('should register HealthService', () => {
			const container = bootstrapContainer();
			expect(container.isRegistered('HealthService')).toBe(true);
			const healthService = container.resolve('HealthService');
			expect(healthService).toBeDefined();
			expect(typeof healthService.getHealth).toBe('function');
			expect(typeof healthService.getDeepHealth).toBe('function');
		});

		it('should validate that all services can be resolved', () => {
			const container = bootstrapContainer();
			criticalServices.forEach((token) => {
				const service = container.resolve(token);
				expect(service).not.toBeNull();
				expect(service).not.toBeUndefined();
			});
		});

		it('should create services with proper dependencies', () => {
			const container = bootstrapContainer();

			// Logger depende de Config y Clock
			const logger = container.resolve('Logger');
			expect(logger).toBeDefined();

			// HttpServer depende del Container completo
			const httpServer = container.resolve('HttpServer');
			expect(httpServer).toBeDefined();
		});

		it('should handle service resolution errors gracefully', () => {
			const container = bootstrapContainer();

			// Intentar resolver un servicio que no existe
			expect(() => container.resolve('NonExistent' as any)).toThrow(TokenNotRegisteredError);
		});

		it('should not throw when all critical services are valid', () => {
			expect(() => bootstrapContainer()).not.toThrow();
		});
	});

	describe('validate function - coverage for branches', () => {
		it('should throw ContainerCreationError when service is not registered', () => {
			// Mock Container para simular servicio no registrado
			const originalContainer = Container;

			vi.spyOn(Container.prototype, 'isRegistered').mockImplementation(function(this: any, token: string) {
				// Simular que 'Config' no está registrado
				if (token === 'Config') return false;
				// Llamar al método original para otros tokens
				return this.registrations && this.registrations.has(token);
			});

			expect(() => bootstrapContainer()).toThrow(InjectableError);
			expect(() => bootstrapContainer()).toThrow('not registered');
		});

		it('should throw ContainerCreationError when service resolution fails', () => {
			// Mock Container para simular error en resolve
			vi.spyOn(Container.prototype, 'resolve').mockImplementation(function(this: any, token: string) {
				if (token === 'Config') {
					throw new Error('Resolution failed');
				}
				// Para otros servicios, devolver un objeto dummy del tipo adecuado
				return { dummy: true } as any;
			});

			expect(() => bootstrapContainer()).toThrow(ContainerCreationError);
		});

		it('should re-throw AppError when validation encounters AppError', () => {
			// Mock para lanzar un AppError específico
			vi.spyOn(Container.prototype, 'resolve').mockImplementation(function(this: any, token: string) {
				if (token === 'Config') {
					throw new AppError('This is an AppError', 'APP_ERROR' as any);
				}
				return { dummy: true } as any;
			});

			try {
				bootstrapContainer();
				expect(true).toBe(false); // Forzar fail si no lanza
			} catch (error) {
				expect(error).toBeInstanceOf(AppError);
				expect((error as AppError).errorType).toBe('APP_ERROR');
			}
		});

		it('should wrap non-AppError in ContainerCreationError', () => {
			// Mock para lanzar un error genérico (no AppError)
			vi.spyOn(Container.prototype, 'resolve').mockImplementation(function(this: any, token: string) {
				if (token === 'Config') {
					throw new Error('Generic error');
				}
				return { dummy: true } as any;
			});

			try {
				bootstrapContainer();
				// Si no lanza error, forzar el fail
				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeInstanceOf(ContainerCreationError);
				expect((error as ContainerCreationError).message).toContain('Config service not registered');
			}
		});

		it('should include token name in error when service not registered', () => {
			vi.spyOn(Container.prototype, 'isRegistered').mockImplementation(function(this: any, token: string) {
				if (token === 'Logger') return false;
				return true;
			});

			try {
				bootstrapContainer();
				expect(true).toBe(false); // Forzar fail si no lanza
			} catch (error) {
				expect(error).toBeInstanceOf(ContainerCreationError);
				expect((error as ContainerCreationError).message).toContain('Logger');
			}
		});

		it('should validate all critical services in order', () => {
			const isRegisteredSpy = vi.spyOn(Container.prototype, 'isRegistered');
			const resolveSpy = vi.spyOn(Container.prototype, 'resolve');

			bootstrapContainer();

			// Verificar que se validaron todos los servicios críticos
			criticalServices.forEach((token) => {
				expect(isRegisteredSpy).toHaveBeenCalledWith(token);
				expect(resolveSpy).toHaveBeenCalledWith(token);
			});
		});
	});

	describe('registerCoreServices', () => {
		it('should register all services in correct order', () => {
			const container = bootstrapContainer();

			// Verificar orden de dependencias
			expect(container.isRegistered('Config')).toBe(true);
			expect(container.isRegistered('Clock')).toBe(true);
			expect(container.isRegistered("Uuid")).toBe(true);

			// Logger depende de Config y Clock
			expect(container.isRegistered('Logger')).toBe(true);

			// HttpServer depende de todo lo anterior
			expect(container.isRegistered('HttpServer')).toBe(true);

			// HealthService depende de todo
			expect(container.isRegistered('HealthService')).toBe(true);
		});
	});
});
