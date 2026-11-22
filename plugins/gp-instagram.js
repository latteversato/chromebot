// instagram.js - Gestione username Instagram per profilo
import { getUser, forceSave } from '../database.js'

export default {
  command: ['setig', 'seting', 'rimuoviig', 'delig', 'removeig'],
  
  async execute(m, { conn, command, text, usedPrefix }) {
    const user = getUser(m.sender, true)
    const mention = m.mentionedJid?.[0] || m.quoted?.sender || null
    const who = mention || m.sender
    const target = who === m.sender ? user : getUser(who, true)
    
    // ============ RIMUOVI IG ============
    if (command === 'rimuoviig' || command === 'delig' || command === 'removeig') {
      if (!target.nomeinsta && !target.instagram) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝗡𝗲𝘀𝘀𝘂𝗻 𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗶𝗺𝗽𝗼𝘀𝘁𝗮𝘁𝗼*\n\n@${who.split('@')[0]} non ha un username Instagram nel profilo.`,
          mentions: who === m.sender ? [] : [who]
        }, { quoted: m })
      }

      const oldUsername = target.nomeinsta || target.instagram
      target.nomeinsta = null
      target.instagram = ''
      forceSave()

      let responseText
      if (who === m.sender) {
        responseText = `✅ *𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗿𝗶𝗺𝗼𝘀𝘀𝗼!*\n\n📸 @${oldUsername} è stato rimosso dal tuo profilo.\n\n📌 Usa ${usedPrefix}setig per impostarne uno nuovo.`
      } else {
        responseText = `✅ *𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗿𝗶𝗺𝗼𝘀𝘀𝗼*\n\n👤 Per @${who.split('@')[0]}\n📸 @${oldUsername} è stato rimosso.`
      }

      return conn.sendMessage(m.chat, {
        text: responseText,
        mentions: who === m.sender ? [] : [who]
      }, { quoted: m })
    }
    
    // ============ SET IG ============
    if (command === 'setig' || command === 'seting') {
      if (!text) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝗜𝗻𝘀𝗲𝗿𝗶𝘀𝗰𝗶 𝘂𝗻 𝘂𝘀𝗲𝗿𝗻𝗮𝗺𝗲*\n\n📌 Esempio: ${usedPrefix}setig mionomeinstagram\n📌 Esempio: ${usedPrefix}setig @utente suoinstagram`,
          mentions: who === m.sender ? [] : [who]
        }, { quoted: m })
      }

      // Estrai username dal link o testo
      const usernameMatch = text.match(/instagram\.com\/([^/?\s]+)/i)
      let instagramUsername = usernameMatch ? usernameMatch[1] : text.trim().replace(/[@#]/g, '')

      // Rimuovi eventuali menzioni dal testo
      if (mention) {
        instagramUsername = instagramUsername.replace(`@${who.split('@')[0]}`, '').trim()
      }

      if (!instagramUsername || instagramUsername.length < 2) {
        return conn.sendMessage(m.chat, {
          text: '❌ *𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲 𝗻𝗼𝗻 𝘃𝗮𝗹𝗶𝗱𝗼*'
        }, { quoted: m })
      }

      // Salva l'username Instagram
      target.nomeinsta = instagramUsername
      target.instagram = instagramUsername
      forceSave()

      let responseText
      if (who === m.sender) {
        responseText = `✅ *𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗶𝗺𝗽𝗼𝘀𝘁𝗮𝘁𝗼!*\n\n📸 @${instagramUsername}\n\n📌 Usa ${usedPrefix}rimuoviig per rimuoverlo.`
      } else {
        responseText = `✅ *𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗶𝗺𝗽𝗼𝘀𝘁𝗮𝘁𝗼*\n\n👤 Per @${who.split('@')[0]}\n📸 @${instagramUsername}`
      }

      return conn.sendMessage(m.chat, {
        text: responseText,
        mentions: who === m.sender ? [] : [who]
      }, { quoted: m })
    }
  }
}