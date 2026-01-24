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
