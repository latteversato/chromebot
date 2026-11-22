import { downloadContentFromMessage } from '@realvare/baileys';

export default {
    command: ['rivela', 'readviewonce', 'viewonce', 'readvo', 'getmedia', 'view', 'nocap'],
    desc: 'Rivela e scarica contenuti view once (foto/video/audio)',
    category: 'Media',
    admin: true,

    async execute(m, { conn, command, usedPrefix = '.' }) {
        const chat = m.chat;

        if (!m.quoted) {
            return conn.sendMessage(chat, {
                text: `📌 *USO DEL COMANDO ${usedPrefix}rivela*\n\n` +
                      `Rispondi a un messaggio **view once** (foto/video/audio) con:\n` +
                      `→ ${usedPrefix}rivela\n\n` +
                      `Funziona anche su media normali (non view once).\n` +
                      `🔓 Rivela view once • 🖼️ Foto • 🎥 Video • 🎵 Audio`
            }, { quoted: m });
        }

        try {
            const quoted = m.quoted;
            let mediaContent = null;
            let mediaType = '';
            let caption = '';

            const msg = quoted.message || quoted;

            if (msg?.viewOnceMessageV2?.message) {
                const vom = msg.viewOnceMessageV2.message;
                if (vom?.imageMessage) {
                    mediaContent = vom.imageMessage;
                    mediaType = 'image';
                    caption = vom.imageMessage.caption || '';
                } else if (vom?.videoMessage) {
                    mediaContent = vom.videoMessage;
                    mediaType = 'video';
                    caption = vom.videoMessage.caption || '';
                } else if (vom?.audioMessage) {
                    mediaContent = vom.audioMessage;
                    mediaType = 'audio';
                }
            } else if (msg?.viewOnceMessage?.message) {
                const vom = msg.viewOnceMessage.message;
                if (vom?.imageMessage) {
                    mediaContent = vom.imageMessage;
                    mediaType = 'image';
                    caption = vom.imageMessage.caption || '';
                } else if (vom?.videoMessage) {
                    mediaContent = vom.videoMessage;
                    mediaType = 'video';
                    caption = vom.videoMessage.caption || '';
                } else if (vom?.audioMessage) {
                    mediaContent = vom.audioMessage;
                    mediaType = 'audio';
                }
            } else if (msg?.ephemeralMessage?.message?.viewOnceMessageV2?.message) {
                const vom = msg.ephemeralMessage.message.viewOnceMessageV2.message;
                if (vom?.imageMessage) {
                    mediaContent = vom.imageMessage;
                    mediaType = 'image';
                    caption = vom.imageMessage.caption || '';
                } else if (vom?.videoMessage) {
                    mediaContent = vom.videoMessage;
                    mediaType = 'video';
                    caption = vom.videoMessage.caption || '';
                }
            }

            if (!mediaContent) {
                if (msg?.imageMessage) {
                    mediaContent = msg.imageMessage;
                    mediaType = 'image';
                    caption = msg.imageMessage.caption || '';
                } else if (msg?.videoMessage) {
                    mediaContent = msg.videoMessage;
                    mediaType = 'video';
                    caption = msg.videoMessage.caption || '';
                } else if (msg?.audioMessage) {
                    mediaContent = msg.audioMessage;
                    mediaType = 'audio';
                }
            }

            if (!mediaContent || !mediaType) {
                return conn.sendMessage(chat, {
                    text: '❌ Non è un contenuto multimediale valido (foto/video/audio)'
                }, { quoted: m });
            }

            let buffer;
            try {
                const stream = await downloadContentFromMessage(mediaContent, mediaType);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                buffer = Buffer.concat(chunks);
            } catch (downloadErr) {
                console.error('Errore download view once:', downloadErr);
                return conn.sendMessage(chat, {
                    text: '❌ Impossibile scaricare il contenuto (potrebbe essere scaduto o corrotto)'
                }, { quoted: m });
            }

            if (!buffer || buffer.length === 0) {
                return conn.sendMessage(chat, {
                    text: '❌ Il file scaricato è vuoto'
                }, { quoted: m });
            }

            if (mediaType === 'image') {
                await conn.sendMessage(chat, {
                    image: buffer,
                    caption: caption || '',
                    mimetype: 'image/jpeg'
                }, { quoted: m });
            } else if (mediaType === 'video') {
                await conn.sendMessage(chat, {
                    video: buffer,
                    caption: caption || '',
                    mimetype: 'video/mp4',
                    fileName: 'rivela_video.mp4'
                }, { quoted: m });
            } else if (mediaType === 'audio') {
                await conn.sendMessage(chat, {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    fileName: 'rivela_audio.mp3',
                    ptt: false
                }, { quoted: m });
            }

        } catch (err) {
            console.error('Errore generale in .rivela:', err);
            await conn.sendMessage(chat, {
                text: `❌ Errore: ${err.message || 'operazione fallita'}\n\nProva a rispondere di nuovo al messaggio view once.`
            }, { quoted: m });
        }
    }
};