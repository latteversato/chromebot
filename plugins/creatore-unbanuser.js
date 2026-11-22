import { getUser, forceSave } from '../database.js'

export default {
  command: ['unbanuser', 'unban'],
  owner: true,
  
  async execute(m, { conn, text }) {
    let who
    
    if (m.isGroup) {
      if (m.quoted) {
        who = m.quoted.sender
      } else if (text) {
        who = m.mentionedJid?.[0]
      }
    } else {
      who = m.chat
    }
    
    if (!who) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐃𝐞𝐯𝐢 𝐦𝐞𝐧𝐳𝐢𝐨𝐧𝐚𝐫𝐞 𝐮𝐧 𝐮𝐭𝐞𝐧𝐭𝐞 𝐨 𝐫𝐢𝐬𝐩𝐨𝐧𝐝𝐞𝐫𝐞 𝐚𝐥 𝐬𝐮𝐨 𝐦𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨*'
      }, { quoted: m })
    }
    
    const user = getUser(who, true)
    
    if (!user.banned) {
      return conn.sendMessage(m.chat, {
        text: `✅ *𝐐𝐮𝐞𝐬𝐭𝐨 𝐮𝐭𝐞𝐧𝐭𝐞 𝐧𝐨𝐧 è 𝐛𝐚𝐧𝐧𝐚𝐭𝐨*`
      }, { quoted: m })
    }
    
    user.banned = false
    forceSave()
    
    await conn.sendMessage(m.chat, {
      text: `✅ *𝐔𝐭𝐞𝐧𝐭𝐞 𝐬𝐛𝐥𝐨𝐜𝐜𝐚𝐭𝐨*\n\n👤 @${who.split('@')[0]}\n📌 𝐎𝐫𝐚 𝐩𝐮𝐨̀ 𝐞𝐬𝐞𝐠𝐮𝐢𝐫𝐞 𝐢 𝐜𝐨𝐦𝐚𝐧𝐝𝐢`,
      mentions: [who]
    }, { quoted: m })
  }
}