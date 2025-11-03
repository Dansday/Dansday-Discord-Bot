import { Client } from "discord.js-selfbot-v13";
import { getBotToken, initializeConfig } from "../config.js";
import logger from "../logger.js";
import forwarder from "./components/forwarder.js";
import sync from "./components/sync.js";

// Initialize config from database (async)
let BOT_TOKEN;
(async () => {
    await initializeConfig();
    // Use BOT_TOKEN from environment if provided (for control panel), otherwise use database config
    BOT_TOKEN = process.env.BOT_TOKEN || getBotToken('selfbot');
})().catch(err => {
    console.error('Failed to initialize config:', err);
    process.exit(1);
});
const BOT_ID = process.env.BOT_ID;

const client = new Client();

client.on("ready", async () => {
    console.log(`Self-bot logged in as ${client.user.tag}`);
    
    // Ensure config is loaded
    if (!BOT_TOKEN) {
        await initializeConfig();
        BOT_TOKEN = process.env.BOT_TOKEN || getBotToken('selfbot');
    }
    
    if (!BOT_TOKEN) {
        throw new Error('Bot token not available. Cannot proceed.');
    }
    
    // Initialize sync component to sync servers
    await sync.init(client, BOT_ID);
    
    logger.init(client);
    forwarder.init(client);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down self-bot...");
    sync.stop();
    client.destroy();
    process.exit(0);
});

// Login with token (initialize config first if needed)
(async () => {
    if (!BOT_TOKEN) {
        await initializeConfig();
        BOT_TOKEN = process.env.BOT_TOKEN || getBotToken('selfbot');
    }
    
    if (!BOT_TOKEN) {
        throw new Error('Bot token not available. Cannot login.');
    }
    
    await client.login(BOT_TOKEN);
})().catch(err => {
    console.error('Failed to login:', err);
    process.exit(1);
});
