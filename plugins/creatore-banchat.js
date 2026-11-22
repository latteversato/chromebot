// banchat.js - Disattiva TUTTI i comandi nel gruppo (solo owner)
import { getChat, forceSave } from '../database.js'

export default {
  command: ['banchat', 'off'],
  owner: true,
  
  async execute(m, { conn }) {
    const chat = getChat(m.chat, true)
    chat.isBanned = true
    forceSave()
    
    await conn.sendMessage(m.chat, {
      text: '💤 *𝗜𝗟 𝗕𝗢𝗧 𝗦𝗜 𝗘̀ 𝗔𝗗𝗗𝗢𝗥𝗠𝗘𝗡𝗧𝗔𝗧𝗢*\n\n❌ Nessun comando sarà accettato tranne .on / .unbanchat'
    }, { quoted: m })
  }
}