import { getUser, forceSave } from '../database.js'

export default {
  command: ['deposita', 'deposito'],
  
  async execute(m, { conn, text }) {
    const user = getUser(m.sender, true)
    const contanti = user.money || 0

    if (!text) {
      const buttons = [
        {
          buttonId: `${global.prefissoComandi}deposita tutto`,
          buttonText: { displayText: '🏦 𝐃𝐄𝐏𝐎𝐒𝐈𝐓𝐀 𝐓𝐔𝐓𝐓𝐎' },
          type: 1
        },
        {
          buttonId: `${global.prefissoComandi}deposita 500`,
          buttonText: { displayText: '💶 𝐃𝐄𝐏𝐎𝐒𝐈𝐓𝐀 𝟱𝟬𝟬€' },
          type: 1
        },
        {
          buttonId: `${global.prefissoComandi}deposita 1000`,
          buttonText: { displayText: '💶 𝐃𝐄𝐏𝐎𝐒𝐈𝐓𝐀 𝟭𝟬𝟬𝟬€' },
          type: 1
        },
        {
          buttonId: `${global.prefissoComandi}deposita custom`,
          buttonText: { displayText: '✍️ 𝐈𝐍𝐒𝐄𝐑𝐈𝐒𝐂𝐈 𝐈𝐌𝐏𝐎𝐑𝐓𝐎' },
          type: 1
        }
      ]

      const menuText = `╭━━━「 🏦 𝐃𝐄𝐏𝐎𝐒𝐈𝐓𝐎 𝐁𝐀𝐍𝐂𝐀 」━━━╮
┃
┃ 💰 𝐂𝐨𝐧𝐭𝐚𝐧𝐭𝐢 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐢: *${contanti}€*
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
        text: `✍️ *𝐈𝐧𝐬𝐞𝐫𝐢𝐬𝐜𝐢 𝐥'𝐢𝐦𝐩𝐨𝐫𝐭𝐨*\n\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨:\n${global.prefissoComandi}deposita 250`
      }, { quoted: m })
    }

    let deposito

    if (/^tutto$/i.test(text)) {
      deposito = contanti
      if (deposito <= 0) {
        return conn.sendMessage(m.chat, {
          text: '❌ *𝐍𝐨𝐧 𝐡𝐚𝐢 𝐜𝐨𝐧𝐭𝐚𝐧𝐭𝐢 𝐝𝐚 𝐝𝐞𝐩𝐨𝐬𝐢𝐭𝐚𝐫𝐞*'
        }, { quoted: m })
      }
    } else {
      deposito = parseInt(text)
      if (isNaN(deposito) || deposito <= 0) {
        return conn.sendMessage(m.chat, {
          text: `❌ *"${text}" 𝐧𝐨𝐧 𝐞̀ 𝐮𝐧 𝐢𝐦𝐩𝐨𝐫𝐭𝐨 𝐯𝐚𝐥𝐢𝐝𝐨*`
        }, { quoted: m })
      }
      if (deposito > contanti) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐂𝐨𝐧𝐭𝐚𝐧𝐭𝐢 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭𝐢*\n𝐃𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐢: ${contanti}€`
        }, { quoted: m })
      }
    }

    user.bank = (parseInt(user.bank) || 0) + deposito
    user.money = (parseInt(user.money) || 0) - deposito
    user.ultimodeposito = deposito
    user.depositi = (parseInt(user.depositi) || 0) + deposito
    forceSave()

    const risultato = `╭━━━「 ✅ 𝐃𝐄𝐏𝐎𝐒𝐈𝐓𝐎 𝐄𝐅𝐅𝐄𝐓𝐓𝐔𝐀𝐓𝐎 」━━━╮
┃
┃ 💰 𝐈𝐦𝐩𝐨𝐫𝐭𝐨: *${deposito}€*
┃
┃ 🏦 𝐍𝐮𝐨𝐯𝐨 𝐬𝐚𝐥𝐝𝐨 𝐛𝐚𝐧𝐜𝐚: ${user.bank}€
┃ 👛 𝐂𝐨𝐧𝐭𝐚𝐧𝐭𝐢 𝐫𝐢𝐦𝐚𝐬𝐭𝐢: ${user.money}€
┃
╰━━━━━━━━━━━━━━━━━━╯`

    await conn.sendMessage(m.chat, {
      text: risultato
    }, { quoted: m })
  }
}