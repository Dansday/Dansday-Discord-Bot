/**
 * Step 4 from SigNoz: Instrument the default console logger
 * https://signoz.io/docs/logs-management/send-logs/nodejs-logs/
 * Must be loaded first (before any other app code).
 */
import '@opentelemetry/api-logs';
import loggerProvider from './backend/otel-logger.js';

const SeverityNumber = { DEBUG: 5, INFO: 9, WARN: 13, ERROR: 17 };

if (loggerProvider) {
    const logger = loggerProvider.getLogger('default', '1.0.0');
    const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug
    };

    function toMessage(args) {
        return args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
    }

    console.log = function (...args) {
        logger.emit({ severityNumber: SeverityNumber.INFO, severityText: 'INFO', body: toMessage(args), attributes: {} });
        originalConsole.log.apply(console, args);
    };
    console.info = function (...args) {
        logger.emit({ severityNumber: SeverityNumber.INFO, severityText: 'INFO', body: toMessage(args), attributes: {} });
        originalConsole.info.apply(console, args);
    };
    console.warn = function (...args) {
        logger.emit({ severityNumber: SeverityNumber.WARN, severityText: 'WARN', body: toMessage(args), attributes: {} });
        originalConsole.warn.apply(console, args);
    };
    console.error = function (...args) {
        logger.emit({ severityNumber: SeverityNumber.ERROR, severityText: 'ERROR', body: toMessage(args), attributes: {} });
        originalConsole.error.apply(console, args);
    };
    console.debug = function (...args) {
        logger.emit({ severityNumber: SeverityNumber.DEBUG, severityText: 'DEBUG', body: toMessage(args), attributes: {} });
        originalConsole.debug.apply(console, args);
    };
}
