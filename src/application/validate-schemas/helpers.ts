import { ErrorList } from '@shared';
import z from 'zod';

/**
 * Formats a ZodError into a user-friendly message or detailed error list based on the specified format.
 *
 * @param error - The ZodError object containing validation issues.
 * @param format - The output format: 'text' for a single error message, or 'form' for a detailed list of errors by field.
 * @returns An object with a 'msg' property. If format is 'text', returns { msg: string }. If format is 'form', returns { msg: string; errors: ErrorList[] } where ErrorList is an array of objects with 'field' and 'msg' properties.
 */

export function formattedZodError(error: z.ZodError, format: 'text'): { msg: string };
export function formattedZodError(error: z.ZodError, format: 'form'): { msg: string; errors: ErrorList[] };
export function formattedZodError(error: z.ZodError, format: 'form' | 'text'): { msg: string } | { msg: string; errors: ErrorList[] } {
	if (format === 'text') {
		const { fieldErrors } = z.flattenError(error);
		const todosMensajes = Object.values(fieldErrors).flat();
		return { msg: (todosMensajes[0] as string) ?? 'Error de validación' };
	}

	// Rama "form": lista detallada de errores por campo
	const errorList = error.issues.reduce<ErrorList[]>((acc, issue) => {
		const field = issue.path.join('.') || 'general';
		const msg = issue.message;

		const found = acc.find((e) => e.field === field);
		if (found) {
			if (Array.isArray(found.msg)) {
				found.msg.push(msg);
			} else {
				found.msg = [found.msg, msg];
			}
		} else {
			acc.push({ field, msg });
		}
		return acc;
	}, []);

	return { msg: 'Validation error', errors: errorList };
}

/**
 * Creates a validation schema for a required string field.
 * The schema ensures the string is trimmed and has a minimum length of 1.
 * @param campo - The name of the field being validated, used in error messages.
 * @returns A validation schema object that enforces the required string constraints.
 */
export const requiredString = (campo: string) => {
	return z.string(`${campo} is required`).trim().min(1, `${campo} cannot be empty`);
};

/**
 * Creates a schema that preprocesses a value to ensure it's a number and validates it as required.
 * If the input is a string, it parses it to an integer; otherwise, uses the value as-is.
 * The validation enforces that the field is a number with a custom error message.
 *
 * @param field - The name of the field to include in the error message if validation fails.
 * @returns A schema that preprocesses and validates the input as a required number.
 */

export const requiredNumber = (field: string) => {
	return z.preprocess(
		(val) => {
			if (typeof val === 'string') {
				return Number.parseInt(val);
			}

			return val;
		},
		z.number(`${field} is required`)
	);
};

export const validArray = (field: string) => {
	return z.array(z.string(), `${field} must be an array`).min(1, `${field} cannot be empty if provided`);
};
