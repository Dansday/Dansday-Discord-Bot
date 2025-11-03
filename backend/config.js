// Backend Configuration for both Self-Bot and Official Bot
import db from '../database/supabase.js';

// Bot configuration loaded from database
let botConfig = null;

// Load bot configuration from database
async function loadBotConfig() {
    // Get BOT_ID from environment (set by control panel)
    const botId = process.env.BOT_ID;

    if (!botId) {
        throw new Error('BOT_ID not set in environment. Bot cannot start without database configuration.');
    }

    const bot = await db.getBot(botId);

    if (!bot) {
        throw new Error(`Bot not found in database with ID: ${botId}`);
    }

    // For selfbots, get port, secret_key, and is_testing from connected official bot
    let port = bot.port;
    let secret_key = bot.secret_key;
    let is_testing = bot.is_testing || false;
    
    if (bot.bot_type === 'selfbot' && bot.connect_to) {
        const connectedBot = await db.getBot(bot.connect_to);
        if (connectedBot) {
            port = connectedBot.port;
            secret_key = connectedBot.secret_key;
            is_testing = connectedBot.is_testing || false;
        } else {
            throw new Error(`Connected bot not found for selfbot ${botId}. Connected bot ID: ${bot.connect_to}`);
        }
    }

    botConfig = {
        id: bot.id,
        token: bot.token,
        application_id: bot.application_id,
        bot_type: bot.bot_type,
        port: port,
        secret_key: secret_key,
        is_testing: is_testing,
        connect_to: bot.connect_to
    };

    return botConfig;
}

// Initialize config - load from database if available
export async function initializeConfig() {
    await loadBotConfig();
}

// Get current bot config
export function getBotConfig() {
    return botConfig;
}

// Environment Configuration - uses database is_testing field
export const ENV = {
    get PRODUCTION() {
        if (!botConfig) {
            throw new Error('Bot config not loaded. Call initializeConfig() first.');
        }
        return !botConfig.is_testing;
    }
};

// Get token from database
export function getBotToken(botType) {
    if (!botConfig) {
        throw new Error('Bot config not loaded. Call initializeConfig() first.');
    }
    if (botConfig.bot_type !== botType) {
        throw new Error(`Bot type mismatch. Expected ${botType}, got ${botConfig.bot_type}`);
    }
    if (!botConfig.token) {
        throw new Error('Bot token not found in database configuration.');
    }
    return botConfig.token;
}

// Get application ID from database
export function getApplicationId() {
    if (!botConfig) {
        throw new Error('Bot config not loaded. Call initializeConfig() first.');
    }
    if (!botConfig.application_id) {
        throw new Error('Application ID not found in database configuration.');
    }
    return botConfig.application_id;
}

// Helper function to get server by Discord server ID
async function getServerByDiscordId(discordServerId) {
    if (!botConfig) {
        throw new Error('Bot config not loaded. Call initializeConfig() first.');
    }
    const server = await db.getServerByDiscordId(botConfig.id, discordServerId);
    if (!server) {
        throw new Error(`Server not found for Discord ID: ${discordServerId}`);
    }
    return server;
}

// Get main channel for a specific server (from server settings)
export async function getMainChannel(guildId) {
    if (!botConfig) {
        throw new Error('Bot config not loaded. Call initializeConfig() first.');
    }
    if (!guildId) {
        throw new Error('Guild ID is required to get main channel.');
    }

    const server = await getServerByDiscordId(guildId);
    const settings = await db.getServerSettings(server.id, 'main_config');
    
    if (!settings || !settings.settings) {
        throw new Error(`Server settings not found for guild ${guildId}`);
    }

    const channelId = botConfig.is_testing 
        ? settings.settings.test_channel 
        : settings.settings.production_channel;
    
    if (!channelId) {
        throw new Error(`Channel not configured for ${botConfig.is_testing ? 'testing' : 'production'} mode in guild ${guildId}`);
    }

    return channelId;
}

// Permissions Configuration
export const PERMISSIONS = {
    // Role IDs
    ADMIN_ROLE: "1364375813356650596",      // Can use all commands and interfaces
    STAFF_ROLE: "1376631063035777054",     // Can use all interfaces except pause
    SUPPORTER_ROLE: "1369054578754060288",   // Can create custom roles
    MEMBER_ROLE: "1364380027310968905",     // Can only use status and help
};

// Communication Configuration - loads from database
export const COMMUNICATION = {
    // Webhook URL for self-bot to send data to official bot (local webhook server)
    get WEBHOOK_URL() {
        if (!botConfig) {
            throw new Error('Bot config not loaded. Call initializeConfig() first.');
        }
        if (!botConfig.port) {
            throw new Error('Port not found in database configuration.');
        }
        return `http://localhost:${botConfig.port}`;
    },
    // Secret key for webhook authentication - loads from database
    get SECRET_KEY() {
        if (!botConfig) {
            throw new Error('Bot config not loaded. Call initializeConfig() first.');
        }
        if (!botConfig.secret_key) {
            throw new Error('Secret key not found in database configuration.');
        }
        return botConfig.secret_key;
    },
    // Port for webhook server - loads from database
    get PORT() {
        if (!botConfig) {
            throw new Error('Bot config not loaded. Call initializeConfig() first.');
        }
        if (!botConfig.port) {
            throw new Error('Port not found in database configuration.');
        }
        return botConfig.port;
    }
};

