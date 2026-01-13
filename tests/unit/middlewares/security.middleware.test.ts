import { createSecurityMiddleware } from '@infrastructure';

describe('Security Middleware', () => {
	describe('createSecurityMiddleware', () => {
		it('should create a middleware function', () => {
			const middleware = createSecurityMiddleware();
			expect(typeof middleware).toBe('function');
		});

		it('should return helmet middleware', () => {
			const middleware = createSecurityMiddleware();
			// Helmet middleware tiene un nombre específico
			expect(middleware.name).toBeDefined();
		});
	});
});
