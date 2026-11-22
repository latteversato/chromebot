import { getUser, forceSave } from '../database.js'

export default {
  command: ['banuser'],
  owner: true,
  
  async execute(m, { conn }) {
    let target
    
    if (m.isGroup) {
      target = m.mentionedJid?.[0] ? m.mentionedJid[0] : m.quoted?.sender
    } else {
      target = m.chat
    }
    
    if (!target) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐃𝐞𝐯𝐢 𝐦𝐞𝐧𝐳𝐢𝐨𝐧𝐚𝐫𝐞 𝐮𝐧 𝐮𝐭𝐞𝐧𝐭𝐞 𝐨 𝐫𝐢𝐬𝐩𝐨𝐧𝐝𝐞𝐫𝐞 𝐚𝐥 𝐬𝐮𝐨 𝐦𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨*'
      }, { quoted: m })
    }
    
    const user = getUser(target, true)
    user.banned = true
    forceSave()
    
    await conn.sendMessage(m.chat, {
      text: `✅ *𝐔𝐭𝐞𝐧𝐭𝐞 𝐛𝐚𝐧𝐧𝐚𝐭𝐨*\n\n👤 @${target.split('@')[0]}\n📌 𝐍𝐨𝐧 𝐩𝐨𝐭𝐫𝐚̀ 𝐩𝐢𝐮̀ 𝐮𝐬𝐚𝐫𝐞 𝐢 𝐜𝐨𝐦𝐚𝐧𝐝𝐢`,
      mentions: [target]
    }, { quoted: m })
  }
}