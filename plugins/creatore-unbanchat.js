// unbanchat.js - Riattiva TUTTI i comandi nel gruppo (solo owner)
import { getChat, forceSave } from '../database.js'

export default {
  command: ['unbanchat', 'on'],
  owner: true,
  
  async execute(m, { conn }) {
    const chat = getChat(m.chat, true)
    chat.isBanned = false
    forceSave()
    
    await conn.sendMessage(m.chat, {
      text: '🔔 *𝗜𝗟 𝗕𝗢𝗧 𝗦𝗜 𝗘̀ 𝗦𝗩𝗘𝗚𝗟𝗜𝗔𝗧𝗢*\n\n✅ Tutti i comandi sono ora attivi!'
    }, { quoted: m })
  }
}