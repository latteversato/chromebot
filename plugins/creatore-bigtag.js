export default {
  command: ['bigtag'],
  group: true,
  owner: true,
  
  async execute(m, { conn, text, participants }) {
    try {
      const delay = (time) => new Promise((res) => setTimeout(res, time))

      let customMessage = text.trim()

      if (!customMessage) {
        return conn.sendMessage(m.chat, {
          text: '❌ *𝐃𝐞𝐯𝐢 𝐬𝐜𝐫𝐢𝐯𝐞𝐫𝐞 𝐮𝐧 𝐦𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨 𝐝𝐨𝐩𝐨 𝐢𝐥 𝐜𝐨𝐦𝐚𝐧𝐝𝐨*'
        }, { quoted: m })
      }

      let users = participants.map((u) => conn.decodeJid(u.id))

      const sendHidetagMessage = async (message) => {
        let more = String.fromCharCode(8206)
        let masss = more.repeat(4001)
        await conn.relayMessage(m.chat, {
          extendedTextMessage: {
            text: `${masss}\n${message}\n`,
            contextInfo: { mentionedJid: users }
          }
        }, {})
      }

      const maxMessageLength = 200
      let messageChunks = []

      while (customMessage.length > maxMessageLength) {
        messageChunks.push(customMessage.slice(0, maxMessageLength))
        customMessage = customMessage.slice(maxMessageLength)
      }
      messageChunks.push(customMessage)

      await conn.sendMessage(m.chat, {
        text: '⏳ *𝐈𝐧𝐯𝐢𝐨 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨...*'
      }, { quoted: m })

      for (let i = 0; i < 10; i++) {
        for (let chunk of messageChunks) {
          await sendHidetagMessage(chunk)
          await delay(2000)
        }
      }

    } catch (e) {
      console.error('❌ Errore bigtag:', e)
      await conn.sendMessage(m.chat, {
        text: '❌ *𝐄𝐫𝐫𝐨𝐫𝐞 𝐝𝐮𝐫𝐚𝐧𝐭𝐞 𝐥\'𝐢𝐧𝐯𝐢𝐨*'
      }, { quoted: m })
    }
  }
}