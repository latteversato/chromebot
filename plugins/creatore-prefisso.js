export default {
  command: ['prefisso', 'setprefix'],
  owner: true,
  
  async execute(m, { conn, text }) {
    if (!text) {
      return conn.sendMessage(m.chat, {
        text: `❌ *𝐒𝐜𝐞𝐠𝐥𝐢 𝐮𝐧 𝐩𝐫𝐞𝐟𝐢𝐬𝐬𝐨*\n\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨: .prefisso #`
      }, { quoted: m })
    }

    if (text.length > 1) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐈𝐥 𝐩𝐫𝐞𝐟𝐢𝐬𝐬𝐨 𝐝𝐞𝐯𝐞 𝐞𝐬𝐬𝐞𝐫𝐞 𝐮𝐧 𝐬𝐨𝐥𝐨 𝐜𝐚𝐫𝐚𝐭𝐭𝐞𝐫𝐞*'
      }, { quoted: m })
    }

    global.prefissoComandi = text
    global.prefix = new RegExp('^[' + text.replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')

    await conn.sendMessage(m.chat, {
      text: `✅ *𝐏𝐫𝐞𝐟𝐢𝐬𝐬𝐨 𝐚𝐠𝐠𝐢𝐨𝐫𝐧𝐚𝐭𝐨*\n\n📌 𝐍𝐮𝐨𝐯𝐨 𝐩𝐫𝐞𝐟𝐢𝐬𝐬𝐨: *${text}*`
    }, { quoted: m })
  }
}