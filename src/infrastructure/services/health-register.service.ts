import { HealthCheckable } from '@interfaces';

/**
 * Manages a registry of health checkable services.
 *
 * The `HealthRegistry` class allows you to register services that implement the `HealthCheckable` interface,
 * and provides access to all registered health checkers. This is useful for aggregating health checks
 * across multiple services in an application.
 *
 * @example
 * const registry = new HealthRegistry();
 * registry.register('database', new DatabaseHealthChecker());
 * const checkers = registry.getCheckers();
 */

export class HealthRegistry {
	private checkers = new Map<string, HealthCheckable>();

	register(name: string, service: HealthCheckable) {
		this.checkers.set(name, service);
	}

	getCheckers() {
		return this.checkers;
	}
}
