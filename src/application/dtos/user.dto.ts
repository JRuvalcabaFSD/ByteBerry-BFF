/**
 * Represents a user in the system.
 *
 * @interface User
 * @property {string} id - The unique identifier for the user.
 * @property {string} email - The user's email address.
 * @property {string | null} username - The user's username, or null if not set.
 * @property {string | null} fullName - The user's full name, or null if not set.
 * @property {string[]} roles - An array of roles assigned to the user.
 * @property {boolean} isActive - Indicates whether the user account is active.
 * @property {boolean} emailVerified - Indicates whether the user's email has been verified.
 * @property {string} accountType - The type of account the user has.
 * @property {boolean} isDeveloper - Indicates whether the user is a developer.
 * @property {boolean} canUseExpenses - Indicates whether the user can use the expenses feature.
 * @property {Date | null} developerEnabledAt - The date when developer access was enabled, or null if not enabled.
 * @property {Date | null} expensesEnabledAt - The date when expenses feature was enabled, or null if not enabled.
 * @property {Date} createdAt - The date when the user account was created.
 * @property {Date} updatedAt - The date when the user account was last updated.
 */

interface User {
	id: string;
	email: string;
	username: string | null;
	fullName: string | null;
	roles: string[];
	isActive: boolean;
	emailVerified: boolean;
	accountType: string;
	isDeveloper: boolean;
	canUseExpenses: boolean;
	developerEnabledAt: Date | null;
	expensesEnabledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Represents a User object with serialized date fields.
 *
 * Extends the User type by omitting the original date properties and replacing them
 * with string representations for JSON serialization/API responses.
 *
 * @typedef {Object} UserObject
 * @property {string} createdAt - The user's creation date as an ISO string
 * @property {string} updatedAt - The user's last update date as an ISO string
 * @property {string | null} developerEnabledAt - The date when developer mode was enabled, or null if not enabled
 * @property {string | null} expensesEnabledAt - The date when expenses feature was enabled, or null if not enabled
 *
 * @remarks
 * All date fields are converted from Date objects to strings to ensure proper serialization
 * when sending responses through the API.
 */

interface UserObject extends Omit<User, 'createdAt' | 'updatedAt' | 'developerEnabledAt' | 'expensesEnabledAt'> {
	createdAt: string;
	updatedAt: string;
	developerEnabledAt: string | null;
	expensesEnabledAt: string | null;
}

/**
 * Represents a user registration request.
 * @interface RegisterUserRequest
 * @property {string} email - The email address of the user.
 * @property {string} username - The username for the account.
 * @property {string} password - The password for the account.
 * @property {string} [fullName] - The full name of the user (optional).
 * @property {'user' | 'developer'} [accountType] - The type of account being created, either 'user' or 'developer' (optional).
 */

export interface RegisterUserRequest {
	email: string;
	username: string;
	password: string;
	fullName?: string;
	accountType?: 'user' | 'developer';
}

/**
 * Response object returned after a user registration request.
 * @interface RegisterUserResponse
 * @property {UserObject} user - The newly registered user object containing user details.
 * @property {string} message - A message providing feedback about the registration operation.
 */

export interface RegisterUserResponse {
	user: UserObject;
	message: string;
}

/**
 * Response object containing user information.
 * @interface UserResponse
 * @property {UserObject} user - The user object containing user details.
 */

export interface UserResponse {
	user: UserObject;
}

/**
 * Represents the response containing user token information.
 *
 * @property userId - The unique identifier of the user.
 * @property email - The email address associated with the user.
 * @property username - The username of the user.
 * @property roles - An array of roles assigned to the user.
 * @property scope - An array of scopes granted to the user.
 */
export interface UserTokenResponse {
	userId: string;
	email: string;
	username: string;
	roles: string[];
	scope: string;
}

/**
 * Represents a request to update user information.
 *
 * @interface UpdateUserRequest
 * @property {string | null} [fullName] - The user's full name. Optional.
 * @property {string | null} [username] - The user's username. Optional.
 */

export interface UpdateUserRequest {
	fullName?: string | null;
	username?: string | null;
}

/**
 * Response object for updating a user.
 * @interface UpdateUserResponse
 * @property {UserObject} user - The updated user object containing the user's information.
 */

export interface UpdateUserResponse {
	user: UserObject;
}

/**
 * Request payload for updating a user's password.
 * @interface UpdatePasswordRequest
 * @property {string} currentPassword - The user's current password for verification.
 * @property {string} newPassword - The new password to set for the user.
 * @property {boolean} [revokeAllSessions] - Optional flag to revoke all active user sessions after password change. Defaults to false.
 */

export interface UpdatePasswordRequest {
	currentPassword: string;
	newPassword: string;
	revokeAllSessions?: boolean;
}

/**
 * Response DTO for password update operations.
 * @interface UpdatePasswordResponse
 * @property {string} message - A message describing the result of the password update operation.
 * @property {boolean} [sessionRevoked] - Optional flag indicating whether the user's session was revoked after the password update.
 */

export interface UpdatePasswordResponse {
	message: string;
	sessionRevoked?: boolean;
}
