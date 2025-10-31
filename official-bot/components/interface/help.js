import { EMBED } from "../../../config.js";
import { hasPermission } from "../permissions.js";

// Handle help button
export async function handleHelpButton(interaction) {
    // Check permissions (Admin, Staff, and Member)
    if (!hasPermission(interaction.member, 'help')) {
        await interaction.reply({
            content: '❌ You don\'t have permission to view help.',
            flags: 64
        });
        return;
    }
    const helpEmbed = {
        color: EMBED.COLOR,
        title: "🤖 GO BLOX Bot Interface",
        description: "Welcome to the GO BLOX Bot interface! Use the buttons to interact with the bot:",
        fields: [
            {
                name: "📊 Status Button",
                value: "Shows bot status, uptime, and component information.",
                inline: false
            },
            {
                name: "❓ Help Button",
                value: "Shows this help information.",
                inline: false
            },
            {
                name: "⏸️ Pause/Resume Button",
                value: "Pauses or resumes the bot (Admin only).",
                inline: false
            },
            {
                name: "📤 Send Message Button",
                value: "Send custom embeds to any channel with title (required), description (required), image URL, color, footer, and role mentions. Step-by-step process: Select channel → Choose role (optional) → Fill embed details → Send.",
                inline: false
            },
            {
                name: "🎮 How to Use",
                value: "Simply click any button above to interact with the bot. All responses are private to you.",
                inline: false
            }
        ],
        footer: {
            text: "GO BLOX Bot System"
        },
        timestamp: new Date().toISOString()
    };

    await interaction.reply({
        embeds: [helpEmbed],
        flags: 64
    });
}
