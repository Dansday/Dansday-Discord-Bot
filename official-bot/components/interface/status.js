import { EMBED } from "../../../config.js";
import { hasPermission } from "../permissions.js";

// Handle status button
export async function handleStatusButton(interaction) {
    // Check permissions (Admin, Staff, and Member)
    if (!hasPermission(interaction.member, 'status')) {
        await interaction.reply({
            content: '❌ You don\'t have permission to view status.',
            flags: 64
        });
        return;
    }
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
}
