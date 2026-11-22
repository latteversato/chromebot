import { downloadContentFromMessage } from '@realvare/baileys'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

export default {
  command: ['robar', 'wm'],
  
  async execute(m, { conn, text }) {
    if (!m.quoted) {
      return conn.sendMessage(m.chat, { 
        text: '❌ *𝐑𝐢𝐬𝐩𝐨𝐧𝐝𝐢 𝐚 𝐮𝐧𝐨 𝐬𝐭𝐢𝐜𝐤𝐞𝐫 𝐜𝐨𝐧 .𝐫𝐨𝐛𝐚𝐫*' 
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
        text: '⏳ *𝐄𝐥𝐚𝐛𝐨𝐫𝐚𝐳𝐢𝐨𝐧𝐞 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨...*' 
      }, { quoted: m })

      // Scarica lo sticker originale
      const stream = await downloadContentFromMessage(q.message.stickerMessage, 'sticker')
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const stickerBuffer = Buffer.concat(chunks)

      // Estrai packname e author dal testo
      const [packname = '', author = ''] = text ? text.split('|').map(s => s.trim()) : []
      
      // Crea un nuovo sticker con i metadati personalizzati
      const sticker = new Sticker(stickerBuffer, {
        pack: packname || '𝐂𝐇𝐑𝐎𝐌𝐄 𝐁𝐎𝐓',
        author: author || '𝐒𝐭𝐢𝐜𝐤𝐞𝐫',
        type: StickerTypes.FULL,
        quality: 100
      })

      // Ottieni il buffer del nuovo sticker con i metadati
      const newStickerBuffer = await sticker.toBuffer()

      // Invia il nuovo sticker
      await conn.sendMessage(m.chat, {
        sticker: newStickerBuffer,
        mimetype: 'image/webp'
      }, { quoted: m })

    } catch (error) {
      console.error('❌ Errore wm:', error)
      await conn.sendMessage(m.chat, { 
        text: '❌ *𝐄𝐫𝐫𝐨𝐫𝐞 𝐧𝐞𝐥𝐥𝐚 𝐜𝐫𝐞𝐚𝐳𝐢𝐨𝐧𝐞 𝐝𝐞𝐥𝐥𝐨 𝐬𝐭𝐢𝐜𝐤𝐞𝐫*\n' + error.message 
      }, { quoted: m })
    }
  }
}