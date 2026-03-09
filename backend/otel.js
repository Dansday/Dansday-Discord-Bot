import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

function hasOtelExporterConfigured() {
  return Boolean(
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
  );
}

function isOtelEnabled() {
  if (process.env.OTEL_SDK_DISABLED === 'true') return false;
  if (process.env.OTEL_ENABLED === 'true') return true;
  return hasOtelExporterConfigured();
}

function maybeEnableDiag() {
  const levelRaw = (process.env.OTEL_DIAGNOSTIC_LOG_LEVEL || '').trim().toUpperCase();
  if (!levelRaw) return;

  const level =
    DiagLogLevel[levelRaw] ??
    (levelRaw === 'VERBOSE' ? DiagLogLevel.VERBOSE : undefined) ??
    (levelRaw === 'ALL' ? DiagLogLevel.ALL : undefined);

  if (level == null) return;
  diag.setLogger(new DiagConsoleLogger(), level);
}

let sdk;
let started = false;

async function startOtel() {
  if (started) return;
  started = true;

  if (!isOtelEnabled()) return;

  maybeEnableDiag();

  const serviceName =
    process.env.OTEL_SERVICE_NAME ||
    process.env.SERVICE_NAME ||
    process.env.npm_package_name ||
    'Dansday-bot-system';

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  });

  // Logs pipeline (optional)
  try {
    const logsEnabled =
      (process.env.OTEL_LOGS_EXPORTER || '').toLowerCase() !== 'none' &&
      (process.env.OTEL_LOGS_EXPORTER
        ? true
        : Boolean(process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT));

    if (logsEnabled && LoggerProvider && BatchLogRecordProcessor && OTLPLogExporter) {
      const loggerProvider = new LoggerProvider({ resource });
      loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(new OTLPLogExporter()));
      logs.setGlobalLoggerProvider(loggerProvider);
    }
  } catch (e) {
    diag.error?.('Failed to init OpenTelemetry logs', e);
  }

  const traceExporter =
    (process.env.OTEL_TRACES_EXPORTER || '').toLowerCase() === 'none'
      ? undefined
      : OTLPTraceExporter
      ? new OTLPTraceExporter()
      : undefined;

  const metricReader =
    (process.env.OTEL_METRICS_EXPORTER || '').toLowerCase() === 'none'
      ? undefined
      : PeriodicExportingMetricReader && OTLPMetricExporter
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
          exportIntervalMillis: Number(process.env.OTEL_METRIC_EXPORT_INTERVAL_MS) || 60_000,
        })
      : undefined;

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    await sdk.start();
  } catch (e) {
    diag.error?.('Failed to start OpenTelemetry SDK', e);
  }

  const shutdown = async () => {
    try {
      await sdk?.shutdown?.();
    } catch (e) {
      diag.error?.('Failed to shutdown OpenTelemetry SDK', e);
    }
  };

  process.once('beforeExit', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

void startOtel();

