import env from 'env-var';
import pkg from '../../package.json' with { type: 'json' };

import { IConfig, LogLevel, NodeEnv } from '@interfaces';
import { ConfigError, getErrMessage, Injectable } from '@shared';

//TODO documentar
@Injectable({ name: 'Config' })
export class Config implements IConfig {
	//Code environments
	public readonly nodeEnv: NodeEnv;
	public readonly port: number;
	public readonly version: string;
	public readonly serviceName: string;
	public readonly serviceUrl: string;
	public readonly logLevel: LogLevel;
	public readonly logRequests: boolean;

	//Security environments
	readonly corsOrigins: string[];

	//OAuth2 environments
	readonly bffClientId: string;
	readonly bffClientSecret: string;
	readonly oauth2ServiceUrl: string;

	// Http Client environments
	readonly httpMaxRetries: number;
	readonly httpRetryDelay: number;

	// JWT environments
	readonly jwtIssuer: string;
	readonly jwtAudience: string;
	readonly jwksUrl: string;

	// JWKS environments
	readonly jwksCacheTtl: number;
	readonly jwksCacheMaxAge: number;

	constructor() {
		try {
			// ========================================
			// Core environments
			// ========================================
			this.nodeEnv = env.get('NODE_ENV').default('development').asEnum(['development', 'production', 'test']) as NodeEnv;
			this.port = env.get('PORT').default('4002').asPortNumber();
			this.version = pkg.version ?? '0.0.0';
			this.serviceName = env.get('SERVICE_NAME').default('ByteBerry-BFF').asString();
			this.serviceUrl = this.normalizeUrls(env.get('SERVICE_URL').default('http://localhost').asUrlString());

			const { logLevel, logRequest } = this.getLoggerEnvs();

			this.logLevel = logLevel;
			this.logRequests = logRequest;

			// ========================================
			// Security environments
			// ========================================
			this.corsOrigins = this.normalizeUrls(
				env.get('CORS_ORIGINS').default('http://localhost:5173,http://localhost:4003,http://localhost:4002').asArray(',')
			);

			// ========================================
			// OAuth2 environments
			// ========================================
			this.bffClientId = env.get('BFF_CLIENT_ID').default('byteberry-bff-client').asString();
			this.bffClientSecret = env.get('BFF_CLIENT_SECRET').required().asString();
			this.oauth2ServiceUrl = this.normalizeUrls(env.get('OAUTH2_SERVICE_URL').default('http://oauth2-service:4000').asUrlString());

			// ========================================
			// Http client environments
			// ========================================
			this.httpMaxRetries = env.get('HTTP_MAX_RETRIES').default('3').asIntPositive();
			this.httpRetryDelay = env.get('HTTP_RETRY_DELAY').default('1000').asIntPositive();

			// ========================================
			// JWT environments
			// ========================================

			this.jwtIssuer = this.normalizeUrls(env.get('JWT_ISSUER').default('https://byteberry.jrmdev.org').asUrlString());
			this.jwtAudience = env.get('JWT_AUDIENCE').default('byteberry-bff').asString();

			// ========================================
			// JWKS environments
			// ========================================

			this.jwksCacheTtl = env.get('JWKS_CACHE_TTL').default('3600').asIntPositive();
			this.jwksCacheMaxAge = env.get('JWKS_CACHE_MAX_AGE').default('86400').asIntPositive();
			this.jwksUrl = this.normalizeUrls(env.get('JWKS_URL').default('http://localhost:4000/auth/.well-known/jwks.json').asUrlString());
		} catch (error) {
			throw new ConfigError(`Failed to validate environment variables ${getErrMessage(error)}}`, this.generateContext());
		}
	}

	/**
	 * Determines if the current environment is set to 'development'.
	 *
	 * @returns {boolean} `true` if the environment is 'development'; otherwise, `false`.
	 */

	public isDevelopment(): boolean {
		return this.nodeEnv === 'development';
	}

	/**
	 * Determines if the current environment is set to production.
	 *
	 * @returns {boolean} `true` if the environment is 'production', otherwise `false`.
	 */

	public isProduction(): boolean {
		return this.nodeEnv === 'production';
	}

	/**
	 * Determines if the current environment is set to 'test'.
	 *
	 * @returns {boolean} True if the environment is 'test'; otherwise, false.
	 */

	public isTest(): boolean {
		return this.nodeEnv === 'test';
	}

