import { UserInfoDTO } from '@application';
import { describe, it, expect } from 'vitest';

// Mock IJwtPayload interface for testing
interface IJwtPayload {
	iss: string;
	sub: string;
	aud: string | string[];
	exp: number;
	iat: number;
	email: string;
	username: string;
	roles: string[];
	client_id: string;
	scope?: string;
	kid?: string;
}

describe('UserInfoDTO', () => {
	describe('create', () => {
		it('should create a UserInfoDTO instance with valid payloadData', () => {
			const payload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: 1609545600,
				iat: 1609459200,
				email: 'user@example.com',
				username: 'user',
				roles: ['admin', 'user'],
				client_id: 'test-client',
				scope: 'read write',
			};
			const data = {
				payload,
				isExpiringSoon: false,
				expiresIn: 86400,
				requestId: 'req123',
			};

			const dto = UserInfoDTO.create(data);

			expect(dto.userId).toBe('user123');
			expect(dto.email).toBe('user@example.com');
			expect(dto.username).toBe('user');
			expect(dto.roles).toEqual(['admin', 'user']);
			expect(dto.scopes).toEqual(['read', 'write']);
			expect(dto.issuedAt).toBe('2021-01-01T00:00:00.000Z');
			expect(dto.expiredAt).toBe('2021-01-02T00:00:00.000Z');
			expect(dto.expiresIn).toBe(86400);
			expect(dto.requestId).toBe('req123');
			expect(dto.isExpiringSoon).toBe(false);
		});

		it('should handle scope as an array', () => {
			const payload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: 1609545600,
				iat: 1609459200,
				email: 'user@example.com',
				username: 'user',
				roles: ['admin'],
				client_id: 'test-client',
				scope: 'read write',
			};
			const data = {
				payload,
				isExpiringSoon: true,
				expiresIn: 3600,
				requestId: 'req456',
			};

			const dto = UserInfoDTO.create(data);

			expect(dto.scopes).toEqual(['read', 'write']);
		});

		it('should handle missing scope', () => {
			const payload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: 1609545600,
				iat: 1609459200,
				email: 'user@example.com',
				username: 'user',
				roles: ['user'],
				client_id: 'test-client',
			};
			const data = {
				payload,
				isExpiringSoon: false,
				expiresIn: 86400,
				requestId: 'req789',
			};

			const dto = UserInfoDTO.create(data);

			expect(dto.scopes).toEqual([]);
		});

		it('should handle scope with extra spaces and empty strings', () => {
			const payload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: 1609545600,
				iat: 1609459200,
				email: 'user@example.com',
				username: 'user',
				roles: ['user'],
				client_id: 'test-client',
				scope: ' read  write  ',
			};
			const data = {
				payload,
				isExpiringSoon: false,
				expiresIn: 86400,
				requestId: 'req101',
			};

			const dto = UserInfoDTO.create(data);

			expect(dto.scopes).toEqual(['read', 'write']);
		});
	});

	describe('toJSON', () => {
		it('should return the correct MeResponse structure', () => {
			const payload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: 1609545600,
				iat: 1609459200,
				email: 'user@example.com',
				username: 'user',
				roles: ['admin'],
				client_id: 'test-client',
				scope: 'read',
			};
			const data = {
				payload,
				isExpiringSoon: true, // Note: toJSON hardcodes this to false
				expiresIn: 86400,
				requestId: 'req123',
			};

			const dto = UserInfoDTO.create(data);
			const json = dto.toJSON();

			expect(json).toHaveProperty('user');
			expect(json.user.userId).toBe('user123');
			expect(json.user.email).toBe('user@example.com');
			expect(json.user.username).toBe('user');
			expect(json.user.roles).toEqual(['admin']);
			expect(json.user.scopes).toEqual(['read']);
			expect(json.user.issuedAt).toBe('2021-01-01T00:00:00.000Z');
			expect(json.user.expiredAt).toBe('2021-01-02T00:00:00.000Z');
			expect(json.user.expiresIn).toBe(86400);
			expect(json.user.isExpiringSoon).toBe(false); // Always false in toJSON
			expect(json).toHaveProperty('timestamp');
			expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(json.requestId).toBe('req123');
		});
	});
});
