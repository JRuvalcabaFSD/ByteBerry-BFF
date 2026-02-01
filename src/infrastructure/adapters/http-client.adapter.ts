import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { AxiosErrors, getErrMessage, HttpError, Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { HttpRequestConfig, HttpResponse, IConfig, IHttpClient, ILogger } from '@interfaces';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP client adapter that wraps Axios with retry logic and request/response transformation.
 *
 * Implements the IHttpClient interface and provides methods for making HTTP requests (GET, POST, PUT, DELETE, PATCH).
 * Features include:
 * - Automatic retry with exponential backoff for failed requests
 * - Request/response interceptors for logging and debugging
 * - Error transformation to custom error types
 * - Rate limit handling (429 status code)
 * - Configurable timeouts and retry policies
 * - Detailed logging at each request lifecycle stage
 *
 * @example
 * const adapter = new HttpClientAdapter(config, logger);
 * const response = await adapter.get<User>('/api/users/123');
 *
 * @implements {IHttpClient}
 */

@LogContextClass()
@Injectable({ name: 'HttpClient', depends: ['Config', 'Logger'] })
export class HttpClientAdapter implements IHttpClient {
	private readonly axiosInstance: AxiosInstance;
	private readonly defaultTimeout: number;
	private readonly defaultMaxRetries: number;
	private readonly defaultRetryDelay: number;

	constructor(
		config: IConfig,
		private readonly logger: ILogger
	) {
		this.defaultTimeout = 10000;
		this.defaultMaxRetries = config.httpMaxRetries;
		this.defaultRetryDelay = config.httpRetryDelay;

		this.axiosInstance = axios.create({
			timeout: this.defaultTimeout,
			headers: {
				'User-Agent': `${config.serviceName}/${config.version}`,
			},
		});

		this.setupInterceptors();
	}

	/**
	 * Sends an HTTP GET request to the specified URL.
	 *
	 * @typeParam T - The expected response data type.
	 * @param url - The endpoint URL to send the GET request to.
	 * @param config - Optional configuration for the HTTP request.
	 * @returns A promise that resolves to an {@link HttpResponse} containing the response data of type `T`.
	 */

	public async get<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
		return this.request<T>('GET', url, undefined, config);
	}

	/**
	 * Sends an HTTP POST request to the specified URL with optional data and configuration.
	 *
	 * @typeParam T - The expected response data type.
	 * @param url - The URL to which the POST request is sent.
	 * @param data - Optional data to be sent as the request body.
	 * @param config - Optional HTTP request configuration.
	 * @returns A promise that resolves to an {@link HttpResponse} containing the response data of type `T`.
	 */

	public async post<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
		return this.request<T>('POST', url, data, config);
	}

	/**
	 * Sends an HTTP PUT request to the specified URL with the provided data and configuration.
	 *
	 * @typeParam T - The expected response data type.
	 * @param url - The endpoint URL to send the PUT request to.
	 * @param data - Optional payload to include in the request body.
	 * @param config - Optional HTTP request configuration options.
	 * @returns A promise that resolves to an {@link HttpResponse} containing the response data of type `T`.
	 */

	public async put<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
		return this.request<T>('PUT', url, data, config);
	}

	/**
	 * Sends an HTTP DELETE request to the specified URL.
	 *
	 * @typeParam T - The expected response data type.
	 * @param url - The endpoint URL to send the DELETE request to.
	 * @param config - Optional configuration for the HTTP request.
	 * @returns A promise that resolves to an HttpResponse containing the response data of type T.
	 */

	public async delete<T = unknown>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
		return this.request<T>('DELETE', url, undefined, config);
	}

	/**
	 * Sends an HTTP PATCH request to the specified URL with optional data and configuration.
	 *
	 * @typeParam T - The expected response data type.
	 * @param url - The endpoint URL to send the PATCH request to.
	 * @param data - Optional payload to include in the PATCH request body.
	 * @param config - Optional HTTP request configuration options.
	 * @returns A promise that resolves to an `HttpResponse<T>` containing the response data.
	 */

	public async patch<T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
		return this.request<T>('PATCH', url, data, config);
	}

	/**
	 * Sends an HTTP request using the specified method, URL, and optional data/configuration.
	 * Implements retry logic with exponential backoff for retryable errors.
	 *
	 * @template T - The expected response data type.
	 * @param method - The HTTP method to use (e.g., 'GET', 'POST').
	 * @param url - The URL to send the request to.
	 * @param data - Optional data to send as the request body.
	 * @param config - Optional configuration for the request, including headers, timeout, retry options, etc.
	 * @returns A promise that resolves to an `HttpResponse<T>` containing the response data.
	 * @throws An error if the request fails after all retries or encounters a non-retryable client error.
	 */

	@LogContextMethod()
	private async request<T>(method: Method, url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
		const shouldRetry = config?.retry !== false;
		const maxRetries = config?.maxRetries ?? this.defaultMaxRetries;
		const retryDelay = config?.retryDelay ?? this.defaultRetryDelay;

		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= (shouldRetry ? maxRetries : 1); attempt++) {
			try {
				const axiosConfig: AxiosRequestConfig = {
					method,
					url,
					data,
					headers: config?.headers,
					timeout: config?.timeout ?? this.defaultTimeout,
					params: config?.params,
				};

				this.logger.debug('HTTP request', {
					method,
					url,
					attempt,
					maxRetries: shouldRetry ? maxRetries : 1,
				});

				const response: AxiosResponse<T> = await this.axiosInstance.request<T>(axiosConfig);
				this.logger.debug('HTTP request successful', {
					method,
					url,
					status: response.status,
					attempt,
				});

				return this.transformResponse<T>(response);
			} catch (error) {
				lastError = this.transformError(error);

				this.logger.warn('HTTP request failed', {
					method,
					url,
					attempt,
					maxRetries: shouldRetry ? maxRetries : 1,
					error: getErrMessage(lastError),
				});

				if (this.isClientError(error) && !this.isRateLimit(error)) throw lastError;

				if (shouldRetry && attempt < maxRetries) {
					const delay = retryDelay * Math.pow(2, attempt - 1);
					this.logger.debug('Retrying after delay', { delay, attempt, maxRetries });
					await this.sleep(delay);
				}
			}
		}

		this.logger.error('HTTP request failed after all retries', {
			method,
			url,
			maxRetries,
			error: getErrMessage(lastError),
		});

		throw lastError;
	}

	/**
	 * Sets up Axios request and response interceptors for logging purposes.
	 *
	 * - Logs debug information for each outgoing request, including HTTP method and URL.
	 * - Logs errors encountered during the request phase.
	 * - Logs debug information for each incoming response, including status and URL.
	 * - Logs errors encountered during the response phase, including status, URL, and error message.
	 *
	 * This method should be called during the initialization of the HTTP client adapter
	 * to ensure all requests and responses are properly logged.
	 *
	 * @private
	 */

	@LogContextMethod()
	private setupInterceptors(): void {
		this.axiosInstance.interceptors.request.use(
			(config) => {
				this.logger.debug('Axios request interceptor', {
					method: config.method?.toUpperCase(),
					url: config.url,
				});
				return config;
			},
			(error) => {
				this.logger.error('Axios request interceptor error', {
					error: getErrMessage(error),
				});
				return Promise.reject(error);
			}
		);

		this.axiosInstance.interceptors.response.use(
			(response) => {
				this.logger.debug('Axios response interceptor', {
					status: response.status,
					url: response.config.url,
				});
				return response;
			},
			(error) => {
				this.logger.debug('Axios response error interceptor', {
					status: error.response?.status,
					url: error.config?.url,
					error: getErrMessage(error),
				});
				return Promise.reject(error);
			}
		);
	}

	/**
	 * Transforms an Axios response into a standardized `HttpResponse` object.
	 *
	 * @template T - The type of the response data.
	 * @param response - The Axios response to transform.
	 * @returns A `HttpResponse` object containing the response data, status, status text, and headers.
	 */

	private transformResponse<T>(response: AxiosResponse<T>): HttpResponse<T> | PromiseLike<HttpResponse<T>> {
		return {
			data: response.data,
			status: response.status,
			statusText: response.statusText,
			headers: response.headers as Record<string, string>,
		};
	}

	/**
	 * Transforms an unknown error into a standardized `Error` instance.
	 *
	 * If the error is an Axios error, it wraps it in an `AxiosErrors` instance.
	 * Otherwise, it returns a generic `HttpError` indicating an unknown fetch error.
	 *
	 * @param error - The error object to transform, which may be of any type.
	 * @returns An `Error` instance representing the transformed error.
	 */

	private transformError(error: unknown): Error {
		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError;
			return new AxiosErrors(axiosError);
		}

		return new HttpError('Unknown fetch error', 'http', 'Unknown fetch error', 500);
	}

	/**
	 * Determines whether the provided error is an Axios client error (HTTP status code 4xx).
	 *
	 * @param error - The error object to check.
	 * @returns `true` if the error is an Axios error with a 4xx status code, otherwise `false`.
	 */

	private isClientError(error: unknown): boolean {
		if (axios.isAxiosError(error)) {
			const status = error.response?.status;
			return status !== undefined && status >= 400 && status < 500;
		}
		return false;
	}

	/**
	 * Determines whether the provided error is an Axios error caused by a rate limit (HTTP 429).
	 *
	 * @param error - The error object to check.
	 * @returns `true` if the error is an Axios error with a 429 status code, otherwise `false`.
	 */

	private isRateLimit(error: unknown): boolean {
		if (axios.isAxiosError(error)) {
			return error.response?.status === 429;
		}
		return false;
	}

	/**
	 * Delays execution for a specified number of milliseconds.
	 *
	 * @param ms - The number of milliseconds to sleep.
	 * @returns A promise that resolves after the specified delay.
	 */

	private sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
