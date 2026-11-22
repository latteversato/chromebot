import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  command: ['topn'],
  
  async execute(m, { conn, args }) {
    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐐𝐮𝐞𝐬𝐭𝐨 𝐜𝐨𝐦𝐚𝐧𝐝𝐨 𝐟𝐮𝐧𝐳𝐢𝐨𝐧𝐚 𝐬𝐨𝐥𝐨 𝐢𝐧 𝐠𝐫𝐮𝐩𝐩𝐨*'
      }, { quoted: m })
    }

    // Prendi il nome della top dagli argomenti
    if (args.length === 0) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐃𝐞𝐯𝐢 𝐬𝐜𝐫𝐢𝐯𝐞𝐫𝐞 𝐢𝐥 𝐧𝐨𝐦𝐞 𝐝𝐞𝐥𝐥𝐚 𝐭𝐨𝐩*\n\n📝 *𝐄𝐬𝐞𝐦𝐩𝐢𝐨:* .topn più sfigato del gruppo'
      }, { quoted: m })
    }

    const topName = args.join(' ').toUpperCase()

    // Ottieni la lista dei partecipanti del gruppo
    const groupMetadata = await conn.groupMetadata(m.chat)
    const participants = groupMetadata.participants
    
    if (participants.length < 2) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐈𝐥 𝐠𝐫𝐮𝐩𝐩𝐨 𝐧𝐨𝐧 𝐡𝐚 𝐚𝐛𝐛𝐚𝐬𝐭𝐚𝐧𝐳𝐚 𝐦𝐞𝐦𝐛𝐫𝐢*'
      }, { quoted: m })
    }

    // Mescola i partecipanti e prendi i primi 10 (o meno se il gruppo è più piccolo)
    const shuffled = [...participants].sort(() => 0.5 - Math.random())
    const topMembers = shuffled.slice(0, Math.min(10, participants.length))
    
    // Crea il messaggio della top
    let message = `🏆 *𝐓𝐎𝐏 𝟏𝟎 ${topName}* 🏆\n\n`
    message += `📌 *${groupMetadata.subject}*\n`
    message += `━━━━━━━━━━━━━━\n\n`
    
    topMembers.forEach((member, index) => {
      const number = member.id.split('@')[0]
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📌'
      message += `${medal} *${index + 1}.* @${number}\n`
    })
    
    message += `\n━━━━━━━━━━━━━━\n`
    message += `🎉 *𝐂𝐨𝐦𝐩𝐥𝐢𝐦𝐞𝐧𝐭𝐢 𝐚𝐢 𝐯𝐢𝐧𝐜𝐢𝐭𝐨𝐫𝐢!* 🎉`
    
    // Prepara le mentions
    const mentions = topMembers.map(member => member.id)
    
    await conn.sendMessage(m.chat, {
      text: message,
      mentions: mentions
    }, { quoted: m })
  }
}