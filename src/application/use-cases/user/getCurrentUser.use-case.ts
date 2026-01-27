import { UserInfoDTO } from '@application';
import type { IGetCurrentUserUseCase, IJwtPayload, ILogger } from '@interfaces';
import { Injectable, LogContextClass, LogContextMethod } from '@shared';

/**
 * Use case for retrieving the current user's information based on the provided token payload.
 * This class implements the {@link IGetCurrentUserUseCase} interface and handles the logic
 * for determining if the token is expiring soon, logging relevant details, and constructing
 * the user info response.
 */

@LogContextClass()
@Injectable({ name: 'GetCurrentUserUseCase', depends: ['Logger'] })
export class GetCurrentUserUseCase implements IGetCurrentUserUseCase {
	/**
	 * Threshold in seconds to determine if the token is expiring soon.
	 */

	private readonly EXPIRING_SOON_THRESHOLD = 300;

	/**
	 * Creates an instance of GetCurrentUserUseCase.
	 * @param logger - The logger instance used for debugging and logging operations.
	 */

	constructor(private readonly logger: ILogger) {}

	/**
	 * Executes the use case to retrieve current user information.
	 * Calculates the time until expiration, determines if the token is expiring soon,
	 * logs the operation, and returns the user info DTO.
	 * @param payload - The user information extracted from the token.
	 * @returns A promise that resolves to the user info DTO containing payload, expiresIn, and expireSoon.
	 */

	@LogContextMethod()
	public async execute(payload: IJwtPayload, requestId: string): Promise<UserInfoDTO> {
		const now = Math.floor(Date.now() / 1000);
		const expiresIn = payload.exp - now;
		const isExpiringSoon = expiresIn < this.EXPIRING_SOON_THRESHOLD;

		this.logger.debug('Current user retrieved', {
			userId: payload.sub,
			clientId: payload.client_id,
			expiresIn: payload.exp,
		});

		if (isExpiringSoon) {
			this.logger.warn('User token expiring soon', {
				userId: payload.sub,
				expiresIn: payload.exp,
			});
		}

		return UserInfoDTO.create({ payload, isExpiringSoon, expiresIn, requestId });
	}
}
