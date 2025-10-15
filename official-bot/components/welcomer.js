import fs from "fs";
import { WELCOMER } from "../../shared-config.js";
import logger from "../../logger.js";

let welcomed = {};

// Ensure json directory exists
const jsonDir = "json";
if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
}

if (fs.existsSync(WELCOMER.FILES.JSON)) {
    welcomed = JSON.parse(fs.readFileSync(WELCOMER.FILES.JSON, "utf8"));
}

function saveWelcomed() {
    // Ensure json directory exists before writing
    if (!fs.existsSync(jsonDir)) {
        fs.mkdirSync(jsonDir, { recursive: true });
    }
    fs.writeFileSync(WELCOMER.FILES.JSON, JSON.stringify(welcomed, null, 2));
}

function getRandomMessage() {
    const messages = WELCOMER.MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
}

async function welcomeUser(member, client) {
    const userId = member.user.id;
    
    if (welcomed[userId]) {
        await logger.log(`⏭️ User ${member.user.tag} (${userId}) already welcomed`);
        return;
    }

    const welcomeChannelId = WELCOMER.CHANNELS[member.guild.id];
    if (!welcomeChannelId) {
        await logger.log(`❌ No welcome channel configured for guild ${member.guild.id}`);
        return;
    }

    const welcomeChannel = client.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) {
        await logger.log(`❌ Welcome channel not found: ${welcomeChannelId}`);
        return;
    }

    try {
        const message = getRandomMessage().replace("{user}", `<@${userId}>`);
        await welcomeChannel.send(message);
        
        welcomed[userId] = {
            timestamp: Date.now(),
            guildId: member.guild.id,
            username: member.user.username
        };
        saveWelcomed();
        
        await logger.log(`✅ Welcomed ${member.user.tag} (${userId}) in ${member.guild.name}`);
    } catch (err) {
        await logger.log(`❌ Failed to welcome ${member.user.tag} (${userId}): ${err.message}`);
    }
}

function init(client) {
    client.on("guildMemberAdd", async (member) => {
        await welcomeUser(member, client);
    });
}

export default { init };
