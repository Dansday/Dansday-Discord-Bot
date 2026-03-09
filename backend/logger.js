import { getOtelLogger } from './otel-logger.js';
import { SeverityNumber } from '@opentelemetry/api-logs';

function buildPayload(level, message, meta) {
    const payload = {
        level,
        message,
        time: new Date().toISOString()
    };

    if (meta && typeof meta === 'object') {
        payload.meta = meta;
    }

    return JSON.stringify(payload);
}

function emitOtel(level, severityNumber, message, meta) {
    try {
        const otel = getOtelLogger();
        if (!otel) return;
        const attributes = meta && typeof meta === 'object' ? meta : {};
        otel.emit({
            severityNumber,
            severityText: level.toUpperCase(),
            body: message,
            attributes
        });
    } catch (_) {}
}

function info(message, meta) {
    const line = buildPayload('info', message, meta);
    console.log(line);
    emitOtel('info', SeverityNumber.INFO, message, meta);
}

function debug(message, meta) {
    const line = buildPayload('debug', message, meta);
    console.log(line);
    emitOtel('debug', SeverityNumber.DEBUG, message, meta);
}

function warn(message, meta) {
    const line = buildPayload('warn', message, meta);
    console.warn(line);
    emitOtel('warn', SeverityNumber.WARN, message, meta);
}

function error(message, meta) {
    const line = buildPayload('error', message, meta);
    console.error(line);
    emitOtel('error', SeverityNumber.ERROR, message, meta);
}

// Backwards-compatible generic log method
function log(message, meta) {
    info(message, meta);
}

function init(client) {
    void client;
}

export default {
    init,
    log,
    info,
    debug,
    warn,
    error
};
