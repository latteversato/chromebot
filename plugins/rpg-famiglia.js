// famiglia.js - Visualizza lo stato familiare con animali
import { getUser } from '../database.js'

export default {
    command: ['famiglia', 'fam', 'family'],
    
    async execute(m, { conn }) {
        const mention = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const who = mention
        
        const user = getUser(who, true)
        
        if (!user.ex) user.ex = []
        if (!user.figli) user.figli = []
        if (!user.genitori) user.genitori = []
        if (!user.coniuge) user.coniuge = ''
        if (!user.sposato) user.sposato = false
        if (!user.pets) user.pets = []
        if (!user.cibo) user.cibo = 0
        if (!user.ultimoPasto) user.ultimoPasto = {}
        
        if (!user.name) {
            try {
                user.name = await conn.getName(who) || 'Utente'
            } catch {
                user.name = 'Utente'
            }
        }
        
        const exList = user.ex.length > 0 
            ? user.ex.map(jid => `• @${jid.split('@')[0]}`).join('\n') 
            : '— 𝐧𝐞𝐬𝐬𝐮𝐧𝐨 —'
            
        const figliList = user.figli.length > 0 
            ? user.figli.map(jid => `• @${jid.split('@')[0]}`).join('\n') 
            : '— 𝐧𝐞𝐬𝐬𝐮𝐧𝐨 —'
            
        const genitoriList = user.genitori.length > 0 
            ? user.genitori.map(jid => `• @${jid.split('@')[0]}`).join('\n') 
            : '— 𝐧𝐞𝐬𝐬𝐮𝐧𝐨 —'
        
        let petsList = ''
        if (user.pets.length > 0) {
            user.pets.forEach((pet, index) => {
                const oreFame = Math.floor((Date.now() - (pet.ultimoPasto || Date.now())) / 3600000)
                let fameIcon = oreFame >= 6 ? '🍖' : oreFame >= 4 ? '⚠️' : '✅'
                petsList += `• ${pet.emoji} ${pet.nome} ${fameIcon}\n`
            })
        } else {
            petsList = '— 𝐧𝐞𝐬𝐬𝐮𝐧𝐨 —'
        }
        
        const coniugeText = user.coniuge && user.coniuge !== '' 
            ? `@${user.coniuge.split('@')[0]}` 
            : '— 𝐧𝐞𝐬𝐬𝐮𝐧𝐨 —'
            
        const sposatoText = user.sposato ? '💍 𝐒ì' : '❌ 𝐍𝐨'
        const nameText = user.name || '𝐒𝐜𝐨𝐧𝐨𝐬𝐜𝐢𝐮𝐭𝐨'
        
        const mentions = []
        if (user.coniuge && user.coniuge !== '') mentions.push(user.coniuge)
        mentions.push(...user.ex)
        mentions.push(...user.figli)
        mentions.push(...user.genitori)
        
        const text = `╔════════════╗
║    𝐏𝐫𝐨𝐟𝐢𝐥𝐨 𝐅𝐚𝐦𝐢𝐠𝐥𝐢𝐚𝐫𝐞    ║
╚════════════╝

👤 *𝐍𝐨𝐦𝐞:* ${nameText}
📱 *𝐍𝐮𝐦𝐞𝐫𝐨:* ${who.split('@')[0]}
💰 *𝐒𝐨𝐥𝐝𝐢:* ${user.money || 0} €
🍖 *𝐂𝐢𝐛𝐨:* ${user.cibo} 𝐤𝐠

💍 *𝐒𝐩𝐨𝐬𝐚𝐭𝐨/𝐚:* ${sposatoText}
🤵 *𝐂𝐨𝐧𝐢𝐮𝐠𝐞:* ${coniugeText}

💔 *𝐄𝐱 𝐂𝐨𝐧𝐢𝐮𝐠𝐢:*
${exList}

👶 *𝐅𝐢𝐠𝐥𝐢:*
${figliList}

👪 *𝐆𝐞𝐧𝐢𝐭𝐨𝐫𝐢:*
${genitoriList}

🐾 *𝐀𝐧𝐢𝐦𝐚𝐥𝐢 𝐃𝐨𝐦𝐞𝐬𝐭𝐢𝐜𝐢:*
${petsList}`

        await conn.sendMessage(m.chat, {
            text,
            mentions: mentions.filter(Boolean)
        }, { quoted: m })
    }
}