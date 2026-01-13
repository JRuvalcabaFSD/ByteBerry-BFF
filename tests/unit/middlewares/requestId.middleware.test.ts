import { createRequestIdMiddleware } from '@infrastructure';
import { IUuid } from '@interfaces';

describe('RequestId Middleware', () => {
	const mockUuid: IUuid = {
		generate: () => 'test-uuid-1234',
		isValid: (uuid: string) => true,
	} as unknown as IUuid;

	describe('createRequestIdMiddleware', () => {
		it('should create a middleware function', () => {
			const middleware = createRequestIdMiddleware(mockUuid);
			expect(typeof middleware).toBe('function');
		});

		it('should use existing x-request-id header if present', () => {
			const middleware = createRequestIdMiddleware(mockUuid);
			const req = {
				headers: { 'x-request-id': 'existing-id' },
			} as any;
			const res = {
				setHeader: vi.fn(),
			} as any;
			const next = vi.fn();

			middleware(req, res, next);

			expect(req.requestId).toBe('existing-id');
			expect(res.setHeader).toHaveBeenCalledWith('X-RequestID', 'existing-id');
			expect(next).toHaveBeenCalled();
		});

		it('should generate new request id if not present', () => {
			const middleware = createRequestIdMiddleware(mockUuid);
			const req = {
				headers: {},
			} as any;
			const res = {
				setHeader: vi.fn(),
			} as any;
			const next = vi.fn();

			middleware(req, res, next);

			expect(req.requestId).toBe('test-uuid-1234');
			expect(res.setHeader).toHaveBeenCalledWith('X-RequestID', 'test-uuid-1234');
		});
	});
});
