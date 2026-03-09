/**
 * Step 3 from SigNoz: Configure OpenTelemetry Logger
 * https://signoz.io/docs/logs-management/send-logs/nodejs-logs/
 * Creates LoggerProvider at load time (like the doc). Self-hosted: no OTEL_EXPORTER_OTLP_HEADERS.
 */
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Doc: create provider at load time (like logger.js in the guide)
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const serviceName = process.env.OTEL_SERVICE_NAME;

let loggerProvider = null;
if (endpoint && endpoint.trim()) {
    try {
        const resource = resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName });
        // Doc: "It automatically reads OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS"
        // Self-hosted: do not set OTEL_EXPORTER_OTLP_HEADERS
        const logExporter = new OTLPLogExporter({});
        loggerProvider = new LoggerProvider({
            resource,
            processors: [new BatchLogRecordProcessor(logExporter)]
        });
        const flushInterval = setInterval(() => loggerProvider.forceFlush().catch(() => {}), 5000);
        if (flushInterval.unref) flushInterval.unref();
        console.warn('[otel-logger] OTLP logs enabled (self-hosted) serviceName:', serviceName);
    } catch (err) {
        console.error('[otel-logger] Failed to create OTLP logger:', err?.message || err);
    }
}

export function getLoggerProvider() {
    return loggerProvider;
}

export function getOtelLogger() {
    return loggerProvider ? loggerProvider.getLogger('default', '1.0.0') : null;
}

export default loggerProvider;
