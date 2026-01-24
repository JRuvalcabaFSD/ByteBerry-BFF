import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCurrentUserUseCase, UserInfoDTO } from '@application';
import type { IJwtPayload, ILogger } from '@interfaces';

describe('GetCurrentUserUseCase', () => {
	let loggerMock: ILogger;
	let useCase: GetCurrentUserUseCase;

	beforeEach(() => {
		loggerMock = {
			debug: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
			error: vi.fn(),
		} as unknown as ILogger;
		useCase = new GetCurrentUserUseCase(loggerMock);
		vi.spyOn(Date, 'now').mockReturnValue(1609459200 * 1000);
	});

	describe('execute', () => {
		it('should return user info when token is not expiring soon', async () => {
			const now = Math.floor(Date.now() / 1000);
			const mockPayload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: now + 600,
				iat: now,
				email: 'user@example.com',
				username: 'user',
				roles: ['user'],
				client_id: 'client456',
			};
			const requestId = 'req-123';

			const result = await useCase.execute(mockPayload, requestId);

			expect(result).toEqual(
				UserInfoDTO.create({
					payload: mockPayload,
					isExpiringSoon: false,
					expiresIn: 600,
					requestId,
				})
			);
			expect(loggerMock.debug).toHaveBeenCalledWith('[GetCurrentUserUseCase.execute] Current user retrieved', {
				userId: 'user123',
				clientId: 'client456',
				expiresIn: now + 600,
			});
			expect(loggerMock.warn).not.toHaveBeenCalled();
		});

		it('should return user info and log warning when token is expiring soon', async () => {
			const now = Math.floor(Date.now() / 1000);
			const mockPayload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: now + 200,
				iat: now,
				email: 'user@example.com',
				username: 'user',
				roles: ['user'],
				client_id: 'client456',
			};
			const requestId = 'req-123';

			const result = await useCase.execute(mockPayload, requestId);

			expect(result).toEqual(
				UserInfoDTO.create({
					payload: mockPayload,
					isExpiringSoon: true,
					expiresIn: 200,
					requestId,
				})
			);
			expect(loggerMock.debug).toHaveBeenCalledWith('[GetCurrentUserUseCase.execute] Current user retrieved', {
				userId: 'user123',
				clientId: 'client456',
				expiresIn: now + 200,
			});
			expect(loggerMock.warn).toHaveBeenCalledWith('[GetCurrentUserUseCase.execute] User token expiring soon', {
				userId: 'user123',
				expiresIn: now + 200,
			});
		});

		it('should handle token expiring exactly at threshold', async () => {
			const now = Math.floor(Date.now() / 1000);
			const mockPayload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: now + 300,
				iat: now,
				email: 'user@example.com',
				username: 'user',
				roles: ['user'],
				client_id: 'client456',
			};
			const requestId = 'req-123';

			const result = await useCase.execute(mockPayload, requestId);

			expect(result).toEqual(
				UserInfoDTO.create({
					payload: mockPayload,
					isExpiringSoon: false,
					expiresIn: 300,
					requestId,
				})
			);
			expect(loggerMock.debug).toHaveBeenCalledWith('[GetCurrentUserUseCase.execute] Current user retrieved', {
				userId: 'user123',
				clientId: 'client456',
				expiresIn: now + 300,
			});
			expect(loggerMock.warn).not.toHaveBeenCalled();
		});

		it('should handle token already expired', async () => {
			const now = Math.floor(Date.now() / 1000);
			const mockPayload: IJwtPayload = {
				iss: 'test-issuer',
				sub: 'user123',
				aud: 'test-audience',
				exp: now - 100,
				iat: now - 200,
				email: 'user@example.com',
				username: 'user',
				roles: ['user'],
				client_id: 'client456',
			};
			const requestId = 'req-123';

			const result = await useCase.execute(mockPayload, requestId);

			expect(result).toEqual(
				UserInfoDTO.create({
					payload: mockPayload,
					isExpiringSoon: true,
					expiresIn: -100,
					requestId,
				})
			);
			expect(loggerMock.debug).toHaveBeenCalledWith('[GetCurrentUserUseCase.execute] Current user retrieved', {
				userId: 'user123',
				clientId: 'client456',
				expiresIn: now - 100,
			});
			expect(loggerMock.warn).toHaveBeenCalledWith('[GetCurrentUserUseCase.execute] User token expiring soon', {
				userId: 'user123',
				expiresIn: now - 100,
			});
		});
	});
});
