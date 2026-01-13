import { HealthRegistry } from "@infrastructure";
import type { HealthCheckable } from "@interfaces";

describe("HealthRegistry", () => {
	let registry: HealthRegistry;

	beforeEach(() => {
		registry = new HealthRegistry();
	});

	describe("constructor", () => {
		it("should create an empty registry", () => {
			const checkers = registry.getCheckers();
			expect(checkers).toBeInstanceOf(Map);
			expect(checkers.size).toBe(0);
		});
	});

	describe("register", () => {
		it("should register a health checker with a name", () => {
			const mockChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};

			registry.register("database", mockChecker);
			const checkers = registry.getCheckers();

			expect(checkers.size).toBe(1);
			expect(checkers.get("database")).toBe(mockChecker);
		});

		it("should register multiple health checkers", () => {
			const databaseChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};
			const cacheChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};

			registry.register("database", databaseChecker);
			registry.register("cache", cacheChecker);

			const checkers = registry.getCheckers();
			expect(checkers.size).toBe(2);
			expect(checkers.get("database")).toBe(databaseChecker);
			expect(checkers.get("cache")).toBe(cacheChecker);
		});

		it("should overwrite existing checker with same name", () => {
			const oldChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};
			const newChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "unhealthy" }),
			};

			registry.register("service", oldChecker);
			registry.register("service", newChecker);

			const checkers = registry.getCheckers();
			expect(checkers.size).toBe(1);
			expect(checkers.get("service")).toBe(newChecker);
		});

		it("should handle different checker implementations", () => {
			const simpleChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};

			const complexChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({
					status: "unhealthy",
					message: "Connection failed",
				}),
			};

			registry.register("simple", simpleChecker);
			registry.register("complex", complexChecker);

			const checkers = registry.getCheckers();
			expect(checkers.size).toBe(2);
			expect(checkers.get("simple")).toBe(simpleChecker);
			expect(checkers.get("complex")).toBe(complexChecker);
		});
	});

	describe("getCheckers", () => {
		it("should return empty map when no checkers registered", () => {
			const checkers = registry.getCheckers();
			expect(checkers).toBeInstanceOf(Map);
			expect(checkers.size).toBe(0);
		});

		it("should return map with all registered checkers", () => {
			const checker1: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};
			const checker2: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};

			registry.register("service1", checker1);
			registry.register("service2", checker2);

			const checkers = registry.getCheckers();
			expect(checkers.size).toBe(2);
			expect(checkers.has("service1")).toBe(true);
			expect(checkers.has("service2")).toBe(true);
		});

		it("should return the actual map reference", () => {
			const checker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};

			registry.register("test", checker);
			const checkers1 = registry.getCheckers();
			const checkers2 = registry.getCheckers();

			expect(checkers1).toBe(checkers2);
		});

		it("should allow direct map operations", () => {
			const checker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};

			registry.register("test", checker);
			const checkers = registry.getCheckers();

			// Direct map operations should work
			expect(Array.from(checkers.keys())).toContain("test");
			expect(Array.from(checkers.values())).toContain(checker);
			expect(checkers.forEach).toBeDefined();
		});
	});

	describe("integration scenarios", () => {
		it("should handle real health check workflow", async () => {
			const mockChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({
					status: "healthy",
					message: "Service is operational",
				}),
			};

			registry.register("api-service", mockChecker);
			const checkers = registry.getCheckers();
			const checker = checkers.get("api-service");

			expect(checker).toBeDefined();
			if (checker) {
				const health = await checker.checkHealth();
				expect(health.status).toBe("healthy");
				expect(health.message).toBe("Service is operational");
			}
		});

		it("should handle multiple services health check", async () => {
			const healthyChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
			};
			const unhealthyChecker: HealthCheckable = {
				checkHealth: vi.fn().mockResolvedValue({
					status: "unhealthy",
					message: "Service down",
				}),
			};

			registry.register("service1", healthyChecker);
			registry.register("service2", unhealthyChecker);

			const checkers = registry.getCheckers();
			const results = await Promise.all(
				Array.from(checkers.values()).map((checker) => checker.checkHealth()),
			);

			expect(results).toHaveLength(2);
			expect(results[0].status).toBe("healthy");
			expect(results[1].status).toBe("unhealthy");
		});
	});
});
