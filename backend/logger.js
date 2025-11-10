import { formatTimestamp } from "./utils.js";
import { getLoggerChannel } from "./config.js";
import db from "../database/database.js";
import { getBotConfig } from "./config.js";

let logChannel = null;
let clientInstance = null;
let hasPermission = true;

async function getLoggerChannelFromOfficialBot(discordGuildId, officialBotId) {
    if (!officialBotId) return null;
    
    try {
        const officialServer = await db.getServerByDiscordId(officialBotId, discordGuildId);
        if (!officialServer) return null;
        
        const settings = await db.getServerSettings(officialServer.id, 'main_config');
        if (!settings || !settings.settings || !settings.settings.logger_channel) {
            return null;
        }
        
        return settings.settings.logger_channel;
    } catch (error) {
        return null;
    }
}

async function findLoggerChannelForAnyGuild() {
    if (!clientInstance) return null;
    
    let officialBotId = null;
    let isSelfbot = false;
    try {
        const botConfig = getBotConfig();
        if (botConfig && botConfig.bot_type === 'selfbot' && botConfig.connect_to) {
            officialBotId = botConfig.connect_to;
            isSelfbot = true;
        }
    } catch (error) {
    }
    
    try {
        let guilds = clientInstance.guilds.cache;
        if (guilds.size === 0) {
            try {
                await clientInstance.guilds.fetch();
                guilds = clientInstance.guilds.cache;
            } catch (fetchError) {
            }
        }
        
        for (const [, guild] of guilds) {
            try {
                let loggerChannelId = null;
                
                if (isSelfbot && officialBotId) {
                    loggerChannelId = await getLoggerChannelFromOfficialBot(guild.id, officialBotId);
                } else if (!isSelfbot) {
                    try {
                        loggerChannelId = await getLoggerChannel(guild.id);
                    } catch (error) {
                        continue;
                    }
                }
                
                if (loggerChannelId) {
                    let channel = clientInstance.channels.cache.get(loggerChannelId);
                    if (!channel) {
                        try {
                            channel = await clientInstance.channels.fetch(loggerChannelId);
                        } catch (fetchErr) {
                            continue;
                        }
                    }
                    if (channel) {
                        return channel;
                    }
                }
            } catch (error) {
                continue;
            }
        }
    } catch (error) {
    }
    return null;
}

async function hasAnyLoggerChannel() {
    if (logChannel) return true;
    if (!clientInstance) return false;
    const anyChannel = await findLoggerChannelForAnyGuild();
    return anyChannel !== null;
}

async function log(text, guildId = null) {
    const timestamp = formatTimestamp(Date.now(), true);
    const formattedText = `[${timestamp}] ${text}`;

    if (guildId && clientInstance) {
        try {
            let serverLoggerChannelId = null;
            
            try {
                const botConfig = getBotConfig();
                if (botConfig && botConfig.bot_type === 'selfbot' && botConfig.connect_to) {
                    serverLoggerChannelId = await getLoggerChannelFromOfficialBot(guildId, botConfig.connect_to);
                } else {
                    serverLoggerChannelId = await getLoggerChannel(guildId);
                }
            } catch (error) {
                if (error.message && !error.message.includes('not configured')) {
                    console.log(`⚠️  Logger error for guild ${guildId}: ${error.message}`);
                }
            }
            
            if (serverLoggerChannelId) {
                let serverLogChannel = clientInstance.channels.cache.get(serverLoggerChannelId);
                
                if (!serverLogChannel) {
                    try {
                        serverLogChannel = await clientInstance.channels.fetch(serverLoggerChannelId);
                    } catch (fetchErr) {
                    }
                }
                
                if (serverLogChannel) {
                    try {
                        await serverLogChannel.send(formattedText);
                        return;
                    } catch (err) {
                        if (err.code === 50001 || err.code === 50013) {
                            console.log(`⚠️  No permission to send logs to Discord channel ${serverLoggerChannelId}: ${err.message}`);
                        } else {
                            console.log(`⚠️  Failed to send log to Discord channel: ${err.message}`);
                        }
                        return;
                    }
                }
            }
        } catch (error) {
            if (error.message && !error.message.includes('not configured')) {
                console.log(`⚠️  Logger error for guild ${guildId}: ${error.message}`);
            }
        }
    }

    if (logChannel && hasPermission) {
        try {
            await logChannel.send(formattedText);
            return;
        } catch (err) {
            if (err.code === 50001 || err.code === 50013) {
                hasPermission = false;
            }
        }
    }

    if (!guildId && clientInstance) {
        const anyLoggerChannel = await findLoggerChannelForAnyGuild();
        if (anyLoggerChannel) {
            try {
                await anyLoggerChannel.send(formattedText);
                return;
            } catch (err) {
            }
        }
    }

    const hasLogger = await hasAnyLoggerChannel();
    if (!hasLogger) {
        console.log(formattedText);
    }
}

function init(client, channelId = null) {

    clientInstance = client;

    if (!channelId) {
        return;
    }

    logChannel = client.channels.cache.get(channelId);
    if (!logChannel) {
        hasPermission = false;
        return;
    }

    try {

        if (logChannel.guild && logChannel.permissionsFor && client.user) {
            const permissions = logChannel.permissionsFor(client.user);
            if (permissions && !permissions.has('SendMessages')) {
                hasPermission = false;
            }
        }
    } catch (permErr) {

        hasPermission = true;
    }
}

export default {
    init,
    log
};
