import { Client, GatewayIntentBits } from "discord.js";
import { getBotToken, initializeConfig } from "../config.js";
import logger from "../logger.js";

// Initialize config from database (async)
let BOT_TOKEN;
(async () => {
    await initializeConfig();
    // Use BOT_TOKEN from environment if provided (for control panel), otherwise use database config
    BOT_TOKEN = process.env.BOT_TOKEN || getBotToken('official');
})().catch(err => {
    console.error('Failed to initialize config:', err);
    process.exit(1);
});
import forwarder from "./components/forwarder.js";
import welcomer from "./components/welcomer.js";
import booster from "./components/booster.js";
import moderation from "./components/moderation.js";
import webhook from "./components/webhook.js";
import commands from "./components/commands.js";
import interfaceComponent from "./components/interface.js";
import customSupporterRole from "./components/interface/customsupporterrole.js";
import afk from "./components/interface/afk.js";
import sync from "./components/sync.js";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.on("clientReady", async () => {
    console.log(`Official bot logged in as ${client.user.tag}`);

    // Ensure config is loaded
    if (!BOT_TOKEN) {
        await initializeConfig();
        BOT_TOKEN = process.env.BOT_TOKEN || getBotToken('official');
    }
    
    if (!BOT_TOKEN) {
        throw new Error('Bot token not available. Cannot proceed.');
    }

    // Deploy slash commands (don't clear first on startup)
    await commands.deployCommands(false);

    logger.init(client);
    forwarder.init();
    welcomer.init(client);
    booster.init(client);
    moderation.init(client);
    commands.init(client);
    interfaceComponent.init(client);
    customSupporterRole.init(client);
    afk.init(client);

    // Initialize sync BEFORE other components to ensure bot info syncs
    await sync.init(client, BOT_TOKEN); // Sync channels and roles to database

    // Start webhook server
    webhook.startWebhookServer(client);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down official bot...");
    sync.stop();
    webhook.stopWebhookServer();
    client.destroy();
    process.exit(0);
});

// Login with token (initialize config first if needed)
(async () => {
    if (!BOT_TOKEN) {
        await initializeConfig();
        BOT_TOKEN = process.env.BOT_TOKEN || getBotToken('official');
    }
    
    if (!BOT_TOKEN) {
        throw new Error('Bot token not available. Cannot login.');
    }
    
    await client.login(BOT_TOKEN);
})().catch(err => {
    console.error('Failed to login:', err);
    process.exit(1);
});
