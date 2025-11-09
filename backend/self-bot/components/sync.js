import db from '../../../database/database.js';
import logger from '../../logger.js';
import { getLoggerChannel } from '../../config.js';
import { separateChannelsAndCategories, mapCategoriesForSync, mapChannelsForSync } from '../../utils.js';

let client = null;
let botId = null;
let connectedOfficialBotId = null;
let loggerInitialized = false;

// Find bot in database by ID
async function findBotById(botId) {
    try {
        const bot = await db.getBot(botId);
        return bot;
    } catch (error) {
        logger.log(`❌ Error finding bot: ${error.message}`);
        return null;
    }
}

// Sync server info, channels, and categories for a guild
async function syncGuildData(guild) {
    try {
        if (!botId) {
            logger.log(`⚠️  Bot ID not set, skipping sync for guild: ${guild.name}`);
            return;
        }

        // Fetch complete guild data
        await guild.fetch();

        // Sync server info first (always sync this)
        const serverData = await db.upsertServer(botId, guild);

        if (!serverData) {
            logger.log(`⚠️  Failed to sync server info for ${guild.name}`);
            return;
        }

        const serverId = serverData.id;

        // Initialize logger with channel from this server if not already initialized
        if (!loggerInitialized && client) {
            try {
                const loggerChannelId = await getLoggerChannel(guild.id);
                if (loggerChannelId) {
                    logger.init(client, loggerChannelId);
                    loggerInitialized = true;
                    logger.log(`✅ Logger initialized with channel from ${guild.name}`);
                }
            } catch (error) {
                // Logger channel not configured for this server, continue
            }
        }

        // Sync channels and categories if available
        try {
            // Try to fetch channels (force refresh)
            try {
                await guild.channels.fetch();
            } catch (fetchError) {
                logger.log(`⚠️  Could not fetch channels for ${guild.name}: ${fetchError.message}`);
            }

            if (guild.channels.cache.size > 0) {
                // Separate channels and categories (excludes threads automatically)
                const { categories, channels } = separateChannelsAndCategories(guild.channels.cache);

                // Sync categories first
                const categoryMap = await db.syncCategories(serverId, mapCategoriesForSync(categories));

                // Sync channels (with category reference) - only text and news channels
                await db.syncChannels(serverId, mapChannelsForSync(channels), categoryMap);

                logger.log(`✅ Synced server: ${guild.name} (${guild.memberCount} members, ${categories.length} categories, ${channels.length} channels)`);
            } else {
                logger.log(`✅ Synced server info: ${guild.name} (${guild.memberCount} members)`);
            }
        } catch (error) {
            logger.log(`❌ Error syncing channels/categories for ${guild.name}: ${error.message}`);
            logger.log(`✅ Synced server info: ${guild.name} (${guild.memberCount} members)`);
        }
    } catch (error) {
        logger.log(`❌ Error syncing guild data for ${guild.name}: ${error.message}`);
    }
}

// Sync all guilds the bot is in (uses same syncGuildData function as events)
async function syncAllGuilds() {
    try {
        if (!client || !botId) {
            logger.log(`⚠️  Client or bot ID not set, skipping sync`);
            return;
        }

        const guilds = client.guilds.cache;
        logger.log(`🔄 Selfbot sync started: ${guilds.size} server(s)`);

        // Sync each guild individually using the same function as event listeners
        // This ensures consistency and uses the same code path
        let completed = 0;
        for (const [guildId, guild] of guilds) {
            // Use the same syncGuildData function that event listeners use
            await syncGuildData(guild);
            completed++;
        }
        
        logger.log(`✅ Selfbot sync completed: ${completed}/${guilds.size} server(s)`);
    } catch (error) {
        logger.log(`❌ Error syncing all guilds: ${error.message}`);
    }
}


// Update bot name and icon from Discord
async function updateBotInfo() {
    if (!botId || !client || !client.user) {
        return;
    }

    try {
        const avatarUrl = client.user.displayAvatarURL({ dynamic: true, size: 256 });
        // Use display name (globalName or displayName) if available, otherwise fall back to username
        const displayName = client.user.globalName || client.user.displayName || client.user.username;
        await db.updateBot(botId, {
            name: displayName,
            bot_icon: avatarUrl || null
        });
        logger.log(`✅ Updated selfbot name and icon from Discord: ${displayName}`);
    } catch (error) {
        logger.log(`⚠️  Failed to update bot info: ${error.message}`);
    }
}

async function init(discordClient, botIdFromEnv) {
    client = discordClient;

    // Use BOT_ID from environment (set by control panel)
    if (botIdFromEnv) {
        botId = botIdFromEnv;
        const bot = await findBotById(botId);
        if (bot) {
            logger.log(`✅ Found selfbot in database: ${bot.name} (${bot.bot_type})`);
            
            // Get connected official bot ID if this selfbot is connected to one
            if (bot.bot_type === 'selfbot' && bot.connect_to) {
                connectedOfficialBotId = bot.connect_to;
                const officialBot = await findBotById(connectedOfficialBotId);
                if (officialBot) {
                    logger.log(`🔗 Selfbot connected to official bot: ${officialBot.name}`);
                } else {
                    logger.log(`⚠️  Connected official bot not found: ${connectedOfficialBotId}`);
                }
            }

            // Update bot info immediately if client is already ready
            if (client.user) {
                await updateBotInfo();
            }
        } else {
            logger.log(`❌ Selfbot not found in database with ID: ${botId}`);
        }
    } else {
        logger.log(`⚠️  BOT_ID not set. Sync will be limited.`);
    }

    // Since sync.init() is called from within ready handler, client is already ready
    // Only sync on first startup (if no servers exist in database)
    setTimeout(async () => {
        if (botId) {
            // Check if this is the first startup by checking if any servers exist
            const existingServers = await db.getServersForBot(botId);
            const isFirstStartup = !existingServers || existingServers.length === 0;

            if (isFirstStartup) {
                logger.log('🔄 Starting initial guild data sync (first startup)...');
                await syncAllGuilds();
                logger.log('✅ Initial sync complete');
            } else {
                logger.log('⏭️  Skipping initial sync (not first startup). Sync will run on Discord events only.');
            }
        }
    }, 2000);

    // Sync when bot joins a new guild
    client.on('guildCreate', async (guild) => {
        logger.log(`🆕 Selfbot joined new guild: ${guild.name}`);
        await syncGuildData(guild);
    });

    // Don't sync on member add/remove - these events fire too frequently on large servers
    // Member count updates will be synced via periodic check (every 5 minutes)

    // Sync on server boost changes
    client.on('guildUpdate', async (oldGuild, newGuild) => {
        if (botId) {
            await syncGuildData(newGuild);
        }
    });

    // Sync on channel changes
    client.on('channelCreate', async (channel) => {
        if (channel.guild && botId) {
            await syncGuildData(channel.guild);
        }
    });

    client.on('channelUpdate', async (oldChannel, newChannel) => {
        if (newChannel.guild && botId) {
            await syncGuildData(newChannel.guild);
        }
    });

    client.on('channelDelete', async (channel) => {
        if (channel.guild && botId) {
            await syncGuildData(channel.guild);
        }
    });

    logger.log('🔄 Selfbot sync component initialized');
}

function stop() {
    // No intervals to clear - sync is now event-based only
}

export default {
    init,
    stop,
    syncGuildData,
    syncAllGuilds,
    updateBotInfo
};
