/**
 * OpenTelemetry LoggerProvider + OTLP log exporter (SigNoz doc Step 3).
 * Self-hosted: no OTEL_EXPORTER_OTLP_HEADERS (that's for Cloud only).
 * Reads OTEL_EXPORTER_OTLP_ENDPOINT from env; SDK appends /v1/logs.
 */
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let loggerProvider = null;

function createLoggerProvider() {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!endpoint || endpoint.trim() === '') {
        return null;
    }
    try {
        const serviceName = process.env.OTEL_SERVICE_NAME || 'dansday-bot-control-panel';
        const resource = resourceFromAttributes({
            [ATTR_SERVICE_NAME]: serviceName
        });
        // Empty config: reads OTEL_EXPORTER_OTLP_ENDPOINT from env; no HEADERS for self-hosted
        const logExporter = new OTLPLogExporter({});
        const provider = new LoggerProvider({
            resource,
            processors: [new BatchLogRecordProcessor(logExporter)]
        });
        const flushInterval = setInterval(() => provider.forceFlush().catch(() => {}), 5000);
        if (flushInterval.unref) flushInterval.unref();
        console.warn('[otel-logger] OTLP logs enabled (self-hosted, no headers) serviceName:', serviceName);
        return provider;
    } catch (err) {
        console.error('[otel-logger] Failed to create OTLP logger:', err?.message || err);
        return null;
    }
}

/**
 * Returns the LoggerProvider for OTLP logs, or null if endpoint not set.
 * Used by console-instrumentation to get a logger.
 */
export function getLoggerProvider() {
    if (loggerProvider === undefined) {
        loggerProvider = createLoggerProvider();
    }
    return loggerProvider;
}

/**
 * Returns an OTel Logger that emits to OTLP, or null.
 */
export function getOtelLogger() {
    const provider = getLoggerProvider();
    return provider ? provider.getLogger('default', '1.0.0') : null;
}

export default { getLoggerProvider, getOtelLogger };
