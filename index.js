// Step 5: This must be the first import so all console.* are sent to SigNoz
import './console-instrumentation.js';

import controlPanel from './frontend/index.js';
import logger from './backend/logger.js';

logger.info('Starting Control Panel Server');
controlPanel.init().catch(err => {
    logger.error('Failed to start control panel', { error: String(err?.message || err) });
    process.exit(1);
});

function shutdown(signal) {
    logger.warn('Shutting down control panel', { signal });
    controlPanel.stop(() => {
        process.exit(0);
    });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
