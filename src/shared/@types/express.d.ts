import { ILogger } from '@interfaces';

declare global {
	namespace Express {
		interface Request {
			requestId?: string;
			logger?: ILogger;
			startTime?: number;
			user?: IJwtPayload;
			session?: {
				sessionId: string;
				userId: string;
				accessToken: string;
				refreshToken: string | null;
				tokenType: string;
				expiresAt: number;
			};
		}
	}
}

export {};
