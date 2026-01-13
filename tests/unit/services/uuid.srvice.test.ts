import { UuidService } from '@infrastructure';

describe('UuidService', () => {
	let uuidService: UuidService;

	beforeEach(() => {
		uuidService = new UuidService();
	});

	describe('generate', () => {
		it('should generate valid UUID v4', () => {
			const uuid = uuidService.generate();
			expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		});

		it('should generate unique UUIDs', () => {
			const uuid1 = uuidService.generate();
			const uuid2 = uuidService.generate();
			expect(uuid1).not.toBe(uuid2);
		});
	});

	describe('isValid', () => {
		it('should return true for valid UUID', () => {
			const uuid = uuidService.generate();
			expect(uuidService.isValid(uuid)).toBe(true);
		});

		it('should return false for invalid UUID', () => {
			expect(uuidService.isValid('invalid-uuid')).toBe(false);
			expect(uuidService.isValid('123')).toBe(false);
			expect(uuidService.isValid('')).toBe(false);
		});

		it('should return false for non-string values', () => {
			expect(uuidService.isValid(123 as any)).toBe(false);
			expect(uuidService.isValid(null as any)).toBe(false);
		});
	});
});