	/**
	 * Generates a context object containing selected environment variables,
	 * formatted as PascalCase keys prefixed with 'provider'. Sensitive values
	 * (those whose keys include 'key', 'secret', 'token', or 'password') are
	 * redacted as '[REDACTED]'.
	 *
	 * @returns {Record<string, string>} An object mapping PascalCase environment variable keys
	 * prefixed with 'provider' to their corresponding values or '[REDACTED]' if sensitive.
	 *
	 * @example
	 * // Given process.env = { NODE_ENV: 'production', API_KEY: '12345' }
	 * // The output will be:
	 * // {
	 * //   providerNodeEnv: 'production',
	 * //   providerApiKey: '[REDACTED]'
	 * // }
	 */

	private generateContext(): Record<string, string> {
		const envs = ['NODE_ENV', 'PORT', 'SERVICE_NAME', 'SERVICE_URL'] as const;
		const sensitiveKeywords = ['key', 'secret', 'token', 'password'];

		return envs.reduce(
			(context, key) => {
				const pascalCase = key
					.toLowerCase()
					.split('_')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join('');

				const contextKey = `provider${pascalCase}`;

				const isSensitive = sensitiveKeywords.some((sk) => key.toLocaleLowerCase().includes(sk.toLocaleLowerCase()));

				context[contextKey] = isSensitive ? '[REDACTED]' : (process.env[key] ?? '');

				return context;
			},
			{} as Record<string, string>
		);
	}

	/**
	 * Normalizes URL(s) by standardizing protocol, hostname, and pathname formatting.
	 *
	 * This method performs the following normalizations:
	 * - Converts protocol to lowercase (e.g., "HTTP://" → "http://")
	 * - Converts hostname to lowercase (e.g., "Example.COM" → "example.com")
	 * - Removes trailing slashes from pathnames (except root "/")
	 * - Trims whitespace and removes any remaining trailing slashes
	 *
	 * @template T - The input type, either a single string or an array of strings
	 * @param input - A single URL string or an array of URL strings to normalize
	 * @returns The normalized URL(s) in the same format as the input (string or array)
	 *
	 * @example
	 * ```typescript
	 * // Single URL
	 * normalizeUrls("HTTPS://Example.COM/path/") // Returns: "https://example.com/path"
	 *
	 * // Multiple URLs
	 * normalizeUrls(["HTTP://API.Example.com/", "HTTPS://WWW.TEST.COM/endpoint/"])
	 * // Returns: ["http://api.example.com", "https://www.test.com/endpoint"]
	 * ```
	 *
	 * @remarks
	 * If a URL cannot be parsed (invalid format), a warning is logged to the console
	 * and the original URL string is returned unchanged.
	 */

	private normalizeUrls<T extends string | string[]>(input: T): T {
		// Helper function to normalize a single URL
		const normalizeSingleUrl = (url: string): string => {
			try {
				const parsed = new URL(url);
				parsed.protocol = parsed.protocol.toLowerCase();
				parsed.hostname = parsed.hostname.toLowerCase();
				if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
					parsed.pathname = parsed.pathname.slice(0, -1);
				}
				return parsed.toString().trim().replace(/\/+$/, '');
			} catch (error) {
				// eslint-disable-next-line no-console
				console.warn(`Invalid URL skipped for normalization: ${url}`, error);
				return url;
			}
		};

		// Handle single URL string or array of URLs
		if (typeof input === 'string') {
			return normalizeSingleUrl(input) as T;
		}

		return input.reduce<string[]>((acc, url) => {
			acc.push(normalizeSingleUrl(url));
			return acc;
		}, []) as T;
	}

	/**
	 * Retrieves logger-related environment configurations.
	 *
	 * This method enforces production safety by throwing a `ConfigError` if:
	 * - The application is running in production and the log level is set to "debug".
	 * - The application is running in production and request logging is enabled.
	 *
	 * @returns An object containing:
	 * - `logLevel`: The log level, which can be "debug", "info", "warn", or "error".
	 * - `logRequest`: A boolean indicating whether request logging is enabled.
	 *
	 * @throws {ConfigError} If invalid logger settings are detected in production.
	 */

	private getLoggerEnvs(): { logLevel: LogLevel; logRequest: boolean } {
		if (this.isProduction() && process.env.LOG_LEVEL === 'debug') throw new ConfigError('cannot assign logLevel as "debug" in production');
		if (this.isProduction() && process.env.LOG_REQUESTS === 'true') throw new ConfigError('cannot show the request logs in production');

		return {
			logLevel: env.get('LOG_LEVEL').default('info').asEnum(['debug', 'info', 'warn', 'error']),
			logRequest: env.get('LOG_REQUESTS').default('true').asBoolStrict(),
		};
	}

	/**
	 * Checks the health status of the configuration service.
	 *
	 * @returns A promise that resolves to an object indicating the health status (`'healthy'` or `'unhealthy'`)
	 *          and an optional message describing the current environment.
	 */

	public async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
		return {
			status: 'healthy',
			message: `Config operational (Env: ${this.nodeEnv})`,
		};
	}
}
