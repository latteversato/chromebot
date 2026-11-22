import { getChat } from '../database.js'
import sistemaRuoli from '../ruoli.js'

export default {
    async before(m, { conn, isOwner, isROwner, isVip, isPremium }) {
        if (!m.message || m.key?.fromMe) return false
        
        const chatId = m.chat
        if (!chatId?.endsWith('@g.us')) return false
        
        const chatData = getChat(chatId, false)
        if (!chatData || !chatData.antitag) return false
        
        const isUserAuthorized = isOwner || isROwner || isVip || isPremium || m.isAdmin
        
        if (isUserAuthorized) return false
        
        let isTagAll = false
        let isHidetag = false
        let testo = ''
        
        if (m.message.conversation) {
            testo = m.message.conversation
        } else if (m.message.extendedTextMessage?.text) {
            testo = m.message.extendedTextMessage.text
        } else if (m.message.imageMessage?.caption) {
            testo = m.message.imageMessage.caption
        } else if (m.message.videoMessage?.caption) {
            testo = m.message.videoMessage.caption
        }
        
        const tagAllPatterns = [
            /@everyone/i,
            /@all/i,
            /@tutti/i,
            /@全体/i,
            /@所有人/i
        ]
        
        if (tagAllPatterns.some(pattern => pattern.test(testo))) {
            isTagAll = true
        }
        
        const mentions = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        const quotedMessage = m.message.extendedTextMessage?.contextInfo?.quotedMessage
        
        if (mentions.length > 0) {
            try {
                const groupMetadata = await conn.groupMetadata(chatId)
                const totalMembers = groupMetadata?.participants?.length || 0
                
                if (mentions.length >= totalMembers * 0.7) {
                    isTagAll = true
                }
            } catch (e) {}
        }
        
        if (m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0 && !testo) {
            isHidetag = true
        }
        
        if (m.message.imageMessage?.contextInfo?.mentionedJid?.length > 0 && !m.message.imageMessage.caption) {
            isHidetag = true
        }
        
        if (m.message.videoMessage?.contextInfo?.mentionedJid?.length > 0 && !m.message.videoMessage.caption) {
            isHidetag = true
        }
        
        if (m.message.documentMessage?.contextInfo?.mentionedJid?.length > 0) {
            isHidetag = true
        }
        
        if (m.message.audioMessage?.contextInfo?.mentionedJid?.length > 0) {
            isHidetag = true
        }
        
        if (m.message.stickerMessage?.contextInfo?.mentionedJid?.length > 0) {
            isHidetag = true
        }
        
        if (quotedMessage && m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            isHidetag = true
        }
        
        if (isTagAll || isHidetag) {
            try {
                await conn.sendMessage(chatId, {
                    delete: m.key
                })
                
                console.log(`\n[${new Date().toLocaleTimeString()}] 🚫 ANTITAG: ${isHidetag ? 'Hidetag' : 'Tag all'} eliminato da @${m.sender.split('@')[0]}`)
                
                return true
            } catch (e) {
                console.error('❌ Errore eliminazione messaggio:', e.message)
            }
        }
        
        return false
    }
}