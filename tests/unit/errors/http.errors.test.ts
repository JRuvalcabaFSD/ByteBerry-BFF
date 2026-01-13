import {
	HttpError,
	CorsOriginError,
	ValidateRequestError,
	InvalidCodeError,
	InvalidTokenError,
	InvalidCreationTokenError,
	InvalidClientError,
	InvalidUser,
	InvalidCredentialsError,
	LoginError,
	InvalidSessionError,
	InvalidRSAError,
	NotFoundRecordError,
	ForbiddenError,
	ErrorList,
} from "@shared";

// Mock AppError - assuming it exists in domain

// Mock the AppError import

describe("HTTP Errors", () => {
	describe("HttpError base class", () => {
		it("should create HttpError with all properties", () => {
			const errorList: ErrorList[] = [{ field: "email", msg: "Invalid email" }];
			const error = new HttpError(
				"Test message",
				"http",
				"Test cause",
				400,
				errorList,
			);

			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe("HttpError");
			expect(error.message).toBe("Test message");
			expect(error.statusCode).toBe(400);
			expect(error.errorCause).toBe("Test cause");
			expect(error.errorList).toBe(errorList);
		});

		it("should create HttpError without errorList", () => {
			const error = new HttpError("Test message", "http", "Test cause", 500);

			expect(error.errorList).toBeNull();
		});

		it("should serialize to JSON correctly with errorList", () => {
			const errorList: ErrorList[] = [
				{ field: "email", msg: "Invalid email" },
				{ field: "password", msg: ["Too short", "Missing special character"] },
			];
			const error = new HttpError(
				"Validation failed",
				"http",
				"Bad Request",
				400,
				errorList,
			);

			const json = error.toJSON();

			expect(json).toEqual({
				error: "Bad Request",
				message: "Validation failed",
				statusCode: 400,
				errorList: errorList,
			});
		});

		it("should serialize to JSON correctly without errorList", () => {
			const error = new HttpError(
				"Server error",
				"http",
				"Internal Error",
				500,
			);

			const json = error.toJSON();

			expect(json).toEqual({
				error: "Internal Error",
				message: "Server error",
				statusCode: 500,
			});
		});

		it("should capture stack trace", () => {
			const error = new HttpError("Test error", "http", "Test", 400);
			expect(error.stack).toBeDefined();
		});
	});

	describe("CorsOriginError", () => {
		it("should create error with origin", () => {
			const error = new CorsOriginError("https://malicious.com");

			expect(error).toBeInstanceOf(HttpError);
			expect(error.name).toBe("CorsOriginError");
			expect(error.message).toBe(
				"Origin https://malicious.com not allowed by CORS",
			);
			expect(error.statusCode).toBe(200);
			expect(error.errorCause).toBe("Invalid Cors");
			expect(error.origin).toBe("https://malicious.com");
		});

		it("should create error without origin", () => {
			const error = new CorsOriginError("");

			expect(error.message).toBe("Not allowed by CORS");
			expect(error.origin).toBe("");
		});

		it("should handle null/undefined origin", () => {
			const error = new CorsOriginError(null as any);
			expect(error.message).toBe("Not allowed by CORS");
			expect(error.origin).toBeNull();
		});
	});

	describe("ValidateRequestError", () => {
		it("should create validation error with error list", () => {
			const errorList: ErrorList[] = [
				{ field: "name", msg: "Required" },
				{ field: "age", msg: "Must be positive" },
			];
			const error = new ValidateRequestError("Validation failed", errorList);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.name).toBe("ValidateRequest");
			expect(error.message).toBe("Validation failed");
			expect(error.statusCode).toBe(400);
			expect(error.errorCause).toBe("Invalid request data");
			expect(error.errorList).toBe(errorList);
		});

		it("should create validation error without error list", () => {
			const error = new ValidateRequestError("General validation error");

			expect(error.errorList).toBeNull();
		});

		it("should handle complex error messages", () => {
			const errorList: ErrorList[] = [
				{ field: "email", msg: ["Invalid format", "Already exists"] },
				{ field: "password", msg: "Too weak" },
			];
			const error = new ValidateRequestError(
				"Multiple validation errors",
				errorList,
			);

			expect(error.errorList).toHaveLength(2);
			expect(error.errorList![0].msg).toEqual([
				"Invalid format",
				"Already exists",
			]);
			expect(error.errorList![1].msg).toBe("Too weak");
		});
	});

	describe("OAuth Errors", () => {
		describe("InvalidCodeError", () => {
			it("should create invalid code error", () => {
				const error = new InvalidCodeError("Authorization code expired");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("InvalidCodeError");
				expect(error.message).toBe("Authorization code expired");
				expect(error.statusCode).toBe(401);
				expect(error.errorCause).toBe("Invalid code");
			});
		});

		describe("InvalidTokenError", () => {
			it("should create invalid token error", () => {
				const error = new InvalidTokenError("JWT token malformed");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("InvalidTokenError");
				expect(error.message).toBe("JWT token malformed");
				expect(error.statusCode).toBe(401);
				expect(error.errorCause).toBe("Invalid token");
			});
		});

		describe("InvalidCreationTokenError", () => {
			it("should create invalid creation token error", () => {
				const error = new InvalidCreationTokenError("Token format invalid");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("InvalidCreationTokenError");
				expect(error.message).toBe("Token format invalid");
				expect(error.statusCode).toBe(400);
				expect(error.errorCause).toBe("Creation token");
			});
		});

		describe("InvalidClientError", () => {
			it("should create invalid client error", () => {
				const error = new InvalidClientError("Client not registered");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("InvalidClientError");
				expect(error.message).toBe("Client not registered");
				expect(error.statusCode).toBe(401);
				expect(error.errorCause).toBe("Invalid client");
			});
		});

		describe("InvalidUser", () => {
			it("should create invalid user error", () => {
				const error = new InvalidUser("User not found");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("InvalidUser");
				expect(error.message).toBe("User not found");
				expect(error.statusCode).toBe(401);
				expect(error.errorCause).toBe("Invalid user");
			});
		});

		describe("InvalidRSAError", () => {
			it("should create invalid RSA error", () => {
				const error = new InvalidRSAError("RSA key corrupted");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("InvalidRSAError");
				expect(error.message).toBe("RSA key corrupted");
				expect(error.statusCode).toBe(500);
				expect(error.errorCause).toBe("Server error");
			});
		});
	});

	describe("Authentication Errors", () => {
		describe("InvalidCredentialsError", () => {
			it("should create invalid credentials error", () => {
				const error = new InvalidCredentialsError("Wrong username or password");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("InvalidCredentialsError");
				expect(error.message).toBe("Wrong username or password");
				expect(error.statusCode).toBe(401);
				expect(error.errorCause).toBe("Invalid credentials");
			});
		});

		describe("LoginError", () => {
			it("should create login error", () => {
				const error = new LoginError("Login attempt failed");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("LoginError");
				expect(error.message).toBe("Login attempt failed");
				expect(error.statusCode).toBe(401);
				expect(error.errorCause).toBe("Login failed");
			});
		});

		describe("InvalidSessionError", () => {
			it("should create invalid session error", () => {
				const error = new InvalidSessionError("Session expired");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("InvalidSessionError");
				expect(error.message).toBe("Session expired");
				expect(error.statusCode).toBe(401);
				expect(error.errorCause).toBe("Invalid session");
			});
		});
	});

	describe("Resource Errors", () => {
		describe("NotFoundRecordError", () => {
			it("should create not found error", () => {
				const error = new NotFoundRecordError("User record not found");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("NotFoundRecordError");
				expect(error.message).toBe("User record not found");
				expect(error.statusCode).toBe(404);
				expect(error.errorCause).toBe("No found record");
			});
		});

		describe("ForbiddenError", () => {
			it("should create forbidden error", () => {
				const error = new ForbiddenError("Access denied");

				expect(error).toBeInstanceOf(HttpError);
				expect(error.name).toBe("ForbiddenError");
				expect(error.message).toBe("Access denied");
				expect(error.statusCode).toBe(403);
				expect(error.errorCause).toBe("Forbidden");
			});
		});
	});

	describe("Error inheritance chain", () => {
		it("should maintain proper inheritance hierarchy", () => {
			const httpError = new HttpError("test", "http", "cause", 400);
			const corsError = new CorsOriginError("https://test.com");
			const validationError = new ValidateRequestError("validation failed");

			expect(httpError).toBeInstanceOf(Error);
			expect(corsError).toBeInstanceOf(Error);
			expect(corsError).toBeInstanceOf(HttpError);
			expect(validationError).toBeInstanceOf(Error);
			expect(validationError).toBeInstanceOf(HttpError);
		});

		it("should preserve instanceof checks for all error types", () => {
			const errors = [
				new CorsOriginError("test"),
				new ValidateRequestError("test"),
				new InvalidCodeError("test"),
				new InvalidTokenError("test"),
				new InvalidCreationTokenError("test"),
				new InvalidClientError("test"),
				new InvalidUser("test"),
				new InvalidCredentialsError("test"),
				new LoginError("test"),
				new InvalidSessionError("test"),
				new InvalidRSAError("test"),
				new NotFoundRecordError("test"),
				new ForbiddenError("test"),
			];

			errors.forEach((error) => {
				expect(error).toBeInstanceOf(Error);
				expect(error).toBeInstanceOf(HttpError);
			});
		});
	});

	describe("ErrorList type", () => {
		it("should handle string messages", () => {
			const errorList: ErrorList[] = [
				{ field: "name", msg: "Required field" },
				{ field: "email", msg: "Invalid format" },
			];

			expect(errorList[0].msg).toBe("Required field");
			expect(errorList[1].msg).toBe("Invalid format");
		});

		it("should handle array of strings messages", () => {
			const errorList: ErrorList[] = [
				{
					field: "password",
					msg: ["Too short", "Missing uppercase", "No special chars"],
				},
				{ field: "age", msg: ["Not a number", "Out of range"] },
			];

			expect(Array.isArray(errorList[0].msg)).toBe(true);
			expect(errorList[0].msg).toEqual([
				"Too short",
				"Missing uppercase",
				"No special chars",
			]);
			expect(errorList[1].msg).toEqual(["Not a number", "Out of range"]);
		});

		it("should handle mixed message types", () => {
			const errorList: ErrorList[] = [
				{ field: "username", msg: "Already taken" },
				{ field: "password", msg: ["Too short", "Too common"] },
				{ field: "email", msg: "Invalid domain" },
			];

			expect(typeof errorList[0].msg).toBe("string");
			expect(Array.isArray(errorList[1].msg)).toBe(true);
			expect(typeof errorList[2].msg).toBe("string");
		});
	});

	describe("JSON serialization consistency", () => {
		it("should have consistent toJSON across all HttpError subclasses", () => {
			const errors = [
				new HttpError("test", "http", "cause", 400),
				new CorsOriginError("test.com"),
				new ValidateRequestError("validation"),
				new InvalidCodeError("code"),
				new InvalidTokenError("token"),
			];

			errors.forEach((error) => {
				const json = error.toJSON();
				expect(json).toHaveProperty("error");
				expect(json).toHaveProperty("message");
				expect(json).toHaveProperty("statusCode");
				// errorList solo existe si el error lo tiene

				expect(typeof json.error).toBe("string");
				expect(typeof json.message).toBe("string");
				expect(typeof json.statusCode).toBe("number");
			});
		});

		it("should handle circular references in error serialization", () => {
			const error = new HttpError("test", "http", "cause", 400);
			// Add a circular reference to test JSON.stringify safety
			(error as any).circular = error;

			// toJSON should not include circular references
			const json = error.toJSON();
			expect(json).not.toHaveProperty("circular");
			expect(() => JSON.stringify(json)).not.toThrow();
		});
	});
});
