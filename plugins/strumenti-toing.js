import { downloadContentFromMessage } from '@realvare/baileys'

export default {
  command: ['toimg', 'jpg', 'png'],
  
  async execute(m, { conn }) {
    if (!m.quoted) {
      return conn.sendMessage(m.chat, { 
        text: '❌ *𝐑𝐢𝐬𝐩𝐨𝐧𝐝𝐢 𝐚 𝐮𝐧𝐨 𝐬𝐭𝐢𝐜𝐤𝐞𝐫 𝐜𝐨𝐧 .𝐭𝐨𝐢𝐦𝐠*' 
      }, { quoted: m })
    }

    try {
      const q = m.quoted
      
      if (!q.message?.stickerMessage) {
        return conn.sendMessage(m.chat, { 
          text: '❌ *𝐐𝐮𝐞𝐬𝐭𝐨 𝐧𝐨𝐧 𝐞̀ 𝐮𝐧𝐨 𝐬𝐭𝐢𝐜𝐤𝐞𝐫*' 
        }, { quoted: m })
      }

      await conn.sendMessage(m.chat, { 
        text: '⏳ *𝐂𝐨𝐧𝐯𝐞𝐫𝐬𝐢𝐨𝐧𝐞 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨...*' 
      }, { quoted: m })

      const stream = await downloadContentFromMessage(q.message.stickerMessage, 'sticker')
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const stickerBuffer = Buffer.concat(chunks)

      await conn.sendMessage(m.chat, {
        image: stickerBuffer,
        caption: '✅ *𝐒𝐭𝐢𝐜𝐤𝐞𝐫 𝐜𝐨𝐧𝐯𝐞𝐫𝐭𝐢𝐭𝐨*'
      }, { quoted: m })

    } catch (error) {
      console.error('❌ Errore toimg:', error)
      await conn.sendMessage(m.chat, { 
        text: '❌ *𝐄𝐫𝐫𝐨𝐫𝐞 𝐧𝐞𝐥𝐥𝐚 𝐜𝐨𝐧𝐯𝐞𝐫𝐬𝐢𝐨𝐧𝐞*' 
      }, { quoted: m })
    }
  }
}