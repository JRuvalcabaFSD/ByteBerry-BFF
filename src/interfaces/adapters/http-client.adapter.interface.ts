//TODO documentar
declare module '@ServiceMap' {
	interface ServiceMap {
		HttpClient: IHttpClient;
	}
}

/**
 * Configuration options for HTTP requests.
 *
 * @interface HttpRequestConfig
 * @property {Record<string, string>} [headers] - HTTP headers to include in the request.
 * @property {number} [timeout] - Request timeout in milliseconds.
 * @property {unknown} [data] - The request body data.
 * @property {Record<string, string | number | boolean>} [params] - Query string parameters.
 * @property {boolean} [retry] - Whether to retry the request on failure.
 * @property {number} [maxRetries] - Maximum number of retry attempts.
 * @property {number} [retryDelay] - Delay in milliseconds between retry attempts.
 */

export interface HttpRequestConfig {
	headers?: Record<string, string>;
	timeout?: number;
	data?: unknown;
	params?: Record<string, string | number | boolean>;
	retry?: boolean;
	maxRetries?: number;
	retryDelay?: number;
}

/**
 * Represents the structure of an HTTP response.
 * @template T The type of data contained in the response body. Defaults to `unknown`.
 * @property {T} data The response body data.
 * @property {number} status The HTTP status code.
 * @property {string} statusText The HTTP status text message.
 * @property {Record<string, string>} headers The response headers as key-value pairs.
 */

export interface HttpResponse<T = unknown> {
	data: T;
	status: number;
	statusText: string;
	headers: Record<string, string>;
}

/**
 * HTTP client interface for making requests.
 *
 * Provides methods for common HTTP operations including GET, POST, PUT, DELETE, and PATCH.
 * All methods are asynchronous and return a promise with a typed response.
 *
 * @interface IHttpClient
 *
 * @example
 * ```typescript
 * const response = await httpClient.get<User>('/api/users/1');
 * ```
 */

export interface IHttpClient {
	get<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
	post<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
	put<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
	delete<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
	patch<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}
