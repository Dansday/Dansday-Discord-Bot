import { EmbedBuilder } from "discord.js";
import { getEmbedConfig, getBotConfig } from "../../../config.js";
import { hasPermission } from "../permissions.js";
import db from "../../../../database/database.js";
import logger from "../../../logger.js";
import { getLevelRequirement, determineLevel } from "../leveling.js";

const PROGRESS_BAR_SLOTS = 10;

function buildProgressBar(ratio) {
    const filledSlots = Math.round(ratio * PROGRESS_BAR_SLOTS);
    const emptySlots = PROGRESS_BAR_SLOTS - filledSlots;
    return `${"█".repeat(Math.max(0, filledSlots))}${"░".repeat(Math.max(0, emptySlots))}`;
}

function formatNumber(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "0";
    }
    return value.toLocaleString();
}

function formatLeaderboardRow(entry, index) {
    const position = entry.rank || index + 1;
    const name = entry.server_display_name || entry.display_name || entry.username || entry.discord_member_id || `Member ${position}`;
    const xp = entry.experience || 0;
    const calculatedLevel = determineLevel(xp);
    
    let medal = "";
    if (position === 1) medal = "🥇 ";
    else if (position === 2) medal = "🥈 ";
    else if (position === 3) medal = "🥉 ";
    
    return `${medal}**${name}** — LVL ${calculatedLevel} • ${formatNumber(xp)} XP`;
}

async function getServerForInteraction(interaction) {
    const botConfig = getBotConfig();
    if (!botConfig || !botConfig.id) {
        return null;
    }
    return await db.getServerByDiscordId(botConfig.id, interaction.guild.id);
}

export async function handleLevelingButton(interaction) {
    try {
        if (!(await hasPermission(interaction.member, "leveling"))) {
            await interaction.reply({
                content: "❌ You don't have permission to view leveling information.",
                flags: 64
            });
            return;
        }

        const server = await getServerForInteraction(interaction);
        if (!server) {
            await interaction.reply({
                content: "⚠️ This server is not registered with the bot. Please run a sync first.",
                flags: 64
            });
            return;
        }

        // Ensure member exists in database
        const guildMember = interaction.member || await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!guildMember) {
            await interaction.reply({
                content: "❌ Failed to fetch member information. Please try again.",
                flags: 64
            });
            return;
        }

        // Upsert member to ensure they exist in database
        const dbMember = await db.upsertMember(server.id, guildMember);
        if (!dbMember) {
            await interaction.reply({
                content: "❌ Failed to create member record. Please try again.",
                flags: 64
            });
            return;
        }

        // Ensure member level exists
        await db.ensureMemberLevel(dbMember.id);

        const embedConfig = await getEmbedConfig(interaction.guild.id);

        await db.recalculateServerMemberRanks(server.id);

        const memberLevelData = await db.getMemberLevelByDiscordId(server.id, interaction.user.id);
        const leaderboard = await db.getServerLeaderboard(server.id, 5);

        if (leaderboard && leaderboard.length > 0) {
            let leaderboardUpdated = false;
            for (const entry of leaderboard) {
                if (entry.id && entry.experience !== undefined) {
                    const calculatedLevel = determineLevel(entry.experience || 0);
                    if (calculatedLevel !== (entry.level || 1)) {
                        await db.updateMemberLevelStats(entry.id, { level: calculatedLevel });
                        leaderboardUpdated = true;
                    }
                }
            }
            if (leaderboardUpdated) {
                const updatedLeaderboard = await db.getServerLeaderboard(server.id, 5);
                if (updatedLeaderboard) {
                    leaderboard.length = 0;
                    leaderboard.push(...updatedLeaderboard);
                }
            }
        }

        const memberDisplayName = memberLevelData?.server_display_name || memberLevelData?.display_name || memberLevelData?.username || interaction.user.username;

        const currentXP = memberLevelData?.experience ?? 0;
        const calculatedLevel = determineLevel(currentXP);
        const storedLevel = memberLevelData?.level ?? 1;

        if (calculatedLevel !== storedLevel && memberLevelData?.id) {
            await db.updateMemberLevelStats(memberLevelData.id, { level: calculatedLevel });
            const updatedData = await db.getMemberLevelByDiscordId(server.id, interaction.user.id);
            if (updatedData) {
                Object.assign(memberLevelData, updatedData);
            }
        }

        const currentLevel = calculatedLevel;
        const nextLevel = currentLevel + 1;
        const currentLevelRequirement = getLevelRequirement(currentLevel);
        const nextLevelRequirement = getLevelRequirement(nextLevel);
        const xpRange = nextLevelRequirement - currentLevelRequirement;
        const xpIntoLevel = Math.max(0, currentXP - currentLevelRequirement);
        const progressRatio = xpRange > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpRange)) : 0;
        const progressBar = buildProgressBar(progressRatio);
        const xpProgressText = `${formatNumber(currentXP)} / ${formatNumber(nextLevelRequirement)} XP`;

        const profileLines = [];
        profileLines.push(`• **Level:** ${currentLevel}`);
        profileLines.push(`• **Experience:** ${formatNumber(currentXP)} XP`);
        profileLines.push(`• **Progress:** ${progressBar} (${xpProgressText})`);
        profileLines.push(`• **Chat Count:** ${formatNumber(memberLevelData?.chat_count ?? 0)}`);
        profileLines.push(`• **Voice Minutes:** ${formatNumber(memberLevelData?.voice_minutes ?? 0)}`);
        profileLines.push(`• **Rank:** ${memberLevelData?.rank ? `#${memberLevelData.rank}` : "Unranked"}`);

        const profileEmbed = new EmbedBuilder()
            .setColor(embedConfig.COLOR)
            .setTitle("📈 Your Leveling Stats")
            .setDescription(`Stats for **${memberDisplayName}**`)
            .addFields(
                {
                    name: "Your Progress",
                    value: profileLines.join("\n"),
                    inline: false
                }
            )
            .setFooter({ text: embedConfig.FOOTER })
            .setTimestamp();

        const leaderboardText = leaderboard && leaderboard.length > 0
            ? leaderboard.map((entry, idx) => formatLeaderboardRow(entry, idx)).join("\n")
            : "No leveling data available yet.";

        const leaderboardEmbed = new EmbedBuilder()
            .setColor(embedConfig.COLOR)
            .setTitle("🏆 Leaderboard (Top 5)")
            .setDescription(leaderboardText)
            .setFooter({ text: embedConfig.FOOTER })
            .setTimestamp();

        await interaction.reply({
            embeds: [profileEmbed, leaderboardEmbed],
            flags: 64
        });
    } catch (error) {
        await logger.log(`❌ Leveling interface error: ${error.message}`, interaction.guild?.id);
        await interaction.reply({
            content: `❌ Failed to load leveling information: ${error.message}`,
            flags: 64
        }).catch(() => null);
    }
}

