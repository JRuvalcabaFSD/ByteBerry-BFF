import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IGetUserProfileUseCase } from '@interfaces';
import type { Request, Response, NextFunction } from 'express';
import { MeController } from '@presentation';

describe('MeController', () => {
	let controller: MeController;
	let mockUseCase: IGetUserProfileUseCase;
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockUseCase = {
			execute: vi.fn(),
		};
		controller = new MeController(mockUseCase);
		mockReq = {
			user: { id: 'user123' },
			requestId: 'req123',
		};
		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		};
		mockNext = vi.fn();
	});

	it('should return user data on success', async () => {
		const mockResponse = {
			toJSON: vi.fn().mockReturnValue({ id: 'user123', name: 'John Doe' }),
		};
		(mockUseCase.execute as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

		await controller.handle(mockReq as Request, mockRes as Response, mockNext);

		expect(mockUseCase.execute).toHaveBeenCalledWith(mockReq.user, 'req123');
		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({ id: 'user123', name: 'John Doe' });
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('should call next with error on failure', async () => {
		const error = new Error('Use case error');
		(mockUseCase.execute as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(error);

		await controller.handle(mockReq as Request, mockRes as Response, mockNext);

		expect(mockUseCase.execute).toHaveBeenCalledWith(mockReq.user, 'req123');
		expect(mockNext).toHaveBeenCalledWith(error);
		expect(mockRes.status).not.toHaveBeenCalled();
		expect(mockRes.json).not.toHaveBeenCalled();
	});
});
