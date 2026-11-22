export default {
  command: ['bio'],
  group: true,
  admin: true,
  
  async execute(m, { conn, args }) {
    if (!args || args.length === 0) {
      return conn.sendMessage(m.chat, { 
        text: '📝 *𝗜𝗻𝘀𝗲𝗿𝗶𝘀𝗰𝗶 𝗹𝗮 𝗻𝘂𝗼𝘃𝗮 𝗱𝗲𝘀𝗰𝗿𝗶𝘇𝗶𝗼𝗻𝗲 𝗱𝗲𝗹 𝗴𝗿𝘂𝗽𝗽𝗼*\n\nEsempio: .bio Benvenuti nel gruppo ufficiale' 
      }, { quoted: m })
    }

    try {
      const groupDescription = args.join(' ')
      await conn.groupUpdateDescription(m.chat, groupDescription)
      await conn.sendMessage(m.chat, { 
        text: `✅ *𝗗𝗲𝘀𝗰𝗿𝗶𝘇𝗶𝗼𝗻𝗲 𝗮𝗴𝗴𝗶𝗼𝗿𝗻𝗮𝘁𝗮*\n\n${groupDescription}` 
      }, { quoted: m })
    } catch (e) {
      console.error('❌ Errore bio:', e)
      await conn.sendMessage(m.chat, { 
        text: '❌ *Errore nel cambiare la descrizione*' 
      }, { quoted: m })
    }
  }
}