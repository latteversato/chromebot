import { getUser } from '../database.js'

export default {
  command: ['banca', 'bank'],
  
  async execute(m, { conn }) {
    const mention = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
    const who = mention || m.sender
    const user = getUser(who, true)

    const banca = user.bank || 0
    const furti = user.furti || 0
    const ultimo = user.datafurto || "𝐌𝐚𝐢"
    const rubati = user.rubati || 0

    const testo = `
╭══🏦 *𝐂𝐎𝐍𝐓𝐎 𝐁𝐀𝐍𝐂𝐀𝐑𝐈𝐎* ══╮
│
│ 👤 *𝐔𝐭𝐞𝐧𝐭𝐞:* @${who.split('@')[0]}
│
│ 💰 *𝐒𝐚𝐥𝐝𝐨:* ${banca} €
│
╰════════════════╯

╭══🥷 *𝐒𝐓𝐀𝐓𝐎 𝐅𝐔𝐑𝐓𝐈* ══╮
│
│ 📊 *𝐓𝐨𝐭𝐚𝐥𝐢:* ${furti}
│ 🕓 *𝐔𝐥𝐭𝐢𝐦𝐨:* ${ultimo}
│ 💸 *𝐆𝐮𝐚𝐝𝐚𝐠𝐧𝐨:* ${rubati} €
│
╰═════════════╯`

    const fakeMsg = {
      key: {
        participants: "0@s.whatsapp.net",
        fromMe: false,
        id: "Banca"
      },
      message: {
        contactMessage: {
          displayName: `𝐁𝐚𝐧𝐜𝐚`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${who.split`@`[0]}:${who.split`@`[0]}\nitem1.X-ABLabel:Cell\nEND:VCARD`
        }
      },
      participant: "0@s.whatsapp.net"
    }

    await conn.sendMessage(m.chat, {
      text: testo,
      mentions: [who]
    }, { quoted: fakeMsg })
  }
}