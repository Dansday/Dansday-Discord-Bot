/**
 * OpenTelemetry LoggerProvider + OTLP log exporter.
 * Used when OTEL_EXPORTER_OTLP_ENDPOINT is set (e.g. SigNoz).
 * Reads OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS from env.
 */
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let loggerInstance = null;
let provider = null;

function createOtelLogger() {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!endpoint || endpoint.trim() === '') {
        return null;
    }
    try {
        const serviceName = process.env.OTEL_SERVICE_NAME || 'dansday-bot-control-panel';
        const resource = resourceFromAttributes({
            [ATTR_SERVICE_NAME]: serviceName
        });
        const logExporter = new OTLPLogExporter({});
        provider = new LoggerProvider({
            resource,
            processors: [new BatchLogRecordProcessor(logExporter)]
        });
        loggerInstance = provider.getLogger('default', '1.0.0');
        return loggerInstance;
    } catch (err) {
        console.error('[otel-logger] Failed to create OTLP logger:', err?.message || err);
        return null;
    }
}

/**
 * Returns an OTel Logger that emits to OTLP, or null if endpoint is not set or creation failed.
 * @returns {import('@opentelemetry/api-logs').Logger | null}
 */
export function getOtelLogger() {
    if (loggerInstance !== undefined) {
        return loggerInstance;
    }
    loggerInstance = createOtelLogger();
    return loggerInstance;
}

export default { getOtelLogger };