// Get embed configuration for a specific server (from server settings)
export async function getEmbedConfig(guildId) {
    if (!botConfig) {
        throw new Error('Bot config not loaded. Call initializeConfig() first.');
    }
    if (!guildId) {
        throw new Error('Guild ID is required to get embed config.');
    }

    const server = await getServerByDiscordId(guildId);
    const settings = await db.getServerSettings(server.id, 'main_config');
    
    if (!settings || !settings.settings) {
        throw new Error(`Server settings not found for guild ${guildId}`);
    }

    const config = settings.settings;
    
    if (!config.embed_color) {
        throw new Error(`Embed color not configured for guild ${guildId}`);
    }

    // Convert hex color to integer
    const hex = config.embed_color.replace('#', '');
    const color = parseInt(hex, 16);
    
    if (!config.embed_footer) {
        throw new Error(`Embed footer not configured for guild ${guildId}`);
    }

    return {
        COLOR: color,
        FOOTER: config.embed_footer
    };
}

// Get logger channel for a specific server (from server settings)
export async function getLoggerChannel(guildId) {
    if (!botConfig) {
        throw new Error('Bot config not loaded. Call initializeConfig() first.');
    }
    if (!guildId) {
        throw new Error('Guild ID is required to get logger channel.');
    }

    const server = await getServerByDiscordId(guildId);
    const settings = await db.getServerSettings(server.id, 'main_config');
    
    if (!settings || !settings.settings) {
        throw new Error(`Server settings not found for guild ${guildId}`);
    }

    if (!settings.settings.logger_channel) {
        throw new Error(`Logger channel not configured for guild ${guildId}`);
    }

    return settings.settings.logger_channel;
}

// Welcomer Configuration
export const WELCOMER = {
    async getChannel(guildId) {
        return await getMainChannel(guildId);
    },
    MESSAGES: [
        "Selamat datang, {user}! Semoga betah di sini ya 😄",
        "Halo {user}, senang banget kamu join! Jangan sungkan buat ngobrol 👋",
        "Yoo {user}! Selamat datang di server, semoga nyaman di sini 🚀",
        "Hai {user}, jangan lupa kenalan sama yang lain ya! 🎉",
        "Wah, ada {user} nih! Welcome welcome 🥳",
        "{user} baru aja masuk ke server, kasih sambutan dong! 🙌",
        "Selamat datang di komunitas kita, {user}! Ayo seru-seruan bareng 🔥",
        "{user}, akhirnya kamu datang juga! Yuk ngobrol-ngobrol 🗨️",
        "Haii {user}! Jangan lupa baca rules dan langsung nimbrung 😎",
        "Server jadi makin rame nih gara-gara {user} join 🤩"
    ]
};

// Booster Configuration
export const BOOSTER = {
    async getChannel(guildId) {
        return await getMainChannel(guildId);
    },
    MESSAGES: [
        "Terima kasih banyak, {user}! Server boost kamu sangat berarti untuk kami! 💎",
        "Wah, {user} baru boost server nih! Terima kasih ya, kalian luar biasa! 🚀",
        "Makasih banget {user} udah boost server! Komunitas kita jadi lebih keren nih! ✨",
        "Yoo {user}! Terima kasih untuk boost-nya, kalian amazing! 💫",
        "{user} baru boost server, thank you so much! 🙏",
        "Terima kasih {user} udah support server dengan boost! Kalian the best! 🔥",
        "{user} boost server nih! Thank you untuk dukungannya! 🌟",
        "Keren banget {user}! Terima kasih udah boost server, sangat membantu! 💪",
        "Wah {user} boost server! Makasih banyak, kalian spesial! 🎉",
        "{user} baru boost nih! Terima kasih, kalian membuat server ini lebih baik! ❤️"
    ]
};

// Custom Supporter Role Configuration
export const CUSTOM_SUPPORTER_ROLE = {
    // Role position constraints
    ROLE_BELOW: "1433928533000061028",       // Custom role must be below this role
    ROLE_ABOVE: "1433928639010836520"      // Custom role must be above this role
};

// Activity Tracker Configuration
export const ACTIVITY_TRACKER = {
    // Categories to search for inactive members (channel categories)
    ALLOWED_CATEGORIES: [
        "1375017296539553852",
        "1375004282809749564"
    ],
    // Days of inactivity threshold (90 days = 3 months)
    INACTIVITY_DAYS: 90
};

// Feedback Configuration
export const FEEDBACK = {
    // Channel ID for feedback submissions
    CHANNEL_ID: "1409858556164964432"
};

