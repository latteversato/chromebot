import { getChat } from '../database.js'

export default {
    async groupUpdate(update, conn) {
        try {
            const { id: groupId, participants, action } = update
            if (!groupId || !participants || !action) return
            
            if (action !== 'add' && action !== 'remove') return
            
            const chatData = getChat(groupId, false)
            if (!chatData || !chatData.welcome) return
            
            const groupMetadata = await conn.groupMetadata(groupId).catch(() => null)
            const groupName = groupMetadata?.subject || 'Gruppo'
            
            for (const participant of participants) {
                const participantJid = conn.decodeJid(participant)
                const participantNumber = participantJid.split('@')[0]
                
                if (action === 'add') {
                    let welcomeMsg = chatData.sWelcome || 'Ciao @user, benvenuto in @gruppo!'
                    welcomeMsg = welcomeMsg
                        .replace(/@user/g, `@${participantNumber}`)
                        .replace(/@gruppo/g, groupName)
                    
                    await conn.sendMessage(groupId, {
                        text: welcomeMsg,
                        mentions: [participantJid]
                    })
                }
                
                if (action === 'remove') {
                    let byeMsg = chatData.sBye || 'Ciao @user, ci vediamo presto!'
                    byeMsg = byeMsg
                        .replace(/@user/g, `@${participantNumber}`)
                        .replace(/@gruppo/g, groupName)
                    
                    await conn.sendMessage(groupId, {
                        text: byeMsg,
                        mentions: [participantJid]
                    })
                }
            }
        } catch (e) {
            console.error('❌ Errore welcome:', e)
        }
    }
}