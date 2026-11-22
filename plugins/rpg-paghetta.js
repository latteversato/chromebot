import { getUser, forceSave } from '../database.js'

function msToTime(duration) {
  let hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  let minutes = Math.floor((duration / (1000 * 60)) % 60)
  let seconds = Math.floor((duration / 1000) % 60)

  hours = (hours < 10) ? "0" + hours : hours
  minutes = (minutes < 10) ? "0" + minutes : minutes
  seconds = (seconds < 10) ? "0" + seconds : seconds

  return `${hours} 𝐨𝐫𝐞 ${minutes} 𝐦𝐢𝐧𝐮𝐭𝐢 ${seconds} 𝐬𝐞𝐜𝐨𝐧𝐝𝐢`
}

export default {
  command: ['paghetta'],
  group: true,
  
  async execute(m, { conn }) {
    const user = getUser(m.sender, true)
    
    if (!user.lastclaim) user.lastclaim = 0

    const fkontak = {
      key: {
        participants: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
        fromMe: false,
        id: "Halo"
      },
      message: {
        contactMessage: {
          displayName: '💸 𝐏𝐀𝐆𝐇𝐄𝐓𝐓𝐀 💸',
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
        }
      },
      participant: "0@s.whatsapp.net"
    }

    let currentTime = new Date()
    let timePassed = currentTime - user.lastclaim

    if (timePassed < 24 * 60 * 60 * 1000) {
      let remainingTime = 24 * 60 * 60 * 1000 - timePassed
      let remainingTimeString = msToTime(remainingTime)
      
      return await conn.sendMessage(m.chat, {
        text: `╔═══════════════╗
║ ⏳ 𝐏𝐀𝐆𝐇𝐄𝐓𝐓𝐀 𝐍𝐎𝐍 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐈𝐋𝐄 ⏳
╚═══════════════╝

𝐃𝐞𝐯𝐢 𝐚𝐬𝐩𝐞𝐭𝐭𝐚𝐫𝐞 𝐚𝐧𝐜𝐨𝐫𝐚 *${remainingTimeString}* ⏳ 𝐩𝐫𝐢𝐦𝐚 𝐝𝐢 𝐩𝐨𝐭𝐞𝐫𝐥𝐚 𝐫𝐢𝐜𝐡𝐢𝐞𝐝𝐞𝐫𝐞 𝐧𝐮𝐨𝐯𝐚𝐦𝐞𝐧𝐭𝐞!`
      }, { quoted: fkontak })
    }

    let moneyToAdd = 500
    user.bank = (parseInt(user.bank) || 0) + moneyToAdd
    user.lastclaim = currentTime
    forceSave()

    let text = `
╔══════════════════╗
║ 💰 𝐏𝐀𝐆𝐇𝐄𝐓𝐓𝐀 𝐂𝐎𝐍𝐅𝐄𝐑𝐌𝐀𝐓𝐀 💰
╚══════════════════╝

🎉 𝐂𝐨𝐦𝐩𝐥𝐢𝐦𝐞𝐧𝐭𝐢! 𝐇𝐚𝐢 𝐫𝐢𝐜𝐞𝐯𝐮𝐭𝐨 *${moneyToAdd} €* 𝐝𝐢𝐫𝐞𝐭𝐭𝐚𝐦𝐞𝐧𝐭𝐞 𝐧𝐞𝐥 𝐭𝐮𝐨 𝐜𝐨𝐧𝐭𝐨 𝐛𝐚𝐧𝐜𝐚𝐫𝐢𝐨.

💼 𝐂𝐨𝐧𝐭𝐢𝐧𝐮𝐚 𝐜𝐨𝐬𝐢̀, 𝐢𝐥 𝐬𝐮𝐜𝐜𝐞𝐬𝐬𝐨 𝐞̀ 𝐧𝐞𝐥𝐥𝐞 𝐭𝐮𝐞 𝐦𝐚𝐧𝐢!

╔════════════════════╗
║ 🏦 𝐒𝐚𝐥𝐝𝐨 𝐁𝐚𝐧𝐜𝐚𝐫𝐢𝐨: ${user.bank} €
║ 👛 𝐂𝐨𝐧𝐭𝐚𝐧𝐭𝐢 𝐚 𝐝𝐢𝐬𝐩𝐨𝐬𝐢𝐳𝐢𝐨𝐧𝐞: ${user.money || 0} €
╚════════════════════╝
`

    await conn.sendMessage(m.chat, {
      text: text.trim()
    }, { quoted: fkontak })
  }
}