import { LOGGER } from "./config.js";
import { formatTimestamp } from "./utils.js";

let logChannel = null;

async function log(text) {
    if (!logChannel) return;

    try {
        const timestamp = formatTimestamp(Date.now(), true);
        await logChannel.send(`[${timestamp}] ${text}`);
    } catch (err) {
        console.error("Failed to log to Discord:", err);
    }
}

function init(client) {
    logChannel = client.channels.cache.get(LOGGER.CHANNELS);
    if (!logChannel) {
        console.error("Log channel not found!");
    }
}

export default {
    init,
    log
};
