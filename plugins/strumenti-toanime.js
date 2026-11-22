import fetch from 'node-fetch'
import { downloadContentFromMessage } from '@realvare/baileys'
import { getUser, forceSave } from '../database.js'

export default {
  command: ['anime', 'toanime'],
  
  async execute(m, { conn, usedPrefix }) {
    try {
      const q = m.quoted ? m.quoted : m
      
      if (!q.message?.imageMessage) {
        return conn.sendMessage(m.chat, { 
          text: '❌ *𝐑𝐢𝐬𝐩𝐨𝐧𝐝𝐢 𝐚 𝐮𝐧 𝐢𝐦𝐦𝐚𝐠𝐢𝐧𝐞 𝐜𝐨𝐧 .𝐚𝐧𝐢𝐦𝐞*' 
        }, { quoted: m })
      }

      await conn.sendMessage(m.chat, { 
        text: '⏳ *𝐂𝐨𝐧𝐯𝐞𝐫𝐬𝐢𝐨𝐧𝐞 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨...*' 
      }, { quoted: m })

      const stream = await downloadContentFromMessage(q.message.imageMessage, 'image')
      const chunks = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const imageBuffer = Buffer.concat(chunks)

      const formData = new FormData()
      formData.append('image', new Blob([imageBuffer]), 'image.jpg')

      const uploadResponse = await fetch('https://api.imgbb.com/1/upload?key=ed9febc5b0e29e0c5c15c1cf6be9f31d', {
        method: 'POST',
        body: formData
      })

      const uploadData = await uploadResponse.json()
      if (!uploadData.success) throw new Error('Upload fallito')
      
      const imageUrl = uploadData.data.url

      const apiUrl = `https://api.lolhuman.xyz/api/imagetoanime?apikey=lolhuman&img=${encodeURIComponent(imageUrl)}`
      
      const animeResponse = await fetch(apiUrl)
      const animeBuffer = await animeResponse.buffer()

      await conn.sendMessage(m.chat, {
        image: animeBuffer,
        caption: '✨ *𝐈𝐦𝐦𝐚𝐠𝐢𝐧𝐞 𝐜𝐨𝐧𝐯𝐞𝐫𝐭𝐢𝐭𝐚 𝐢𝐧 𝐚𝐧𝐢𝐦𝐞*'
      }, { quoted: m })

    } catch (error) {
      console.error('❌ Errore toanime:', error)
      await conn.sendMessage(m.chat, { 
        text: '❌ *𝐄𝐫𝐫𝐨𝐫𝐞 𝐧𝐞𝐥𝐥𝐚 𝐜𝐨𝐧𝐯𝐞𝐫𝐬𝐢𝐨𝐧𝐞. 𝐀𝐬𝐬𝐢𝐜𝐮𝐫𝐚𝐭𝐢 𝐜𝐡𝐞 𝐧𝐞𝐥𝐥'𝐢𝐦𝐦𝐚𝐠𝐢𝐧𝐞 𝐬𝐢𝐚 𝐯𝐢𝐬𝐢𝐛𝐢𝐥𝐞 𝐢𝐥 𝐯𝐨𝐥𝐭𝐨 𝐝𝐢 𝐮𝐧𝐚 𝐩𝐞𝐫𝐬𝐨𝐧𝐚.*' 
      }, { quoted: m })
    }
  }
}