import { getChat, forceSave } from '../database.js'

export default {
    command: ['setwelcome', 'setbenvenuto', 'setbye', 'setaddio'],
    
    async execute(m, { conn, args, command, sender, isGroup, isAdmin, isOwner, isROwner, text }) {
        if (!isGroup) {
            return conn.sendMessage(m.chat, { 
                text: '❌ Questo comando può essere usato solo nei gruppi' 
            }, { quoted: m })
        }
        
        if (!isAdmin && !isOwner && !isROwner) {
            return conn.sendMessage(m.chat, { 
                text: '❌ Solo gli admin del gruppo possono usare questo comando' 
            }, { quoted: m })
        }

        const chatId = m.chat
        const chatData = getChat(chatId, true)
        
        const isWelcome = /setwelcome|setbenvenuto/i.test(command)
        const isBye = /setbye|setaddio/i.test(command)
        
        if (!text) {
            const currentMessage = isWelcome ? (chatData.sWelcome || 'Non impostato') : (chatData.sBye || 'Non impostato')
            const type = isWelcome ? 'BENVENUTO' : 'ADDIO'
            
            return conn.sendMessage(m.chat, {
                text: `╭━━━「 SET ${type} 」━━━◆
┃ 📌 *Messaggio attuale:*
┃ ${currentMessage}
┃
┃ *Variabili disponibili:*
┃ • @user - Tagga utente
┃ • @gruppo - Nome gruppo
┃ • @bio - Bio gruppo
┃ • @count - Numero membri
┃
┃ *Esempio:*
┃ .${command} Ciao @user, benvenuto in @gruppo!
╰━━━━━━━━━━━━━━◆`
            }, { quoted: m })
        }

        if (isWelcome) {
            chatData.sWelcome = text
        } else {
            chatData.sBye = text
        }
        
        forceSave()
        
        const type = isWelcome ? 'benvenuto' : 'addio'
        await conn.sendMessage(m.chat, {
            text: `✅ *Messaggio di ${type} impostato con successo!*\n\n📌 *Nuovo messaggio:*\n${text}`
        }, { quoted: m })
    }
}