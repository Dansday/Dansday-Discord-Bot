import { formatTimestamp } from "./utils.js";

async function log(text) {
    const timestamp = formatTimestamp(Date.now(), true);
    const formattedText = `[${timestamp}] ${text}`;

    try {
        console.log(formattedText);
    } catch (error) {
        console.error('Logger error:', error?.message || error);
    }
}

function init(client) {
    void client;
}

export default {
    init,
    log
};
