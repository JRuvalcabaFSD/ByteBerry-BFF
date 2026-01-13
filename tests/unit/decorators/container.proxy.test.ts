import { containerWithLoggerContext, HasResolve, withLoggerContext } from '@shared';
import { describe, it, expect, vi } from 'vitest';

// Mocks
let mockWithLoggerContext: ReturnType<typeof vi.fn>;
vi.mock('@shared', async () => {
	const actual = await vi.importActual<typeof import('@shared')>('@shared');
	return {
		...actual,
		withLoggerContext: vi.fn((logger, ctx) => ({
			...logger,
			context: ctx,
		})),
	};
});

// Dummy ILogger
interface DummyLogger {
	log: (msg: string) => void;
	context?: string;
}

describe('containerWithLoggerContext', () => {
	const dummyLogger: DummyLogger = { log: vi.fn() };
	const dummyValue = { foo: 'bar' };

	let resolveSpy: <T = any>(token: unknown, ...rest: unknown[]) => T;
	let container: HasResolve;

	beforeEach(() => {
    resolveSpy = vi.fn((token: unknown) => {
        if (token === 'Logger') return dummyLogger;
        return dummyValue;
    }) as <T = any>(token: unknown, ...rest: unknown[]) => T;
    container = { resolve: resolveSpy };
});



	it('should call original resolve for non-Logger tokens', () => {
		const proxied = containerWithLoggerContext(container, 'CTX');
		const result = proxied.resolve('NotLogger');
		expect(resolveSpy).toHaveBeenCalledWith('NotLogger');
		expect(result).toBe(dummyValue);
	});



	it('should preserve resolve signature and pass extra arguments', () => {
		const resolveWithArgs = vi.fn((token, ...args) => [token, ...args]) as <T = any>(token: unknown, ...args: unknown[]) => T;
		const containerWithArgs = { resolve: resolveWithArgs };
		const proxied = containerWithLoggerContext(containerWithArgs, 'CTX');
		const result = proxied.resolve('SomeToken', 1, 2, 3);
		expect(result).toEqual(['SomeToken', 1, 2, 3]);
		expect(resolveWithArgs).toHaveBeenCalledWith('SomeToken', 1, 2, 3);
	});

	it('should not wrap if token is not exactly "Logger"', () => {
		const proxied = containerWithLoggerContext(container, 'CTX');
		proxied.resolve(Symbol('Logger'));
	});
});
