import { getErrMessage, getErrStack, getUTCTimestamp } from '@shared';

describe('Shared Utils Functions', () => {
	describe('getErrMessage', () => {
		it('should extract message from Error instance', () => {
			const error = new Error('Test error message');
			expect(getErrMessage(error)).toBe('Test error message');
		});

		it('should return "Unknown Error" for non-Error values', () => {
			expect(getErrMessage('string error')).toBe('Unknown Error');
			expect(getErrMessage(123)).toBe('Unknown Error');
			expect(getErrMessage(null)).toBe('Unknown Error');
		});
	});

	describe('getErrStack', () => {
		it('should extract stack trace from Error instance', () => {
			const error = new Error('Test error');
			const stack = getErrStack(error);
			expect(stack).toBeDefined();
			expect(typeof stack).toBe('string');
		});

		it('should return undefined for non-Error values', () => {
			expect(getErrStack('not an error')).toBeUndefined();
			expect(getErrStack(null)).toBeUndefined();
		});
	});

	describe('getUTCTimestamp', () => {
		it('should return UTC timestamp in correct format', () => {
			const timestamp = getUTCTimestamp();
			expect(timestamp).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3} UTC$/);
		});
	});
});
