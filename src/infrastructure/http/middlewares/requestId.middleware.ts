import { Request, NextFunction, Response } from 'express';

import { IUuid } from '@interfaces';

/**
 * Creates an Express middleware that manages request IDs for incoming HTTP requests.
 *
 * This middleware checks for an existing 'x-request-id' header in the incoming request.
 * If found, it uses that value; otherwise, it generates a new UUID. The request ID is
 * then attached to the request object and set as an 'X-RequestID' response header.
 *
 * @param uuid - An object implementing the IUuid interface that provides a generate() method
 *               for creating unique identifiers when no request ID is present in headers.
 *
 * @returns An Express middleware function that:
 *          - Extracts or generates a request ID
 *          - Attaches the request ID to the request object (req.requestId)
 *          - Sets the 'X-RequestID' response header
 *          - Calls next() to continue the middleware chain
 *
 * @example
 * ```typescript
 * const requestIdMiddleware = createRequestIdMiddleware(uuidService);
 * app.use(requestIdMiddleware);
 * ```
 */

export function createRequestIdMiddleware(uuid: IUuid) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const headerRequestId = req.headers['x-request-id'] as string;
		const requestId = headerRequestId || uuid.generate();

		req.requestId = requestId;
		res.setHeader('X-RequestID', requestId);

		next();
	};
}
