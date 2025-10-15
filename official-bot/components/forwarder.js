import fs from "fs";
import { FORWARDER } from "../../shared-config.js";
import logger from "../../logger.js";

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

export async function processMessageFromSelfBot(messageData, client) {
    const { group, type, fetchHistory } = messageData.forwarderConfig;

    if (fetchHistory && forwarded[messageData.id]) return;

    const targetChannelId = FORWARDER.TARGET_CHANNELS[group][type];
    const roleMention = FORWARDER.ROLE_MENTIONS[group];
    const targetChannel = client.channels.cache.get(targetChannelId);

    if (!targetChannel) {
        await logger.log(`❌ Target channel not found for ${group} (${type}): ${targetChannelId}`);
        return;
    }

    try {
        // Create embed for the forwarded message
        const embed = {
            color: 0x0099ff,
            title: `Message from ${messageData.guild.name}`,
            description: messageData.content || "*No content*",
            author: {
                name: `${messageData.author.username}#${messageData.author.discriminator}`,
                icon_url: messageData.author.avatar ?
                    `https://cdn.discordapp.com/avatars/${messageData.author.id}/${messageData.author.avatar}.png` :
                    `https://cdn.discordapp.com/embed/avatars/${parseInt(messageData.author.discriminator) % 5}.png`
            },
            timestamp: new Date(messageData.createdTimestamp).toISOString(),
            footer: {
                text: `Channel: ${messageData.channel.name}`
            }
        };

        // Add attachments if any
        if (messageData.attachments && messageData.attachments.length > 0) {
            embed.fields = [{
                name: "Attachments",
                value: messageData.attachments.map(att => `[${att.name}](${att.url})`).join('\n'),
                inline: false
            }];
        }

        // Send the message
        await targetChannel.send({
            content: roleMention,
            embeds: [embed]
        });

        if (fetchHistory) {
            forwarded[messageData.id] = true;
            saveForwarded();
        }

        await logger.log(`✅ Forwarded ${messageData.id} from ${group} (${type})`);
    } catch (err) {
        await logger.log(`❌ Failed to forward ${messageData.id}: ${err.message}`);
    }
}


function init(client) {
    logger.log("📡 Using webhook communication - file polling disabled");
}

export default { init };
