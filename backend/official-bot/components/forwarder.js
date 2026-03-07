import { FORWARDER, getEmbedConfig } from "../../config.js";
import logger from "../../logger.js";

function cleanMessageContent(text) {
    if (!text) return text;

    let cleaned = text.replace(/<:([^:]+):(\d+)>/g, '');

    cleaned = cleaned.replace(/@unknown-role/g, '');

    return cleaned;
}

export async function processMessageFromSelfBot(messageData, client) {

    const sourceChannelId = messageData.channel?.id;
    const sourceGuildId = messageData.guild?.id;

    if (!sourceChannelId || !sourceGuildId) {
        await logger.log(`❌ Source channel ID or guild ID not provided in message data`);
        return;
    }


    let forwarderConfig;
    try {
        forwarderConfig = await FORWARDER.getForwarderConfigBySourceChannel(sourceChannelId, sourceGuildId);
    } catch (err) {
        await logger.log(`❌ Error finding forwarder config for source channel ${sourceChannelId}: ${err.message}`);
        return;
    }

    if (!forwarderConfig) {
        await logger.log(`⚠️ No forwarder config found for channel ${sourceChannelId} in guild ${sourceGuildId}`);
        return;
    }

    const targetChannelId = forwarderConfig.target_channel_id;
    const targetGuildId = forwarderConfig.target_guild_id;
    const roles = forwarderConfig.roles;
    const onlyForwardWhenMentionsMember = forwarderConfig.only_forward_when_mentions_member === true;

    const targetChannel = client.channels.cache.get(targetChannelId);

    if (!targetChannel) {
        await logger.log(`❌ Target channel not found: ${targetChannelId}`);
        return;
    }

    let mentionedMainMembers = [];
    if (onlyForwardWhenMentionsMember) {
        const mentionedUserIds = messageData.mentioned_user_ids || [];
        if (mentionedUserIds.length === 0) {
            return;
        }
        const mainGuild = targetChannel.guild;
        if (!mainGuild?.members) {
            return;
        }
        const checkMember = (userId) =>
            Promise.resolve(mainGuild.members.cache.get(userId)).then(cached =>
                cached ?? mainGuild.members.fetch(userId).catch(() => null)
            );
        const resolved = await Promise.all(mentionedUserIds.map(checkMember));
        mentionedMainMembers = resolved.filter(m => m !== null);
        if (mentionedMainMembers.length === 0) {
            return;
        }
    }

    try {

        const embedConfig = await getEmbedConfig(targetGuildId);

        let embeds = [];

        const messageEmbed = {
            color: embedConfig.COLOR,
            title: `Message from ${messageData.channel.name}`,
            author: {
                name: messageData.author.displayName || `${messageData.author.username}#${messageData.author.discriminator}`,
                icon_url: messageData.author.avatar ?
                    `https://cdn.discordapp.com/avatars/${messageData.author.id}/${messageData.author.avatar}.png` :
                    `https://cdn.discordapp.com/embed/avatars/${parseInt(messageData.author.discriminator) % 5}.png`
            },
            timestamp: new Date(messageData.createdTimestamp).toISOString(),
            footer: {
                text: embedConfig.FOOTER
            }
        };

        const cleanContent = cleanMessageContent(messageData.content);
        if (cleanContent && cleanContent.trim()) {
            messageEmbed.description = cleanContent;
        }

        if (messageData.attachments && messageData.attachments.length > 0) {
            const firstAttachment = messageData.attachments[0];

            messageEmbed.image = {
                url: firstAttachment.url
            };

            if (messageData.attachments.length > 1) {
                messageEmbed.fields = messageEmbed.fields || [];
                messageEmbed.fields.push({
                    name: "Additional Attachments",
                    value: messageData.attachments.slice(1).map(att => `[${att.name}](${att.url})`).join('\n'),
                    inline: false
                });
            }
        }

        embeds.push(messageEmbed);

        if (messageData.embeds && messageData.embeds.length > 0) {

            messageData.embeds.forEach(embed => {

                const originalEmbed = { ...embed };

                if (originalEmbed.description) {
                    originalEmbed.description = cleanMessageContent(originalEmbed.description);
                }

                if (originalEmbed.title) {
                    originalEmbed.title = cleanMessageContent(originalEmbed.title);
                }

                if (originalEmbed.fields && originalEmbed.fields.length > 0) {
                    originalEmbed.fields = originalEmbed.fields.map(field => ({
                        ...field,
                        name: cleanMessageContent(field.name),
                        value: cleanMessageContent(field.value)
                    }));
                }

                embeds.push(originalEmbed);
            });
        }

        const contentParts = [];
        if (roles && Array.isArray(roles) && roles.length > 0) {
            contentParts.push(roles.map(role => `<@&${role.role_id}>`).join(' '));
        }
        if (mentionedMainMembers.length > 0) {
            contentParts.push(mentionedMainMembers.map(m => `<@${m.id}>`).join(' '));
        }
        const messageOptions = {
            embeds: embeds
        };
        if (contentParts.length > 0) {
            messageOptions.content = contentParts.join(' ');
        }

        await targetChannel.send(messageOptions);

        await logger.log(`✅ Forwarded ${messageData.id} from source channel ${sourceChannelId}`);
    } catch (err) {
        await logger.log(`❌ Failed to forward ${messageData.id}: ${err.message}`);
        throw err;
    }
}


function init() {
    logger.log("📡 Using webhook communication");
}

export default { init };
