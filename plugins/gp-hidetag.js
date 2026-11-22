import { downloadContentFromMessage } from '@realvare/baileys'

export default {
    command: ['tag'],
    bis: true,
    group: true,
    
    async execute(m, { conn, text, participants }) {
        const users = participants.map(u => u.id);
        
        if (!text && !m.quoted) {
            return conn.sendMessage(m.chat, { 
                text: '⚠️ *Usa il comando così:*\n\n.tag ciao a tutti\nOppure rispondi a un messaggio con .tag' 
            }, { quoted: m });
        }

        if (text && text.trim().startsWith('.')) {
            return conn.sendMessage(m.chat, { 
                text: '❌ Non puoi taggare comandi!' 
            }, { quoted: m });
        }

        if (m.quoted) {
            const quoted = m.quoted;
            
            if (quoted.text && quoted.text.trim().startsWith('.')) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ Non puoi taggare messaggi con comandi!' 
                }, { quoted: m });
            }

            try {
                const quotedMsg = quoted.message || quoted;
                const mtype = Object.keys(quotedMsg)[0];
                
                let media;
                let messageData = {
                    mentions: users,
                    contextInfo: {
                        mentionedJid: users
                    }
                };

                // Download del media se presente
                if (/image|video|audio|sticker|document/.test(mtype)) {
                    const stream = await downloadContentFromMessage(quotedMsg[mtype], mtype.replace('Message', ''));
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    media = buffer;
                }

                if (media) {
                    if (mtype.includes('image')) {
                        messageData.image = media;
                        messageData.caption = text || quotedMsg.imageMessage?.caption || '';
                    }
                    else if (mtype.includes('video')) {
                        messageData.video = media;
                        messageData.caption = text || quotedMsg.videoMessage?.caption || '';
                    }
                    else if (mtype.includes('audio')) {
                        messageData.audio = media;
                        messageData.mimetype = 'audio/mp4';
                        messageData.ptt = quotedMsg.audioMessage?.ptt || false;
                    }
                    else if (mtype.includes('sticker')) {
                        messageData.sticker = media;
                    }
                    else if (mtype.includes('document')) {
                        messageData.document = media;
                        messageData.mimetype = quotedMsg.documentMessage?.mimetype || 'application/octet-stream';
                        messageData.fileName = quotedMsg.documentMessage?.fileName || 'document';
                        messageData.caption = text || '';
                    }
                } else {
                    messageData.text = text || quoted.text || '';
                }

                await conn.sendMessage(m.chat, messageData, { quoted: null });
                
            } catch (error) {
                console.error('Errore nel download del media:', error);
                await conn.sendMessage(m.chat, {
                    text: text || quoted.text || '❌ Errore nel caricamento del media',
                    mentions: users
                }, { quoted: null });
            }
        }
        else if (text) {
            await conn.sendMessage(m.chat, {
                text: text,
                mentions: users,
                contextInfo: {
                    mentionedJid: users
                }
            }, { quoted: null });
        }
    }
}