import { ModalBuilder, TextInputBuilder, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType } from 'discord.js';
import { EMBED } from "../../../config.js";
import logger from "../../../logger.js";

// Handle send message button - shows channel selector first
export async function handleSendMessageButton(interaction, client) {
    try {
        // This is a staff-only feature, no additional permission checks needed

        // Create channel selector
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId('send_message_channel_select')
            .setPlaceholder('Select a channel to send the message to...')
            .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
            .setMinValues(1)
            .setMaxValues(1);

        const selectRow = new ActionRowBuilder().addComponents(channelSelect);

        await interaction.reply({
            content: '📤 **Send Custom Message**\n\nPlease select the channel where you want to send the message:',
            components: [selectRow],
            ephemeral: true
        });

        await logger.log(`📤 Send message channel selector opened by ${interaction.user.tag} (${interaction.user.id})`);

    } catch (error) {
        await interaction.reply({
            content: `❌ Failed to open send message form: ${error.message}`,
            ephemeral: true
        });
        await logger.log(`❌ Send message error: ${error.message}`);
    }
}

// Handle channel selection - shows modal form
export async function handleChannelSelection(interaction, client) {
    try {
        const selectedChannel = interaction.values[0];

        // Create modal for custom embed configuration
        const modal = new ModalBuilder()
            .setCustomId(`send_message_modal_${selectedChannel}`)
            .setTitle(`📤 Send Message to #${interaction.guild.channels.cache.get(selectedChannel)?.name || 'Unknown'}`);

        // Title input
        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setStyle(1) // Short
            .setPlaceholder('Enter the embed title...')
            .setRequired(false)
            .setMaxLength(256);

        // Description input
        const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setStyle(2) // Paragraph
            .setPlaceholder('Enter the embed description...')
            .setRequired(false);

        // Image URL input
        const imageInput = new TextInputBuilder()
            .setCustomId('embed_image')
            .setLabel('Image URL (optional)')
            .setStyle(1) // Short
            .setPlaceholder('https://example.com/image.png')
            .setRequired(false);

        // Color input
        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Embed Color (hex code)')
            .setStyle(1) // Short
            .setPlaceholder('Leave empty for default (FF0000)')
            .setRequired(false)
            .setMaxLength(7);

        // Add inputs to modal (max 5 components allowed)
        const titleRow = new ActionRowBuilder().addComponents(titleInput);
        const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
        const imageRow = new ActionRowBuilder().addComponents(imageInput);
        const colorRow = new ActionRowBuilder().addComponents(colorInput);

        modal.addComponents(titleRow, descriptionRow, imageRow, colorRow);

        // Show the modal
        await interaction.showModal(modal);

        await logger.log(`📤 Send message modal opened for channel ${selectedChannel} by ${interaction.user.tag} (${interaction.user.id})`);

    } catch (error) {
        await interaction.reply({
            content: `❌ Failed to open message form: ${error.message}`,
            ephemeral: true
        });
        await logger.log(`❌ Channel selection error: ${error.message}`);
    }
}

// Handle modal submission
export async function handleSendMessageModal(interaction, client) {
    try {
        // This is a staff-only feature, no additional permission checks needed

        // Extract channel ID from modal customId
        const channelId = interaction.customId.replace('send_message_modal_', '');

        // Get form data
        const title = interaction.fields.getTextInputValue('embed_title') || null;
        const description = interaction.fields.getTextInputValue('embed_description') || null;
        const imageUrl = interaction.fields.getTextInputValue('embed_image') || null;
        const colorInput = interaction.fields.getTextInputValue('embed_color') || null;

        // Get the target channel
        const targetChannel = await client.channels.fetch(channelId).catch(() => null);
        if (!targetChannel) {
            await interaction.reply({
                content: '❌ Channel not found. Please try again.',
                ephemeral: true
            });
            return;
        }

        // Check if it's a text-based channel
        if (!targetChannel.isTextBased()) {
            await interaction.reply({
                content: '❌ The specified channel is not a text channel.',
                ephemeral: true
            });
            return;
        }

        // Validate that at least title or description is provided
        if (!title && !description) {
            await interaction.reply({
                content: '❌ Please provide at least a title or description for the embed.',
                ephemeral: true
            });
            return;
        }

        // Parse color - use config default if not provided
        let embedColor = EMBED.COLOR; // Use your default embed color from config
        if (colorInput) {
            // Remove # if present and convert to number
            const cleanColor = colorInput.replace('#', '');
            if (/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
                embedColor = parseInt(cleanColor, 16);
            } else if (colorInput.startsWith('0x') && /^0x[0-9A-Fa-f]{6}$/.test(colorInput)) {
                embedColor = parseInt(colorInput, 16);
            } else {
                await interaction.reply({
                    content: '❌ Invalid color format. Please use hex format like #FF0000 or 0xFF0000.',
                    ephemeral: true
                });
                return;
            }
        }

        // Validate image URL if provided
        if (imageUrl && !isValidUrl(imageUrl)) {
            await interaction.reply({
                content: '❌ Invalid image URL format.',
                ephemeral: true
            });
            return;
        }

        // Create embed with sender info in footer
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTimestamp()
            .setFooter({ 
                text: `Message sent by ${interaction.member.displayName || interaction.user.displayName || interaction.user.username}` 
            });

        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (imageUrl) embed.setImage(imageUrl);

        // Send the embed to the target channel
        await targetChannel.send({ embeds: [embed] });

        // Reply to the user
        await interaction.reply({
            content: `✅ Custom message sent successfully to ${targetChannel}!`,
            ephemeral: true
        });

        await logger.log(`📤 Custom message sent by ${interaction.user.tag} (${interaction.user.id}) to ${targetChannel.name} (${targetChannel.id})`);

    } catch (error) {
        await interaction.reply({
            content: `❌ Failed to send message: ${error.message}`,
            ephemeral: true
        });
        await logger.log(`❌ Send message error: ${error.message}`);
    }
}

// Helper function to validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}
