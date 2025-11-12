




export function separateChannelsAndCategories(guildChannels) {

    const channelsArray = Array.from(guildChannels.values());

    const isThreadType = (type) => {
        if (typeof type === 'number') {
            return type === 10 || type === 11 || type === 12;
        }

        if (typeof type === 'string') {
            return type === 'GUILD_NEWS_THREAD' ||
                type === 'GUILD_PUBLIC_THREAD' ||
                type === 'GUILD_PRIVATE_THREAD';
        }
        return false;
    };

    const isCategoryType = (type) => {
        if (typeof type === 'number') {
            return type === 4;
        }
        if (typeof type === 'string') {
            return type === 'GUILD_CATEGORY';
        }
        return false;
    };

    const isTextOrNewsType = (type) => {
        if (typeof type === 'number') {
            return type === 0 || type === 5;
        }
        if (typeof type === 'string') {
            return type === 'GUILD_TEXT' || type === 'GUILD_NEWS';
        }
        return false;
    };

    const isVoiceType = (type) => {
        if (typeof type === 'number') {
            return type === 2;
        }
        if (typeof type === 'string') {
            return type === 'GUILD_VOICE';
        }
        return false;
    };

    const isStageType = (type) => {
        if (typeof type === 'number') {
            return type === 13;
        }
        if (typeof type === 'string') {
            return type === 'GUILD_STAGE_VOICE';
        }
        return false;
    };

    const allChannels = channelsArray.filter(ch => {

        const isThreadMethod = ch.isThread ? ch.isThread() : false;

        const isThreadByType = isThreadType(ch.type);

        return !isThreadMethod && !isThreadByType;
    });

    const categories = allChannels.filter(ch => {
        return isCategoryType(ch.type);
    });

    const channels = allChannels.filter(ch => {
        return isTextOrNewsType(ch.type) || isVoiceType(ch.type) || isStageType(ch.type);
    });

    return { categories, channels };
}

export function mapCategoriesForSync(categories) {
    return categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        position: cat.position !== undefined ? cat.position : null
    }));
}

export function mapChannelsForSync(channels) {
    return channels.map(ch => {

        let typeValue = ch.type;
        if (typeof ch.type === 'number') {

            const typeMap = {
                0: 'GUILD_TEXT',
                2: 'GUILD_VOICE',
                5: 'GUILD_NEWS',
                13: 'GUILD_STAGE_VOICE'
            };
            typeValue = typeMap[ch.type] || String(ch.type);
        } else if (typeof ch.type === 'string') {

            typeValue = ch.type;
        } else {

            typeValue = String(ch.type);
        }

        return {
            id: ch.id,
            name: ch.name,
            type: typeValue,
            parent_id: ch.parentId || null,
            position: ch.position !== undefined ? ch.position : null
        };
    });
}

export function formatTimestamp(timestamp = Date.now(), includeSeconds = false) {
    const formatter = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: includeSeconds ? "2-digit" : undefined,
        hour12: false,
    });

    return formatter.format(new Date(timestamp)).replace(",", "");
}
