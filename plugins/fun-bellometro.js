import axios from 'axios';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const braquage = 'https://i.ibb.co/BKHtdBNp/default-avatar-profile-icon-1280x1280.jpg';
let defaultAvatarBuffer = null;

const createFallbackAvatar = async () => {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#6B7280';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 200px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 200, 200);
    return canvas.toBuffer();
};

const preloadDefaultAvatar = async () => {
    if (defaultAvatarBuffer) return;
    try {
        const res = await axios.get(braquage, { responseType: 'arraybuffer', timeout: 5000 });
        defaultAvatarBuffer = res.status === 200 ? Buffer.from(res.data) : await createFallbackAvatar();
    } catch (error) {
        defaultAvatarBuffer = await createFallbackAvatar();
    }
};

const bellometroConfig = {
    title: 'BELLOMETRO',
    themeColors: ['#FFD700', '#FFAACC', '#FFFFFF', '#DAA520'],
    icon: '✨',
    getDescription: (p) => {
        if (p < 20) return 'Cesso a pedali. Fai vomitare i ciechi.';
        if (p < 50) return 'Portabile. Con un sacchetto in testa e al buio.';
        if (p < 80) return 'Ti scoperei, ma mi fai schifo come persona.';
        return 'FREGNA SPAZIALE! Apri OnlyFans e diventa ricca/o.';
    },
};

async function generateBellometroImage({ title, percentage, description, avatarUrl, targetName, themeColors, icon }) {
    const width = 1080;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    let avatarImage;
    try {
        if (avatarUrl) {
            const res = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
            avatarImage = await loadImage(Buffer.from(res.data));
        } else {
            throw new Error('No avatar');
        }
    } catch {
        if (!defaultAvatarBuffer) await preloadDefaultAvatar();
        avatarImage = await loadImage(defaultAvatarBuffer);
    }

    const bgCanvas = createCanvas(width, height);
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.drawImage(avatarImage, 0, 0, width, height);
    bgCtx.filter = 'blur(40px) brightness(0.6)';
    const bgImage = bgCanvas;

    ctx.drawImage(bgImage, -width*0.1, -height*0.1, width*1.2, height*1.2);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    themeColors.forEach((color, i) => {
        gradient.addColorStop(i / (themeColors.length - 1), color);
    });
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.8;
    const vignette = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    ctx.font = 'bold 80px "Poppins", sans-serif';
    ctx.textAlign = 'center';
    const titleGradient = ctx.createLinearGradient(0, 100, 0, 180);
    themeColors.forEach((color, i) => {
        titleGradient.addColorStop(i / (themeColors.length - 1), color);
    });
    ctx.fillStyle = titleGradient;
    ctx.fillText(title, width/2, 150);

    ctx.save();
    ctx.beginPath();
    ctx.arc(width/2, 400, 110, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, width/2 - 110, 290, 220, 220);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(width/2, 400, 116, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(width/2 + 80, 470, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = themeColors[Math.floor(themeColors.length/2)];
    ctx.font = '40px sans-serif';
    ctx.fillText(icon, width/2 + 66, 495);

    ctx.fillStyle = '#f0f0f0';
    ctx.font = 'bold 48px "Poppins", sans-serif';
    ctx.fillText(targetName, width/2, 550);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(100, 620, 880, 50, 25);
    ctx.fill();

    const mainColor = themeColors[Math.floor(themeColors.length/2)];
    const progressGradient = ctx.createLinearGradient(100, 620, 980, 670);
    progressGradient.addColorStop(0, themeColors[0]);
    progressGradient.addColorStop(1, mainColor);
    ctx.fillStyle = progressGradient;
    ctx.beginPath();
    ctx.roundRect(100, 620, 880 * (percentage/100), 50, 25);
    ctx.fill();

    ctx.shadowColor = `${mainColor}80`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = mainColor;
    ctx.font = '900 90px "Poppins", sans-serif';
    ctx.fillText(`${percentage}%`, width/2, 750);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ddd';
    ctx.font = '32px "Poppins", sans-serif';
    ctx.fillText(description, width/2, 850);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.moveTo(200, 900);
    ctx.lineTo(880, 900);
    ctx.stroke();

    return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
};

export default {
    command: ['bellometro'],
    group: true,
    
    async execute(m, { conn, text }) {
        const targetUser = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
        let targetName = await conn.getName(targetUser) || "Utente";
        
        if (text) {
            const cleanText = text.replace(/@\d+/g, '').trim();
            if (cleanText) targetName = cleanText;
        }

        const percentage = Math.floor(Math.random() * 101);
        const descriptionText = bellometroConfig.getDescription(percentage);

        await conn.sendMessage(m.chat, { react: { text: bellometroConfig.icon, key: m.key } });

        try {
            const avatar = await conn.profilePictureUrl(targetUser, 'image').catch(() => null);
            const imageBuffer = await generateBellometroImage({
                title: bellometroConfig.title,
                percentage: percentage,
                description: descriptionText,
                avatarUrl: avatar,
                targetName: targetName,
                themeColors: bellometroConfig.themeColors,
                icon: bellometroConfig.icon
            });

            const caption = `*📊 ${bellometroConfig.title}* per @${targetUser.split('@')[0]}\n` +
                            `*📈 Risultato:* ${percentage}%\n` +
                            `*📝 Verdetto:* ${descriptionText}`;

            await conn.sendMessage(m.chat, {
                image: imageBuffer,
                caption: caption,
                mentions: [targetUser],
                contextInfo: global.fake?.contextInfo || {}
            }, { quoted: m });

        } catch (e) {
            console.error(`Errore bellometro:`, e);
            await conn.reply(m.chat, `⚠️ Errore grafica: ${e.message}`, m);
        }
    }
};

preloadDefaultAvatar().catch(console.error);