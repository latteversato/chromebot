// wasted.js - Effetto GTA Wasted per Chrome Bot
import axios from 'axios'
import { getUser } from '../database.js'

export default {
  command: ['wasted'],
  
  async execute(m, { conn }) {
    let userToWaste

    // ✅ Se c'è una menzione
    if (m.mentionedJid?.length) {
      userToWaste = m.mentionedJid[0]
    }
    // ✅ Se c'è una risposta a un messaggio
    else if (m.quoted) {
      userToWaste = m.quoted.sender
    }

    if (!userToWaste) {
      return conn.sendMessage(m.chat, { 
        text: '⚠️ 𝗣𝗲𝗿 𝗳𝗮𝗿𝗲 𝗶𝗹 𝗰𝗼𝗺𝗮𝗻𝗱𝗼, 𝗺𝗲𝗻𝘇𝗶𝗼𝗻𝗮 𝘂𝗻 𝘂𝘁𝗲𝗻𝘁𝗲 𝗼 𝗿𝗶𝘀𝗽𝗼𝗻𝗱𝗶 𝗮 𝘂𝗻 𝘀𝘂𝗼 𝗺𝗲𝘀𝘀𝗮𝗴𝗴𝗶𝗼.' 
      }, { quoted: m })
    }

    try {
      // 📸 Ottieni immagine profilo
      let profilePic
      try {
        profilePic = await conn.profilePictureUrl(userToWaste, 'image')
      } catch {
        profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'
      }

      // 🎨 Genera effetto wasted
      const wastedUrl = `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(profilePic)}`
      const { data } = await axios.get(wastedUrl, { responseType: 'arraybuffer' })

      // 📤 Invia immagine
      await conn.sendMessage(m.chat, {
        image: Buffer.from(data),
        caption: '☠️ 𝗥𝗶𝗽𝗼𝘀𝗮 𝗶𝗻 𝗽𝗮𝗰𝗲!',
        mentions: [userToWaste]
      }, { quoted: m })

    } catch (e) {
      console.error('❌ Errore comando wasted:', e)
      await conn.sendMessage(m.chat, { 
        text: '❌ 𝗖\'è 𝘀𝘁𝗮𝘁𝗼 𝘂𝗻 𝗲𝗿𝗿𝗼𝗿𝗲. 𝗥𝗶𝗽𝗿𝗼𝘃𝗮 𝗽𝗶ù 𝘁𝗮𝗿𝗱𝗶.' 
      }, { quoted: m })
    }
  }
}