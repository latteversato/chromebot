// bonk.js - Crea immagine bonk con profilo utente
import jimp from 'jimp'

export default {
  command: ['bonk'],
  
  async execute(m, { conn }) {
    try {
      const who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
      
      // Ottieni foto profilo
      let avatar
      try {
        avatar = await jimp.read(await conn.profilePictureUrl(who, 'image'))
      } catch {
        // Se non ha foto profilo, usa un'immagine di default
        avatar = await jimp.read('https://i.imgur.com/4M34hi2.png')
      }
      
      // Leggi immagine base bonk
      const img = await jimp.read('https://i.imgur.com/nav6WWX.png')
      
      // Composizione
      const bonk = await img
        .composite(avatar.resize(128, 128), 120, 90, {
          mode: 'dstOver',
          opacitySource: 1,
          opacityDest: 1
        })
        .getBufferAsync('image/png')
      
      await conn.sendMessage(m.chat, { 
        image: bonk 
      }, { quoted: m })
      
    } catch (error) {
      console.error('❌ Errore comando bonk:', error)
      await conn.sendMessage(m.chat, {
        text: '❌ Errore nel creare l\'immagine bonk.'
      }, { quoted: m })
    }
  }
}