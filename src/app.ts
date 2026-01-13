import dotenv from 'dotenv';

import { handledServicesError, withLoggerContext } from '@shared';
import { bootstrap } from '@bootstrap';

(() => {
	main().catch((error) => {
		handledServicesError(error);
		process.exit(1);
	});
})();

async function main() {
	dotenv.config({ override: false });
	const { container } = await bootstrap();

	const ctxLogger = withLoggerContext(container.resolve('Logger'), 'main');
	const { port, serviceUrl } = container.resolve('Config');

	ctxLogger.info(`service available in the url: ${serviceUrl}:${port}`);
}
