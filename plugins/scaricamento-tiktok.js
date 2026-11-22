import fetch from 'node-fetch'
import { getUser, forceSave } from '../database.js'

export default {
  command: ['tiktok', 'tt', 'ttdl'],
  
  async execute(m, { conn, text }) {
    if (!text) {
      return conn.sendMessage(m.chat, { 
        text: '❌ *𝐈𝐧𝐬𝐞𝐫𝐢𝐬𝐜𝐢 𝐢𝐥 𝐥𝐢𝐧𝐤 𝐓𝐢𝐤𝐓𝐨𝐤*\n\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨: .tiktok https://vm.tiktok.com/...' 
      }, { quoted: m })
    }
    
    try {
      await conn.sendMessage(m.chat, { 
        text: '⏳ *𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨...*' 
      }, { quoted: m })
      
      const tiktokUrl = text.trim()
      const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`
      
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000
      })
      
      if (!response.ok) throw new Error('API error')
      
      const data = await response.json()
      
      if (!data.data || !data.data.play) throw new Error('Video non trovato')
      
      await conn.sendMessage(m.chat, {
        video: { url: data.data.play },
        caption: '🎵 *𝐓𝐢𝐤𝐓𝐨𝐤 𝐕𝐢𝐝𝐞𝐨*'
      }, { quoted: m })
      
    } catch (error) {
      console.error('❌ Errore tiktok:', error)
      await conn.sendMessage(m.chat, { 
        text: '❌ *𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐟𝐚𝐥𝐥𝐢𝐭𝐨. 𝐏𝐫𝐨𝐯𝐚 𝐮𝐧 𝐚𝐥𝐭𝐫𝐨 𝐥𝐢𝐧𝐤.*' 
      }, { quoted: m })
    }
  }
}