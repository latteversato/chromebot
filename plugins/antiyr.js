import fs from 'fs'
import { getChat } from '../database.js'

const ytRegex = /(?:https?:\/\/)?(?:www\.)?(youtube\.com|youtu\.be)\/[^\s]+/i

export default {
    async before(m, { conn, isAdmin, isBotAdmin }) {
        if (!m.isGroup) return false
        if (!m.text) return false
        
        const chat = getChat(m.chat, false)
        if (!chat) return false
        if (chat.antiyt !== true) return false
        if (isAdmin) return false
        
        if (!ytRegex.test(m.text)) return false
        
        // Elimina il messaggio
        if (isBotAdmin) {
            try {
                await conn.sendMessage(m.chat, {
                    delete: {
                        remoteJid: m.chat,
                        fromMe: false,
                        id: m.key.id,
                        participant: m.key.participant
                    }
                })
            } catch {}
        }
        
        // Prepara thumbnail
        let thumbnailBuffer
        try {
            thumbnailBuffer = fs.readFileSync('./icone/youtube.png')
        } catch {
            thumbnailBuffer = Buffer.alloc(0)
        }
        
        // Messaggio fake con location
        const fake = {
            key: {
                participants: '0@s.whatsapp.net',
                fromMe: false,
                id: 'ANTI-YT-' + Date.now()
            },
            message: {
                locationMessage: {
                    name: '🚫 𝐀𝐍𝐓𝐈 - 𝐘𝐎𝐔𝐓𝐔𝐁𝐄',
                    jpegThumbnail: thumbnailBuffer
                }
            },
            participant: '0@s.whatsapp.net'
        }
        
        await conn.sendMessage(m.chat, {
            text: `🚫 @${m.sender.split('@')[0]}, i link YouTube non sono consentiti in questo gruppo!`,
            mentions: [m.sender]
        }, { quoted: fake })
        
        return true
    }
}