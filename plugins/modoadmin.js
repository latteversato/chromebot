import { getChat } from '../database.js'

export default {
    async before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner, isVip }) {
        if (!m.isGroup) return false
        if (!m.text || !m.text.startsWith(global.prefissoComandi)) return false
        
        const chat = getChat(m.chat, false)
        if (!chat) return false
        
        if (chat.modoadmin === true) {
            if (isOwner || isROwner || isAdmin || isVip) {
                return false
            }
            
         
            
            return true 
        }
        
        return false
    }
}