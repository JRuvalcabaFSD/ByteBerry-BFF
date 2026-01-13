#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */

/**
 * Docker Health Check Script for ByteBerry BFF - Service
 * Tests if the service is responding to HTTP requests on /health endpoint
 */

const http = require('http');

const PORT = process.env.PORT || 4002;
const HOST = '0.0.0.0';
const HEALTH_PATH = '/health';
const TIMEOUT = 5000;

/**
 * Perform health check by making HTTP request to /health endpoint
 */
function performHealthCheck() {
	const options = {
		host: HOST,
		port: PORT,
		path: HEALTH_PATH,
		method: 'GET',
		timeout: TIMEOUT,
		headers: {
			'User-Agent': 'Docker-HealthCheck/1.0',
		},
	};

	const req = http.request(options, (res) => {
		let body = '';

		res.on('data', (chunk) => {
			body += chunk;
		});

		res.on('end', () => {
			if (res.statusCode === 200) {
				try {
					const healthData = JSON.parse(body);
					if (healthData.status === 'healthy') {
						console.log(`✅ Health check passed: ${healthData.service} is healthy`);
						process.exit(0);
					} else {
						console.log(`❌ Health check failed: Service status is ${healthData.status}`);
						process.exit(1);
					}
				} catch {
					console.log(`❌ Health check failed: Invalid JSON response`);
					process.exit(1);
				}
			} else {
				console.log(`❌ Health check failed: HTTP ${res.statusCode}`);
				process.exit(1);
			}
		});
	});

	req.on('error', (error) => {
		console.log(`❌ Health check failed: ${error.message}`);
		process.exit(1);
	});

	req.on('timeout', () => {
		console.log(`❌ Health check failed: Request timeout after ${TIMEOUT}ms`);
		req.destroy();
		process.exit(1);
	});

	req.setTimeout(TIMEOUT);
	req.end();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
	console.log(`❌ Health check failed: Uncaught exception - ${error.message}`);
	process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
	console.log(`❌ Health check failed: Unhandled rejection - ${reason}`);
	process.exit(1);
});

// Execute health check
console.log(`🔍 Performing health check on ${HOST}:${PORT}${HEALTH_PATH}...`);
performHealthCheck();
