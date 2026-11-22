import { getUser, forceSave } from '../database.js'

export default {
  command: ['join', 'entra'],
  owner: true,
  
  async execute(m, { conn, text, usedPrefix, participants, groupMetadata }) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    let message = ""
    for (const [ownerNumber] of global.owner) {
      message += `\nhttp://wa.me/${ownerNumber}`
    }

    if (!text) {
      return conn.sendMessage(m.chat, {
        text: `❌ *𝐈𝐧𝐬𝐞𝐫𝐢𝐬𝐜𝐢 𝐢𝐥 𝐥𝐢𝐧𝐤 𝐝𝐞𝐥 𝐠𝐫𝐮𝐩𝐩𝐨*\n\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨: ${usedPrefix}join https://chat.whatsapp.com/xxxxxx`
      }, { quoted: m })
    }

    let linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i
    let [_, code] = text.match(linkRegex) || []
    
    if (!code) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐋𝐢𝐧𝐤 𝐧𝐨𝐧 𝐯𝐚𝐥𝐢𝐝𝐨*'
      }, { quoted: m })
    }

    await conn.sendMessage(m.chat, {
      text: '⏳ *𝐀𝐭𝐭𝐞𝐧𝐝𝐢 3 𝐬𝐞𝐜𝐨𝐧𝐝𝐢, 𝐬𝐭𝐨 𝐞𝐧𝐭𝐫𝐚𝐧𝐝𝐨 𝐧𝐞𝐥 𝐠𝐫𝐮𝐩𝐩𝐨*'
    }, { quoted: m })
    
    await delay(3000)

    try {
      let res = await conn.groupAcceptInvite(code)
      let b = await conn.groupMetadata(res)
      let d = b.participants.map(v => v.id)
      let owbot = global.owner[0]?.[0] || ''

      await conn.sendMessage(res, {
        text: `👋 *𝐂𝐢𝐚𝐨 𝐚𝐦𝐢𝐜𝐢 𝐝𝐢 ${b.subject}*\n\n@${owbot} è 𝐢𝐥 𝐦𝐢𝐨 𝐩𝐚𝐝𝐫𝐨𝐧𝐞\n𝐈 𝐦𝐢𝐞𝐢 𝐜𝐨𝐦𝐚𝐧𝐝𝐢 𝐬𝐨𝐧𝐨 𝐯𝐢𝐬𝐮𝐚𝐥𝐢𝐳𝐳𝐚𝐛𝐢𝐥𝐢 𝐢𝐧 ${usedPrefix}𝐦𝐞𝐧𝐮`,
        mentions: d
      })

      await conn.sendMessage(m.chat, {
        text: `✅ *𝐄𝐧𝐭𝐫𝐚𝐭𝐨 𝐧𝐞𝐥 𝐠𝐫𝐮𝐩𝐩𝐨*\n\n📌 ${b.subject}`
      }, { quoted: m })

    } catch (e) {
      console.error('❌ Errore join:', e)
      await conn.sendMessage(m.chat, {
        text: '❌ *𝐈𝐥 𝐛𝐨𝐭 è 𝐠𝐢à 𝐧𝐞𝐥 𝐠𝐫𝐮𝐩𝐩𝐨 𝐨 𝐥𝐢𝐧𝐤 𝐧𝐨𝐧 𝐯𝐚𝐥𝐢𝐝𝐨*'
      }, { quoted: m })
    }
  }
}