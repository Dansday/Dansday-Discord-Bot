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

// All app logs go through console; console-instrumentation sends them to OTLP (SigNoz)
function info(message, meta) {
    console.log(buildPayload('info', message, meta));
}

function debug(message, meta) {
    console.log(buildPayload('debug', message, meta));
}

function warn(message, meta) {
    console.warn(buildPayload('warn', message, meta));
}

function error(message, meta) {
    console.error(buildPayload('error', message, meta));
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
