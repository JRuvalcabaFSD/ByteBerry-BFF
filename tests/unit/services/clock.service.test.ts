import { ClockService } from '@infrastructure';

describe('ClockService', () => {
	let clockService: ClockService;

	beforeEach(() => {
		clockService = new ClockService();
	});

	describe('now', () => {
		it('should return current Date object', () => {
			const now = clockService.now();
			expect(now).toBeInstanceOf(Date);
			expect(now.getTime()).toBeCloseTo(Date.now(), -2);
		});
	});

	describe('timestamp', () => {
		it('should return current timestamp in milliseconds', () => {
			const timestamp = clockService.timestamp();
			expect(typeof timestamp).toBe('number');
			expect(timestamp).toBeCloseTo(Date.now(), -2);
		});
	});

	describe('isoString', () => {
		it('should return ISO 8601 formatted string', () => {
			const isoString = clockService.isoString();
			expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});
	});
});
