import fs from "fs";
import { FORWARDER, COMMUNICATION, ENV } from "../../shared-config.js";
import logger from "../../logger.js";
import { delay } from "../../utils.js";

let forwarded = {};

// Ensure json directory exists
const jsonDir = "json";
if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
}

if (fs.existsSync(FORWARDER.FILES.JSON)) {
    forwarded = JSON.parse(fs.readFileSync(FORWARDER.FILES.JSON, "utf8"));
}

function saveForwarded() {
    // Ensure json directory exists before writing
    if (!fs.existsSync(jsonDir)) {
        fs.mkdirSync(jsonDir, { recursive: true });
    }
    fs.writeFileSync(FORWARDER.FILES.JSON, JSON.stringify(forwarded, null, 2));
}

async function sendToOfficialBot(messageData) {
    try {
        const response = await fetch(COMMUNICATION.WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Goblox-SelfBot/1.0.0',
                'X-Secret-Key': ENV.SECRET_KEY
            },
            body: JSON.stringify({
                type: 'message_forward',
                data: messageData,
                timestamp: Date.now()
            })
        });

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }

        await logger.log(`📤 Sent message ${messageData.id} to official bot via webhook (${response.status})`);
    } catch (err) {
        await logger.log(`❌ Failed to send message ${messageData.id} to official bot: ${err.message}`);
    }
}

async function processMessage(message, channelConfig, client) {
    const { group, type, fetchHistory } = channelConfig;

    if (fetchHistory && forwarded[message.id]) return;

    if (FORWARDER.EXCLUDED_USERS.includes(message.author.id)) {
        await logger.log(`⏭️ Skipped processing message ${message.id} from excluded user ${message.author.tag} (${message.author.id})`);
        return;
    }

    // Prepare message data for official bot
    const messageData = {
        id: message.id,
        content: message.content,
        author: {
            id: message.author.id,
            username: message.author.username,
            discriminator: message.author.discriminator,
            avatar: message.author.avatar,
            bot: message.author.bot
        },
        channel: {
            id: message.channel.id,
            name: message.channel.name
        },
        guild: {
            id: message.guild?.id,
            name: message.guild?.name
        },
        createdTimestamp: message.createdTimestamp,
        editedTimestamp: message.editedTimestamp,
        attachments: message.attachments.map(att => ({
            id: att.id,
            name: att.name,
            url: att.url,
            size: att.size,
            contentType: att.contentType
        })),
        embeds: message.embeds,
        forwarderConfig: {
            group,
            type,
            fetchHistory
        },
        timestamp: Date.now()
    };

    await sendToOfficialBot(messageData);

    if (fetchHistory) {
        forwarded[message.id] = true;
        saveForwarded();
    }

    await logger.log(`✅ Processed ${message.id} from ${group} (${type})`);
}

async function fetchHistoricalMessages(client) {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    for (const [channelId, config] of Object.entries(FORWARDER.SOURCE_CHANNELS)) {
        if (!config.fetchHistory) continue;

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.messages) continue;

        try {
            let lastId;
            let allMessages = [];

            while (true) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const messages = await channel.messages.fetch(options);
                if (!messages.size) break;

                for (const msg of messages.values()) {
                    if (msg.createdTimestamp < sevenDaysAgo) break;
                    if (!forwarded[msg.id]) {
                        allMessages.push(msg);
                    }
                }

                const oldest = messages.last();
                if (!oldest || oldest.createdTimestamp < sevenDaysAgo) break;
                lastId = oldest.id;
            }

            allMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            for (const msg of allMessages) {
                await processMessage(msg, config, client);
                await delay(5000);
            }

            await logger.log(`✅ Historical processing done for ${config.group} (${config.type}) - ${allMessages.length} messages`);
        } catch (err) {
            await logger.log(`❌ Error fetching for ${config.group} (${config.type}): ${err.message}`);
        }
    }
}

function init(client) {
    client.on("messageCreate", async (message) => {
        const channelConfig = FORWARDER.SOURCE_CHANNELS[message.channel.id];
        if (!channelConfig) return;

        await processMessage(message, channelConfig, client);
    });

    fetchHistoricalMessages(client);
}

export default { init };
