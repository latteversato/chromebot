import { getChat } from '../database.js'

export default {
    async groupUpdate(update, conn) {
        try {
            const { id: groupId, participants, action, author } = update
            if (!groupId || !participants || !action) return
            
            if (action !== 'promote' && action !== 'demote') return
            
            const chatData = getChat(groupId, false)
            if (!chatData || !chatData.detect) return
            
            for (const participant of participants) {
                const participantJid = conn.decodeJid(participant)
                const participantNumber = participantJid.split('@')[0]
                const authorNumber = author.split('@')[0]
                
                let message = ''
                if (action === 'promote') {
                    message = `👑 @${authorNumber} ha promosso @${participantNumber} ad *amministratore*`
                } else if (action === 'demote') {
                    message = `📉 @${authorNumber} ha rimosso @${participantNumber} dagli amministratori`
                }
                
                if (message) {
                    await conn.sendMessage(groupId, {
                        text: message,
                        mentions: [author, participantJid]
                    })
                }
            }
        } catch (e) {
            console.error('❌ Errore detect:', e)
        }
    }
}