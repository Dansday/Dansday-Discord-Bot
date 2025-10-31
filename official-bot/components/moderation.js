import { EmbedBuilder } from "discord.js";
import { MAIN_CHANNEL, EMBED } from "../../config.js";
import logger from "../../logger.js";

async function sendModerationLog(client, embedData) {
    const channel = client.channels.cache.get(MAIN_CHANNEL);
    if (!channel) {
        await logger.log(`❌ Main channel not found: ${MAIN_CHANNEL}`);
        return;
    }

    try {
        const embed = new EmbedBuilder()
            .setColor(EMBED.COLOR)
            .setTitle(embedData.title)
            .setDescription(embedData.description)
            .setTimestamp()
            .setFooter({ text: embedData.guildName || "Moderation Log" });

        if (embedData.thumbnail) {
            embed.setThumbnail(embedData.thumbnail);
        }

        if (embedData.fields && embedData.fields.length > 0) {
            embed.addFields(embedData.fields);
        }

        await channel.send({ embeds: [embed] });
        await logger.log(`✅ Sent moderation log: ${embedData.title} for ${embedData.userTag || "unknown"}`);
    } catch (err) {
        await logger.log(`❌ Failed to send moderation log: ${err.message}`);
    }
}

// Get audit log entry for moderation actions
async function getAuditLogEntry(guild, action, targetId) {
    try {
        const auditLogs = await guild.fetchAuditLogs({
            limit: 1,
            type: action
        });

        const entry = auditLogs.entries.first();
        if (entry && entry.target.id === targetId) {
            return entry;
        }
        return null;
    } catch (err) {
        await logger.log(`⚠️ Could not fetch audit log for ${action}: ${err.message}`);
        return null;
    }
}

function init(client) {
    // Track bans
    client.on("guildBanAdd", async (ban) => {
        try {
            const { guild, user } = ban;
            const auditEntry = await getAuditLogEntry(guild, 22, user.id); // 22 = MEMBER_BAN_ADD

            const moderator = auditEntry?.executor || null;
            const reason = ban.reason || auditEntry?.reason || "No reason provided";

            await sendModerationLog(client, {
                title: "🔨 Member Banned",
                description: `<@${user.id}> has been banned from the server.`,
                thumbnail: user.displayAvatarURL({ dynamic: true, size: 256 }),
                guildName: guild.name,
                userTag: user.tag,
                fields: [
                    {
                        name: "👤 User",
                        value: user.tag,
                        inline: true
                    },
                    {
                        name: "🛡️ Moderator",
                        value: moderator ? moderator.tag : "Unknown",
                        inline: true
                    },
                    {
                        name: "📝 Reason",
                        value: reason.length > 1024 ? reason.substring(0, 1021) + "..." : reason,
                        inline: false
                    }
                ]
            });
        } catch (err) {
            await logger.log(`❌ Error handling ban: ${err.message}`);
        }
    });

    // Track unbans
    client.on("guildBanRemove", async (ban) => {
        try {
            const { guild, user } = ban;
            const auditEntry = await getAuditLogEntry(guild, 23, user.id); // 23 = MEMBER_BAN_REMOVE

            const moderator = auditEntry?.executor || null;

            await sendModerationLog(client, {
                title: "✅ Member Unbanned",
                description: `<@${user.id}> has been unbanned from the server.`,
                thumbnail: user.displayAvatarURL({ dynamic: true, size: 256 }),
                guildName: guild.name,
                userTag: user.tag,
                fields: [
                    {
                        name: "👤 User",
                        value: user.tag,
                        inline: true
                    },
                    {
                        name: "🛡️ Moderator",
                        value: moderator ? moderator.tag : "Unknown",
                        inline: true
                    }
                ]
            });
        } catch (err) {
            await logger.log(`❌ Error handling unban: ${err.message}`);
        }
    });

    // Track kicks (member removed but not banned)
    client.on("guildMemberRemove", async (member) => {
        try {
            // Check if it was a ban (ban event fires before remove, so we check audit logs)
            const banEntry = await getAuditLogEntry(member.guild, 22, member.user.id); // 22 = MEMBER_BAN_ADD

            // If there's a recent ban entry (within last 5 seconds), it's a ban, not a kick
            if (banEntry && Date.now() - banEntry.createdTimestamp < 5000) {
                return; // Ban event will handle this
            }

            // Check for kick in audit logs
            const kickEntry = await getAuditLogEntry(member.guild, 20, member.user.id); // 20 = MEMBER_KICK

            // Only log if it's a kick (has kick audit entry) or if we can't determine (assume kick)
            const moderator = kickEntry?.executor || null;
            const reason = kickEntry?.reason || "No reason provided";

            await sendModerationLog(client, {
                title: "👢 Member Kicked",
                description: `<@${member.user.id}> has been kicked from the server.`,
                thumbnail: member.user.displayAvatarURL({ dynamic: true, size: 256 }),
                guildName: member.guild.name,
                userTag: member.user.tag,
                fields: [
                    {
                        name: "👤 User",
                        value: member.user.tag,
                        inline: true
                    },
                    {
                        name: "🛡️ Moderator",
                        value: moderator ? moderator.tag : "Unknown",
                        inline: true
                    },
                    {
                        name: "📝 Reason",
                        value: reason.length > 1024 ? reason.substring(0, 1021) + "..." : reason,
                        inline: false
                    },
                    {
                        name: "📅 Member Since",
                        value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "Unknown",
                        inline: false
                    }
                ]
            });
        } catch (err) {
            await logger.log(`❌ Error handling member remove: ${err.message}`);
        }
    });

    logger.log("🛡️ Moderation component initialized - Tracking bans and kicks");
}

export default { init };
