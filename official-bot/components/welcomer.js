import { WELCOMER, EMBED } from "../../config.js";
import logger from "../../logger.js";

function getRandomMessage() {
    const messages = WELCOMER.MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
}

async function welcomeUser(member, client) {
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
        // Check if user might be returning (account age vs join date)
        // If account is much older than their join date, they might be returning
        const isReturningMember = member.user.createdTimestamp < Date.now() - (7 * 24 * 60 * 60 * 1000); // Account older than 7 days

        // Fetch member to ensure we have full data
        try {
            await member.fetch();
        } catch (err) {
            await logger.log(`⚠️ Could not fetch member ${member.user.tag}: ${err.message}`);
        }

        const welcomeMessage = getRandomMessage().replace("{user}", `<@${member.user.id}>`);

        // Adjust title for returning members
        const title = isReturningMember ? "🎉 Welcome Back to the Server!" : "🎉 Welcome to the Server!";

        // Create simple welcome embed
        const welcomeEmbed = {
            color: EMBED.COLOR,
            title: title,
            description: welcomeMessage,
            thumbnail: {
                url: member.user.displayAvatarURL({ dynamic: true, size: 256 })
            },
            fields: [
                {
                    name: "📅 Account Created",
                    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                    inline: true
                },
                {
                    name: "👥 Member Count",
                    value: `Member #${member.guild.memberCount}`,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        await welcomeChannel.send({ embeds: [welcomeEmbed] });
        await logger.log(`✅ Welcomed ${member.user.tag} (${member.user.id}) in ${member.guild.name} - Returning: ${isReturningMember}`);
    } catch (err) {
        await logger.log(`❌ Failed to welcome ${member.user.tag} (${member.user.id}): ${err.message}`);
    }
}

function init(client) {
    client.on("guildMemberAdd", async (member) => {
        // Log that member joined event was received
        await logger.log(`👤 Member join event: ${member.user.tag} (${member.user.id}) joined ${member.guild.name}`);
        await welcomeUser(member, client);
    });

    logger.log("👋 Welcomer component initialized");
}

export default { init };
