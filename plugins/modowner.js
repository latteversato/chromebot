// modowner.js
import { getChat } from '../database.js'

export default {
    async before(m, { conn, isOwner, isROwner }) {
        if (!m.isGroup) return false
        if (!m.text || !m.text.startsWith(global.prefissoComandi)) return false
        
        const chat = getChat(m.chat, false)
        if (!chat) return false
        
        if (chat.modowner === true) {
            if (isOwner || isROwner) {
                return false
            }
            return true 
        }
        
        return false
    }
}