// Forwarder Configuration
export const FORWARDER = {
    // Production source channels (all channels)
    PRODUCTION_SOURCE_CHANNELS: {
        "834333621405220884": { group: "blair", type: "announcements" }, //announcements
        "834333647796174869": { group: "blair", type: "announcements" }, //development-announcements
        "835423033408618496": { group: "blair", type: "changelogs" }, //updates
        "834333659338244126": { group: "blair", type: "leaks" }, //sneak-peeks
        "856769231142780938": { group: "blair", type: "socialupdates" }, //social-announcements
        "1352059967896555631": { group: "evade", type: "announcements" }, //announcements
        "1352060296583184525": { group: "evade", type: "changelogs" }, //change-log
        "996516953206300693": { group: "evade", type: "leaks" }, //leaks
        "1209439201255362620": { group: "danskaraoke", type: "announcements" }, //announcements
        "1229797155607412806": { group: "danskaraoke", type: "leaks" }, //sneak-peeks
        "1242573606886834176": { group: "danskaraoke", type: "songupdates" }, //song-updates
        "1217763101135605791": { group: "danskaraoke", type: "songupdates" }, //song-logs
        "1332897953743900762": { group: "deadrails", type: "announcements" }, //announcements
        "1336200820366114908": { group: "deadrails", type: "changelogs" }, //updates
        "1339330781612609546": { group: "deadrails", type: "leaks" }, //sneak-peeks
        "1341590625212039209": { group: "dig", type: "announcements" }, //announcements
        "1341590626520666123": { group: "dig", type: "announcements" }, //sub-announcements
        "1341590627774759013": { group: "dig", type: "changelogs" }, //updates
        "1341590629171597396": { group: "dig", type: "leaks" }, //leaks
        "1254504608676581376": { group: "fisch", type: "announcements" }, //announcements
        "1254504632114352239": { group: "fisch", type: "changelogs" }, //updates
        "1303085564102312088": { group: "fisch", type: "leaks" }, //leaks
        "1392138180647714846": { group: "growagarden", type: "announcements" }, //GaG Trading | announcements
        "1373732475582546051": { group: "growagarden", type: "announcements" }, //Jandel Fan | announcements
        "1378015808428445777": { group: "growagarden", type: "announcements" }, //Ember Support | announcements
        "1378020774610206860": { group: "growagarden", type: "changelogs" }, //Ember Support | change-log
        "1398539523046117468": { group: "growagarden", type: "leaks" }, //Jandel Fan | leaks
        "1427507516614381588": { group: "growagarden", type: "stocks" }, //Jandel Fan | stock
        "1408932641859829852": { group: "growagarden", type: "weather" }, //Jandel Fan | weather
        "1408933312596279377": { group: "growagarden", type: "merchants" }, //Jandel Fan | merchants
        "1394790732300161195": { group: "growagarden", type: "adminabuse" }, //Jandel Fan | admin-abuse
    },
    // Test source channels (limited for testing)
    TEST_SOURCE_CHANNELS: {
        "1428373619490160650": { group: "botaccess", type: "receivemessage" }, //for testing purposes
    },
    // Get source channels based on environment
    get SOURCE_CHANNELS() {
        return ENV.PRODUCTION ? this.PRODUCTION_SOURCE_CHANNELS : this.TEST_SOURCE_CHANNELS;
    },
    TARGET_CHANNELS: {
        "blair": {
            announcements: "1405133585555521556",
            changelogs: "1377053187131048056",
            leaks: "1405127044785897583",
            socialupdates: "1405128520459616337"
        },
        "evade": {
            announcements: "1405142615225274389",
            changelogs: "1405142642425073694",
            leaks: "1405142666546774108"
        },
        "danskaraoke": {
            announcements: "1383799987753844880",
            leaks: "1405129772538794095",
            songupdates: "1383804379546648596"
        },
        "deadrails": {
            announcements: "1405134978815234170",
            changelogs: "1376960664178000003",
            leaks: "1405130668148654140"
        },
        "dig": {
            announcements: "1405135451920007218",
            changelogs: "1396357493139181670",
            leaks: "1405131710684860516"
        },
        "fisch": {
            announcements: "1405135718904496168",
            changelogs: "1376159931442532463",
            leaks: "1405132325284483153"
        },
        "growagarden": {
            announcements: "1405136401304916009",
            changelogs: "1383561457832038501",
            leaks: "1405138081190903819",
            stocks: "1383553496409837728",
            weather: "1383555288509972490",
            merchants: "1383555456722800832",
            adminabuse: "1396359317635993665",
        },

        //for testing purposes
        "botaccess": {
            receivemessage: "1428373710838169743"
        }
    },
    ROLE_MENTIONS: {
        "blair": "<@&1377053308937834547>",
        "evade": "<@&1405142958361153638>",
        "danskaraoke": "<@&1383800439241179240>",
        "deadrails": "<@&1377005192792248350>",
        "dig": "<@&1396355600690184212>",
        "fisch": "<@&1377005118599467259>",
        "growagarden": "<@&1377005009304158421>",
    },
    EXCLUDED_USERS: [
        "678344927997853742",
        "628400349979344919"
    ]
};
