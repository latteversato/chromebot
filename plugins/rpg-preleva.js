import { getUser, forceSave } from '../database.js'

export default {
  command: ['preleva', 'withdraw'],
  
  async execute(m, { conn, text }) {
    const user = getUser(m.sender, true)
    const saldoBanca = user.bank || 0

    if (!text) {
      const buttons = [
        {
          buttonId: `${global.prefissoComandi}preleva tutto`,
          buttonText: { displayText: '🏦 𝐏𝐑𝐄𝐋𝐄𝐕𝐀 𝐓𝐔𝐓𝐓𝐎' },
          type: 1
        },
        {
          buttonId: `${global.prefissoComandi}preleva 500`,
          buttonText: { displayText: '💶 𝐏𝐑𝐄𝐋𝐄𝐕𝐀 𝟱𝟬𝟬€' },
          type: 1
        },
        {
          buttonId: `${global.prefissoComandi}preleva 1000`,
          buttonText: { displayText: '💶 𝐏𝐑𝐄𝐋𝐄𝐕𝐀 𝟭𝟬𝟬𝟬€' },
          type: 1
        },
        {
          buttonId: `${global.prefissoComandi}preleva custom`,
          buttonText: { displayText: '✍️ 𝐈𝐍𝐒𝐄𝐑𝐈𝐒𝐂𝐈 𝐈𝐌𝐏𝐎𝐑𝐓𝐎' },
          type: 1
        }
      ]

      const menuText = `╭━━━「 🏦 𝐏𝐑𝐄𝐋𝐄𝐕𝐎 𝐁𝐀𝐍𝐂𝐀 」━━━╮
┃
┃ 💰 𝐒𝐚𝐥𝐝𝐨 𝐢𝐧 𝐛𝐚𝐧𝐜𝐚: *${saldoBanca}€*
┃
┃ 𝐒𝐜𝐞𝐠𝐥𝐢 𝐮𝐧'𝐨𝐩𝐳𝐢𝐨𝐧𝐞:
┃
╰━━━━━━━━━━━━━━━━━━╯`

      return conn.sendMessage(m.chat, {
        text: menuText,
        footer: '𝐂𝐇𝐑𝐎𝐌𝐄 𝐁𝐀𝐍𝐊',
        buttons,
        headerType: 1
      }, { quoted: m })
    }

    if (/^custom$/i.test(text)) {
      return conn.sendMessage(m.chat, {
        text: `✍️ *𝐈𝐧𝐬𝐞𝐫𝐢𝐬𝐜𝐢 𝐥'𝐢𝐦𝐩𝐨𝐫𝐭𝐨*\n\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨:\n${global.prefissoComandi}preleva 250`
      }, { quoted: m })
    }

    let prelievo

    if (/^tutto$/i.test(text)) {
      prelievo = saldoBanca
      if (prelievo <= 0) {
        return conn.sendMessage(m.chat, {
          text: '❌ *𝐍𝐨𝐧 𝐡𝐚𝐢 𝐬𝐨𝐥𝐝𝐢 𝐢𝐧 𝐛𝐚𝐧𝐜𝐚*'
        }, { quoted: m })
      }
    } else {
      prelievo = parseInt(text)
      if (isNaN(prelievo) || prelievo <= 0) {
        return conn.sendMessage(m.chat, {
          text: `❌ *"${text}" 𝐧𝐨𝐧 è 𝐮𝐧 𝐢𝐦𝐩𝐨𝐫𝐭𝐨 𝐯𝐚𝐥𝐢𝐝𝐨*`
        }, { quoted: m })
      }
      if (prelievo > saldoBanca) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐒𝐚𝐥𝐝𝐨 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭𝐞*\n𝐃𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐞: ${saldoBanca}€`
        }, { quoted: m })
      }
    }

    user.bank = (parseInt(user.bank) || 0) - prelievo
    user.money = (parseInt(user.money) || 0) + prelievo
    user.ultimoprelievo = prelievo
    user.prelievi = (parseInt(user.prelievi) || 0) + prelievo
    forceSave()

    const risultato = `╭━━━「 ✅ 𝐏𝐑𝐄𝐋𝐄𝐕𝐎 𝐄𝐅𝐅𝐄𝐓𝐓𝐔𝐀𝐓𝐎 」━━━╮
┃
┃ 💸 𝐈𝐦𝐩𝐨𝐫𝐭𝐨: *${prelievo}€*
┃
┃ 💼 𝐍𝐮𝐨𝐯𝐨 𝐬𝐚𝐥𝐝𝐨 𝐛𝐚𝐧𝐜𝐚: ${user.bank}€
┃ 👛 𝐂𝐨𝐧𝐭𝐚𝐧𝐭𝐢 𝐨𝐫𝐚: ${user.money}€
┃
╰━━━━━━━━━━━━━━━━━━╯`

    await conn.sendMessage(m.chat, {
      text: risultato
    }, { quoted: m })
  }
}