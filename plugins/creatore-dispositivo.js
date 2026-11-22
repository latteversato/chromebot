export default {
  command: ['check', 'device', 'dispositivo'],
  group: true,
  owner: true,
  
  async execute(m, { conn }) {
    if (!m.quoted) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐑𝐢𝐬𝐩𝐨𝐧𝐝𝐢 𝐚 𝐮𝐧 𝐦𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨 𝐩𝐞𝐫 𝐚𝐧𝐚𝐥𝐢𝐳𝐳𝐚𝐫𝐞 𝐢𝐥 𝐝𝐢𝐬𝐩𝐨𝐬𝐢𝐭𝐢𝐯𝐨*'
      }, { quoted: m })
    }

    const msgID = m.quoted.id || m.quoted.key?.id
    const senderJid = m.quoted.sender || 'sconosciuto'
    const tagUtente = senderJid.replace(/@.+/, '')

    let device = '𝐃𝐢𝐬𝐩𝐨𝐬𝐢𝐭𝐢𝐯𝐨 𝐬𝐜𝐨𝐧𝐨𝐬𝐜𝐢𝐮𝐭𝐨 🕵️‍♂️'

    if (!msgID) {
      device = '⚠️ 𝐈𝐦𝐩𝐨𝐬𝐬𝐢𝐛𝐢𝐥𝐞 𝐫𝐢𝐥𝐞𝐯𝐚𝐫𝐞 𝐢𝐥 𝐝𝐢𝐬𝐩𝐨𝐬𝐢𝐭𝐢𝐯𝐨'
    } else if (/^[a-zA-Z]+-[a-fA-F0-9]+$/.test(msgID)) {
      device = '🤖 *𝐌𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨 𝐝𝐚 𝐛𝐨𝐭*'
    } else if (msgID.startsWith('false_') || msgID.startsWith('true_')) {
      device = '💻 *𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐖𝐞𝐛*'
    } else if (msgID.startsWith('3EB0') && /^[A-Z0-9]+$/.test(msgID)) {
      device = '💻 *𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐖𝐞𝐛 𝐨 𝐛𝐨𝐭*'
    } else if (msgID.includes(':')) {
      device = '🖥️ *𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 𝐃𝐞𝐬𝐤𝐭𝐨𝐩*'
    } else if (/^[A-F0-9]{32}$/i.test(msgID)) {
      device = '📱 *𝐀𝐧𝐝𝐫𝐨𝐢𝐝*'
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(msgID)) {
      device = '🍏 *𝐢𝐎𝐒*'
    } else if (/^[A-Z0-9]{20,25}$/i.test(msgID) && !msgID.startsWith('3EB0')) {
      device = '🍏 *𝐢𝐎𝐒*'
    } else if (msgID.startsWith('3EB0')) {
      device = '🤖 *𝐀𝐧𝐝𝐫𝐨𝐢𝐝 (𝐯𝐞𝐜𝐜𝐡𝐢𝐨 𝐬𝐜𝐡𝐞𝐦𝐚)*'
    } else {
      device = '𝐃𝐢𝐬𝐩𝐨𝐬𝐢𝐭𝐢𝐯𝐨 𝐬𝐜𝐨𝐧𝐨𝐬𝐜𝐢𝐮𝐭𝐨 🕵️‍♂️'
      console.log('[ANALISI] Nuovo ID non riconosciuto:', msgID)
    }

    const messaggio = `╭─[ 📍 *𝐀𝐧𝐚𝐥𝐢𝐬𝐢 𝐔𝐭𝐞𝐧𝐭𝐞* ]
│ 👤 *𝐔𝐭𝐞𝐧𝐭𝐞:* @${tagUtente}
│ 💽 *𝐎𝐫𝐢𝐠𝐢𝐧𝐞:* ${device}
╰───────────────`

    await conn.sendMessage(m.chat, {
      text: messaggio,
      mentions: [senderJid]
    }, { quoted: m })
  }
}