import { getChat, forceSave } from '../database.js'

const instagramRegex = /(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)(\/[^\s]*)?/gi

export default {
    async before(m, { conn, isAdmin, isBotAdmin }) {
        if (!m.isGroup) return false
        if (!m.text) return false
        
        const chat = getChat(m.chat, false)
        if (!chat) return false
        if (chat.antilinkig !== true) return false
        if (isAdmin) return false
        if (!isBotAdmin) return false
        
        instagramRegex.lastIndex = 0
        
        const hasInstagram = instagramRegex.test(m.text)
        if (!hasInstagram) return false
        
        try {
            await conn.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: m.key.id,
                    participant: m.key.participant
                }
            })
            
            await conn.sendMessage(m.chat, {
                text: `🚫 @${m.sender.split('@')[0]}, i link Instagram non sono consentiti in questo gruppo!`,
                mentions: [m.sender]
            })
            
            return true
        } catch (error) {
            return false
        }
    }
}