import { getUser } from '../database.js'

export default {
  command: ['portafoglio', 'wallet'],
  
  async execute(m, { conn }) {
    const mention = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null)
    const who = mention || m.sender
    const user = getUser(who, true)

    const contanti = user.money || 0
    const depositi = user.depositi || 0
    const prelievi = user.prelievi || 0
    const bank = user.bank || 0

    const testo = `
╭══🎒 *𝐏𝐎𝐑𝐓𝐀𝐅𝐎𝐆𝐋𝐈𝐎* ══╮
│
│ 👤 *𝐔𝐭𝐞𝐧𝐭𝐞:* @${who.split('@')[0]}
│
│ 💵 *𝐂𝐨𝐧𝐭𝐚𝐧𝐭𝐢:* ${contanti} €
│ 🏦 *𝐁𝐚𝐧𝐜𝐚:* ${bank} €
│
│ 📊 *𝐒𝐭𝐨𝐫𝐢𝐜𝐨:*
│ 🔄 *𝐃𝐞𝐩𝐨𝐬𝐢𝐭𝐢:* ${depositi} €
│ 🔁 *𝐏𝐫𝐞𝐥𝐢𝐞𝐯𝐢:* ${prelievi} €
│
│ 💰 *𝐓𝐨𝐭𝐚𝐥𝐞:* ${contanti + bank} €
│
╰══════════════════╯`

    const fakeMsg = {
      key: {
        participants: "0@s.whatsapp.net",
        fromMe: false,
        id: "Portafoglio"
      },
      message: {
        contactMessage: {
          displayName: `𝐏𝐨𝐫𝐭𝐚𝐟𝐨𝐠𝐥𝐢𝐨`,
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