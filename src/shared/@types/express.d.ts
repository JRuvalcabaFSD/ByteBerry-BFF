import { ILogger } from '@interfaces';

declare global {
	namespace Express {
		interface Request {
			requestId?: string;
			logger?: ILogger;
			startTime?: number;
			user?: {
				userId: string;
				sessionId: string;
			};
		}
	}
}

export {};
