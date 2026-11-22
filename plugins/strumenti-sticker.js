import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import { downloadContentFromMessage } from '@realvare/baileys'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
    command: ['sticker', 's', 'stiker', 'stick'],
    desc: 'Crea sticker da foto/video',
    category: 'Media',

    async execute(m, extra) {
        const conn = extra?.conn || global.conn
        const chat = m.chat
        const quoted = m.quoted
        const args = extra.args || []
        const text = extra.text || ''

        try {
            let buffer, mime, stickerName
            
            if (quoted) {
                const quotedMsg = quoted.message || quoted.msg || quoted
                
                if (quotedMsg?.imageMessage) {
                    // Scarica l'immagine quotata
                    const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image')
                    const chunks = []
                    for await (const chunk of stream) {
                        chunks.push(chunk)
                    }
                    buffer = Buffer.concat(chunks)
                    mime = 'image'
                    stickerName = text || quotedMsg.imageMessage.caption || 'Sticker'
                } else if (quotedMsg?.videoMessage) {
                    if (quotedMsg.videoMessage.seconds > 7) {
                        return conn.sendMessage(chat, {
                            text: '❌ Il video è troppo lungo! Massimo 7 secondi'
                        }, { quoted: m })
                    }
                    const stream = await downloadContentFromMessage(quotedMsg.videoMessage, 'video')
                    const chunks = []
                    for await (const chunk of stream) {
                        chunks.push(chunk)
                    }
                    buffer = Buffer.concat(chunks)
                    mime = 'video'
                    stickerName = text || quotedMsg.videoMessage.caption || 'Sticker'
                } else if (quotedMsg?.stickerMessage) {
                    return conn.sendMessage(chat, {
                        text: '❌ Questo è già uno sticker!'
                    }, { quoted: m })
                } else {
                    return conn.sendMessage(chat, {
                        text: '❌ Rispondi a una foto o video'
                    }, { quoted: m })
                }
            } else if (m.message?.imageMessage) {
                const stream = await downloadContentFromMessage(m.message.imageMessage, 'image')
                const chunks = []
                for await (const chunk of stream) {
                    chunks.push(chunk)
                }
                buffer = Buffer.concat(chunks)
                mime = 'image'
                stickerName = text || m.message.imageMessage.caption || 'Sticker'
            } else if (m.message?.videoMessage) {
                if (m.message.videoMessage.seconds > 7) {
                    return conn.sendMessage(chat, {
                        text: '❌ Il video è troppo lungo! Massimo 7 secondi'
                    }, { quoted: m })
                }
                const stream = await downloadContentFromMessage(m.message.videoMessage, 'video')
                const chunks = []
                for await (const chunk of stream) {
                    chunks.push(chunk)
                }
                buffer = Buffer.concat(chunks)
                mime = 'video'
                stickerName = text || m.message.videoMessage.caption || 'Sticker'
            } else {
                return conn.sendMessage(chat, {
                    text: `📌 *USO STICKER*\n\n• ${global.prefissoComandi || '#'}sticker <nome> - Crea sticker dalla foto/video\n• ${global.prefissoComandi || '#'}sticker - Rispondi a una foto/video\n\n🎨 *OPZIONI*\n• sfondo - Sticker senza sfondo\n• cerchio - Sticker circolare\n• rotondo - Sticker rotondo`
                }, { quoted: m })
            }

            if (!buffer || buffer.length === 0) {
                return conn.sendMessage(chat, {
                    text: '❌ Impossibile scaricare il media'
                }, { quoted: m })
            }

            // Limita la dimensione
            if (buffer.length > 10 * 1024 * 1024) {
                return conn.sendMessage(chat, {
                    text: '❌ File troppo grande! Massimo 10MB'
                }, { quoted: m })
            }

            let packName = stickerName.substring(0, 30) || 'Sticker Chrome'
            let authorName = 'Chrome Bot'
            
            let stickerType = StickerTypes.FULL
            let background = '#00000000'
            
            if (args.includes('sfondo') || args.includes('trasparente')) {
                stickerType = StickerTypes.CROPPED
                background = 'transparent'
            }
            if (args.includes('cerchio') || args.includes('rotondo') || args.includes('circle')) {
                stickerType = StickerTypes.CIRCLE
                background = 'transparent'
            }

            // Crea lo sticker
            const sticker = new Sticker(buffer, {
                pack: packName,
                author: authorName,
                type: stickerType,
                categories: ['🤩', '🎉'],
                id: `chrome_${Date.now()}`,
                quality: 80,
                background: background
            })

            const stickerBuffer = await sticker.toBuffer()
            
            // Invia come sticker
            await conn.sendMessage(chat, {
                sticker: stickerBuffer
            }, { 
                quoted: m,
                ephemeralExpiration: m.expiration 
            })

        } catch (error) {
            console.error('Errore sticker:', error)
            
            await conn.sendMessage(chat, {
                text: `❌ Errore: ${error.message || 'Impossibile creare lo sticker'}`
            }, { quoted: m })
        }
    }
}