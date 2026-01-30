import { IJwtPayload } from '@interfaces';

/**
 * Interface representing user data, typically extracted from authentication tokens or user profiles.
 * It includes essential user identifiers, roles, scopes, and token expiration details.
 *
 * @interface UserData
 */

interface UserData {
	userId: string;
	email: string;
	username: string;
	roles: string[];
	scopes: string[];
	issuedAt: string;
	expiredAt: string;
	expiresIn: number;
	isExpiringSoon: boolean;
}

/**
 * Represents payload data containing JWT payload information, expiration status, and request details.
 *
 * @interface payloadData
 */

interface payloadData {
	payload: IJwtPayload;
	isExpiringSoon: boolean;
	expiresIn: number;
	requestId: string;
}

/**
 * Represents the response structure for the "me" endpoint, which provides information about the authenticated user.
 * @property user - The data of the authenticated user.
 * @property timestamp - The timestamp when the response was generated.
 * @property requestId - A unique identifier for the request.
 */
interface MeResponse {
	user: UserData;
	timestamp: string;
	requestId: string;
}

/**
 * Represents a user registration request.
 * @interface RegisterUserRequest
 * @property {string} email - The email address of the user.
 * @property {string} username - The username for the account.
 * @property {string} password - The password for the account.
 * @property {string} confirmPassword - Confirmation of the password for validation purposes.
 */

export interface RegisterUserRequest {
	email: string;
	username: string;
	password: string;
	confirmPassword: string;
}

/**
 * Represents the response returned after a user registration attempt.
 *
 * @property message - A descriptive message about the registration result.
 * @property userId - The unique identifier assigned to the newly registered user.
 * @property email - The email address associated with the registered user.
 * @property username - The username chosen by the registered user.
 * @property timestamp - The ISO timestamp indicating when the registration occurred.
 */

export interface RegisterUserResponse {
	message: string;
	userId: string;
	email: string;
	username: string;
	timestamp: string;
}

/**
 * Represents a request to update a user's profile information.
 * All fields are optional; only provided fields will be updated.
 *
 * @property {string} [username] - The new username for the user.
 * @property {string} [email] - The new email address for the user.
 */

export interface UpdateUserProfileRequest {
	username?: string;
	email?: string;
}

/**
 * Represents the response returned after updating a user's profile.
 *
 * @property {string} message - A message describing the result of the update operation.
 * @property {string} userId - The unique identifier of the updated user.
 * @property {string} email - The updated email address of the user.
 * @property {string} username - The updated username of the user.
 * @property {string} timestamp - The ISO timestamp when the update occurred.
 */

export interface UpdateUserProfileResponse {
	message: string;
	userId: string;
	email: string;
	username: string;
	timestamp: string;
}

/**
 * Represents a request to change a user's password.
 *
 * @property currentPassword - The user's current password.
 * @property newPassword - The new password the user wants to set.
 * @property confirmPassword - Confirmation of the new password to ensure it matches.
 */

export interface ChangePasswordRequest {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

/**
 * Represents the response returned after a user's password has been changed.
 *
 * @property message - A descriptive message about the password change operation.
 * @property timestamp - The ISO string representing the time when the password change occurred.
 */

export interface ChangePasswordResponse {
	message: string;
	timestamp: string;
}

/**
 * Represents a Data Transfer Object (DTO) for user information extracted from a JWT payload.
 * This class encapsulates user details, roles, scopes, and token expiration data, providing
 * methods to create instances and serialize to JSON responses.
 */

export class UserInfoDTO {
	public readonly userId!: string;
	public readonly email!: string;
	public readonly username!: string;
	public readonly roles!: string[];
	public readonly scopes!: string[];
	public readonly issuedAt!: string;
	public readonly expiredAt!: string;
	public readonly expiresIn!: number;
	public readonly requestId!: string;
	public readonly isExpiringSoon!: boolean;

	/**
	 * Private constructor to create a UserInfoDTO instance.
	 * @param data - The data object containing user information and additional fields.
	 */

	private constructor(data: UserData & { expiresIn: number; requestId: string }) {
		Object.assign(this, data);
	}

	/**
	 * Creates a new UserInfoDTO instance from the provided payload data.
	 * @param data - The payload data containing the JWT payload, expiration info, and request details.
	 * @returns A new UserInfoDTO instance.
	 */

	public static create(data: payloadData): UserInfoDTO {
		const { payload, expiresIn, requestId, isExpiringSoon } = data;
		return new UserInfoDTO({
			userId: payload.sub,
			email: payload.email,
			username: payload.username,
			roles: payload.roles,
			scopes: UserInfoDTO.parseScopes(payload.scope),
			issuedAt: UserInfoDTO.unixToIso(payload.iat),
			expiredAt: UserInfoDTO.unixToIso(payload.exp),
			expiresIn,
			requestId,
			isExpiringSoon,
		});
	}

	/**
	 * Serializes the UserInfoDTO to a JSON response object.
	 * @returns The MeResponse object containing user data and metadata.
	 */

	public toJSON(): MeResponse {
		return {
			user: {
				userId: this.userId,
				email: this.email,
				username: this.username,
				roles: this.roles,
				scopes: this.scopes,
				issuedAt: this.issuedAt,
				expiredAt: this.expiredAt,
				expiresIn: this.expiresIn,
				isExpiringSoon: false,
			},
			timestamp: new Date().toISOString(),
			requestId: this.requestId,
		};
	}

	/**
	 * Parses the scope string or array into an array of trimmed scope strings.
	 * @param scopeString - The scope as a string or array of strings.
	 * @returns An array of parsed and trimmed scopes.
	 */

	private static parseScopes(scopeString?: string | string[]): string[] {
		if (!scopeString) return [];
		if (typeof scopeString === 'string') {
			return scopeString
				.split(' ')
				.map((scope) => scope.trim())
				.filter((scope) => scope.length > 0);
		}
		return scopeString.map((scope) => scope.trim()).filter((scope) => scope.length > 0);
	}

	/**
	 * Converts a Unix timestamp to an ISO string.
	 * @param timestamp - The Unix timestamp in seconds.
	 * @returns The ISO string representation of the timestamp.
	 */

	private static unixToIso(timestamp: number): string {
		return new Date(timestamp * 1000).toISOString();
	}
}
