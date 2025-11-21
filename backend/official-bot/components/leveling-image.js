import Jimp from 'jimp';
import { getEmbedConfig } from '../../config.js';

async function generateLevelUpImage(member, newLevel, guildId) {
    // Get embed color from config
    const embedConfig = await getEmbedConfig(guildId);
    const embedColor = embedConfig.COLOR;
    
    // Convert decimal color to RGB
    const r = (embedColor >> 16) & 0xFF;
    const g = (embedColor >> 8) & 0xFF;
    const b = embedColor & 0xFF;
    const borderColor = Jimp.rgbaToInt(r, g, b, 255);

    // Create image
    const width = 1000;
    const height = 400;
    const image = new Jimp(width, height, 0x1f2937ff);

    // Draw border using embed color
    for (let x = 0; x < width; x++) {
        for (let border = 0; border < 4; border++) {
            image.setPixelColor(borderColor, x, border);
            image.setPixelColor(borderColor, x, height - 1 - border);
        }
    }
    for (let y = 0; y < height; y++) {
        for (let border = 0; border < 4; border++) {
            image.setPixelColor(borderColor, border, y);
            image.setPixelColor(borderColor, width - 1 - border, y);
        }
    }

    // Load avatar
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });
    const avatarImage = await Jimp.read(avatarUrl);
    avatarImage.resize(220, 220);

    // Create circular avatar
    const avatarSize = 220;
    const avatarX = 80;
    const avatarY = 90;
    const radius = 110;
    const circularAvatar = new Jimp(avatarSize, avatarSize, 0x00000000);
    
    for (let y = 0; y < avatarSize; y++) {
        for (let x = 0; x < avatarSize; x++) {
            const dx = x - radius;
            const dy = y - radius;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
                const color = avatarImage.getPixelColor(x, y);
                circularAvatar.setPixelColor(color, x, y);
            }
        }
    }

    // Create border circles
    const borderOuter = new Jimp(236, 236, 0x00000000);
    const embedR = r;
    const embedG = g;
    const embedB = b;
    borderOuter.scan(0, 0, 236, 236, function (x, y, idx) {
        const dx = x - 118;
        const dy = y - 118;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 118 && dist > 114) {
            this.bitmap.data[idx] = embedR;
            this.bitmap.data[idx + 1] = embedG;
            this.bitmap.data[idx + 2] = embedB;
            this.bitmap.data[idx + 3] = 255;
        } else if (dist <= 114 && dist > 110) {
            this.bitmap.data[idx] = 255;
            this.bitmap.data[idx + 1] = 255;
            this.bitmap.data[idx + 2] = 255;
            this.bitmap.data[idx + 3] = 255;
        }
    });

    image.composite(borderOuter, avatarX - 8, avatarY - 8);
    image.composite(circularAvatar, avatarX, avatarY);

    // Load fonts
    const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);

    // Username
    const username = member.displayName ?? member.user.username;
    let displayUsername = username;
    if (username.length > 25) {
        displayUsername = username.substring(0, 22) + '...';
    }
    image.print(fontSmall, 360, 100, displayUsername);

    // "LEVEL UP!" text
    image.print(fontMedium, 360, 160, 'LEVEL UP!');
    for (let y = 160; y < 220; y++) {
        for (let x = 360; x < 600; x++) {
            const color = image.getPixelColor(x, y);
            const rgba = Jimp.intToRGBA(color);
            if (rgba.r > 200 && rgba.g > 200 && rgba.b > 200 && rgba.a > 0) {
                image.setPixelColor(borderColor, x, y);
            }
        }
    }

    // Level Number
    image.print(fontLarge, 360, 240, `Level ${newLevel}`);

    return await image.getBufferAsync(Jimp.MIME_PNG);
}

export { generateLevelUpImage };
