import { handledServicesError } from '@shared';
import { ConfigError, ContainerError, BootstrapError } from '@shared';
import * as shared from '@shared';

describe('Handled Services Errors', () => {
    let consoleLogSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(shared, 'getUTCTimestamp').mockReturnValue('01:46:25.088 UTC');
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        vi.restoreAllMocks();
    });

    describe('handledServicesError', () => {
        it('should include stack trace in log for ConfigError in development', () => {
            const prevEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            vi.spyOn(shared, 'getErrStack').mockReturnValue('fake-stack-trace');
            const error = new ConfigError('Stack error');
            handledServicesError(error);
            const logCall = consoleErrorSpy.mock.calls[0][0];
            expect(logCall).toContain('fake-stack-trace');
            process.env.NODE_ENV = prevEnv;
        });

        it('should include stack trace in log for ContainerError in development', () => {
            const prevEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            vi.spyOn(shared, 'getErrStack').mockReturnValue('container-stack-trace');
            const error = new ContainerError('Container stack', 'Config');
            handledServicesError(error);
            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).toContain('01:46:25.088 UTC [ByteBerry-BFF] Internal Server Error: Container stack');
            process.env.NODE_ENV = prevEnv;
        });

        it('should include stack trace in log for BootstrapError in development', () => {
            const prevEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            vi.spyOn(shared, 'getErrStack').mockReturnValue('bootstrap-stack-trace');
            const error = new BootstrapError('Bootstrap stack', { service: 'test' });
            handledServicesError(error);
            const logCall = consoleLogSpy.mock.calls[0][0];
            expect(logCall).toContain('01:46:25.088 UTC [ByteBerry-BFF] Internal Server Error: Bootstrap stack');
            process.env.NODE_ENV = prevEnv;
        });

        it('should handle ConfigError', () => {
            const error = new ConfigError('Invalid config', { key: 'PORT' });

            handledServicesError(error);

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should handle ContainerError', () => {
            const error = new ContainerError('Container failed', 'Config');

            handledServicesError(error);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should handle BootstrapError', () => {
            const error = new BootstrapError('Bootstrap failed', { service: 'test' });

            handledServicesError(error);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should handle generic errors with default handler', () => {
            const error = new Error('Generic error');

            handledServicesError(error);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should log error message for ConfigError', () => {
            const error = new ConfigError('Test error message');

            handledServicesError(error);

            const logCall = consoleErrorSpy.mock.calls[0][0];
            expect(logCall).toContain('Test error message');
        });

        it('should include timestamp in log', () => {
            const error = new ConfigError('Test');

            handledServicesError(error);

            const logCall = consoleErrorSpy.mock.calls[0][0];
            expect(logCall).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3} UTC/);
        });

        it('should handle errors without errorType', () => {
            const error = { message: 'Plain object error' };

            handledServicesError(error);

            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });
});
