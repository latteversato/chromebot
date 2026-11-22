// reward.js - Ricompense automatiche per messaggi
import { getUser, forceSave } from '../database.js'

export default {
  async before(m, { conn }) {
    // Ignora messaggi del bot
    if (m.fromMe) return false
    
    const user = getUser(m.sender, true)
    
    // Inizializza messaggi se non esiste
    if (!user.messaggi) user.messaggi = 0
    
    // Ricompensa ogni 350 messaggi
    if (user.messaggi > 0 && user.messaggi % 350 === 0) {
      const reward = Math.floor(user.messaggi / 5)
      
      user.money = (parseInt(user.money) || 0) + reward
      forceSave()
      
      await conn.sendMessage(m.chat, {
        text: `🎉 *𝗥𝗜𝗖𝗢𝗠𝗣𝗘𝗡𝗦𝗔 𝗠𝗘𝗦𝗦𝗔𝗚𝗚𝗜!*\n\n@${m.sender.split('@')[0]}, hai raggiunto *${user.messaggi}* messaggi!\n💰 +${reward}€`,
        mentions: [m.sender]
      }, { quoted: m })
      
      return true
    }
    
    return false
  }
}