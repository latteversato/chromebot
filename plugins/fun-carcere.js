// jail.js - Effetto arresto per Chrome Bot
import axios from 'axios'

export default {
  command: ['jail'],
  
  async execute(m, { conn }) {
    let userToJail

    // ✅ Se c'è una menzione
    if (m.mentionedJid?.length) {
      userToJail = m.mentionedJid[0]
    }
    // ✅ Se c'è una risposta a un messaggio
    else if (m.quoted) {
      userToJail = m.quoted.sender
    }

    if (!userToJail) {
      return conn.sendMessage(m.chat, {
        text: '👮 𝗣𝗲𝗿 𝗺𝗮𝗻𝗱𝗮𝗿𝗲 𝗾𝘂𝗮𝗹𝗰𝘂𝗻𝗼 𝗶𝗻 𝗰𝗮𝗿𝗰𝗲𝗿𝗲, 𝗺𝗲𝗻𝘇𝗶𝗼𝗻𝗮 𝘂𝗻 𝘂𝘁𝗲𝗻𝘁𝗲 𝗼 𝗿𝗶𝘀𝗽𝗼𝗻𝗱𝗶 𝗮 𝘂𝗻 𝘀𝘂𝗼 𝗺𝗲𝘀𝘀𝗮𝗴𝗴𝗶𝗼.'
      }, { quoted: m })
    }

    try {
      // 📸 Ottieni immagine profilo
      let profilePic
      try {
        profilePic = await conn.profilePictureUrl(userToJail, 'image')
      } catch {
        profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'
      }

      // 🎨 Genera effetto jail
      const jailUrl = `https://some-random-api.com/canvas/overlay/jail?avatar=${encodeURIComponent(profilePic)}`
      const { data } = await axios.get(jailUrl, { responseType: 'arraybuffer' })

      // 📤 Invia immagine
      await conn.sendMessage(m.chat, {
        image: Buffer.from(data),
        caption: '🚔 𝗔𝗿𝗿𝗲𝘀𝘁𝗮𝘁𝗼! 🔒',
        mentions: [userToJail]
      }, { quoted: m })

    } catch (e) {
      console.error('❌ Errore comando jail:', e)
      await conn.sendMessage(m.chat, {
        text: '❌ 𝗖\'è 𝘀𝘁𝗮𝘁𝗼 𝘂𝗻 𝗲𝗿𝗿𝗼𝗿𝗲. 𝗥𝗶𝗽𝗿𝗼𝘃𝗮 𝗽𝗶ù 𝘁𝗮𝗿𝗱𝗶.'
      }, { quoted: m })
    }
  }
}