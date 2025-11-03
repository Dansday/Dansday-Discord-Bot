import { WELCOMER, getEmbedConfig } from "../../config.js";
import { EmbedBuilder } from "discord.js";
import logger from "../../logger.js";

function getRandomMessage() {
    const messages = WELCOMER.MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
}

async function welcomeUser(member, client) {
    const welcomeChannelId = await WELCOMER.getChannel(member.guild.id);
    const welcomeChannel = client.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) {
        await logger.log(`❌ Welcome channel not found: ${welcomeChannelId}`);
        return;
    }

    try {
        // Fetch member to ensure we have full data
        try {
            await member.fetch();
        } catch (err) {
            await logger.log(`⚠️ Could not fetch member ${member.user.tag}: ${err.message}`);
        }

        const welcomeMessage = getRandomMessage().replace("{user}", `<@${member.user.id}>`);
        const embedConfig = await getEmbedConfig(member.guild.id);

        // Create simple welcome embed
        const welcomeEmbed = new EmbedBuilder()
            .setColor(embedConfig.COLOR)
            .setTitle("🎉 Welcome to the Server!")
            .setDescription(welcomeMessage)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields([
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
            ])
            .setFooter({ text: embedConfig.FOOTER })
            .setTimestamp();

        await welcomeChannel.send({ embeds: [welcomeEmbed] });
        await logger.log(`✅ Welcomed ${member.user.tag} (${member.user.id}) in ${member.guild.name}`);
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
