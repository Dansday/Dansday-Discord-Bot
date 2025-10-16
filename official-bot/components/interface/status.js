import { EMBED } from "../../../config.js";
import logger from "../../../logger.js";

// Handle status button
export async function handleStatusButton(interaction) {
    const guild = interaction.guild;
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const statusEmbed = {
        color: EMBED.COLOR,
        title: "📊 Bot Status",
        fields: [
            {
                name: "🟢 Status",
                value: "🟢 Online",
                inline: true
            },
            {
                name: "⏰ Uptime",
                value: `${hours}h ${minutes}m ${seconds}s`,
                inline: false
            },
            {
                name: "👥 Total Members",
                value: `${guild.memberCount}`,
                inline: true
            },
            {
                name: "💎 Boosters",
                value: `${guild.premiumSubscriptionCount}`,
                inline: true
            }
        ],
        timestamp: new Date().toISOString()
    };

    await interaction.reply({
        embeds: [statusEmbed],
        flags: 64
    });

    await logger.log(`📊 Status button clicked by ${interaction.user.tag} (${interaction.user.id})`);
}
