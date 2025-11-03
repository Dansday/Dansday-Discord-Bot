import { BOOSTER, getEmbedConfig } from "../../config.js";
import { EmbedBuilder } from "discord.js";
import logger from "../../logger.js";

function getRandomMessage() {
    const messages = BOOSTER.MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
}

async function thankBooster(member, client) {
    const boosterChannelId = await BOOSTER.getChannel(member.guild.id);
    const boosterChannel = client.channels.cache.get(boosterChannelId);
    if (!boosterChannel) {
        await logger.log(`❌ Booster channel not found: ${boosterChannelId}`);
        return;
    }

    try {
        const thankMessage = getRandomMessage().replace("{user}", `<@${member.user.id}>`);
        const embedConfig = await getEmbedConfig(member.guild.id);

        // Create booster thank you embed
        const boosterEmbed = new EmbedBuilder()
            .setColor(embedConfig.COLOR)
            .setTitle("💎 Thank You for Boosting!")
            .setDescription(thankMessage)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields([
                {
                    name: "🚀 Boost Level",
                    value: `Level ${member.guild.premiumTier}`,
                    inline: true
                },
                {
                    name: "✨ Total Boosts",
                    value: `${member.guild.premiumSubscriptionCount || 0}`,
                    inline: true
                },
                {
                    name: "📅 Boosted Since",
                    value: member.premiumSince ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>` : "Just now",
                    inline: false
                }
            ])
            .setFooter({ text: embedConfig.FOOTER })
            .setTimestamp();

        await boosterChannel.send({ embeds: [boosterEmbed] });
        await logger.log(`✅ Thanked booster ${member.user.tag} (${member.user.id}) in ${member.guild.name}`);
    } catch (err) {
        await logger.log(`❌ Failed to thank booster ${member.user.tag} (${member.user.id}): ${err.message}`);
    }
}

function init(client) {
    client.on("guildMemberUpdate", async (oldMember, newMember) => {
        // Check if member just started boosting
        const wasBoosting = oldMember.premiumSince !== null;
        const isBoosting = newMember.premiumSince !== null;

        // Only trigger if they just started boosting (wasn't boosting before, but is now)
        if (!wasBoosting && isBoosting) {
            await thankBooster(newMember, client);
        }
    });

    logger.log("💎 Booster component initialized");
}

export default { init };
