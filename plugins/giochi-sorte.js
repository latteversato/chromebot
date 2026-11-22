// sorte.js - Gioco Testa o Croce con puntate per Chrome Bot
import { getUser, forceSave } from '../database.js'

export default {
  command: ['sorte'],
  
  async execute(m, { conn, args, command }) {
    const user = getUser(m.sender, true)
    if (!user.money) user.money = 0
    
    const botName = '𝗖𝗛𝗥𝗢𝗠𝗘 𝗕𝗢𝗧'
    const scelte = ['Testa', 'Croce']
    const usedPrefix = global.prefissoComandi

    // ───── STEP 1: scelta puntata ─────
    if (!args[0]) {
      const text = `
╭━━━━━━━━━╮
┃   🪙  𝗦𝗢𝗥𝗧𝗘    ┃
╰━━━━━━━━━╯

💰  𝗦𝗔𝗟𝗗𝗢  ➤  ${user.money.toLocaleString()} €

📊  𝗦𝗖𝗘𝗚𝗟𝗜  𝗟𝗔  𝗣𝗨𝗡𝗧𝗔𝗧𝗔:
`

      const buttons = [
        { buttonId: `${usedPrefix}sorte puntata 50`, buttonText: { displayText: '💵  50 €' }, type: 1 },
        { buttonId: `${usedPrefix}sorte puntata 500`, buttonText: { displayText: '💵  500 €' }, type: 1 },
        { buttonId: `${usedPrefix}sorte puntata 5000`, buttonText: { displayText: '💵  5.000 €' }, type: 1 },
        { buttonId: `${usedPrefix}sorte puntata 50000`, buttonText: { displayText: '💵  50.000 €' }, type: 1 },
        { buttonId: `${usedPrefix}sorte puntata 500000`, buttonText: { displayText: '💵  500.000 €' }, type: 1 },
        { buttonId: `${usedPrefix}sorte puntata 1000000`, buttonText: { displayText: '💵  1.000.000 €' }, type: 1 },
      ]

      return conn.sendMessage(m.chat, {
        text: text.trim(),
        footer: botName,
        buttons,
        headerType: 1
      }, { quoted: m })
    }

    // ───── STEP 2: conferma puntata ─────
    if (args[0] === 'puntata') {
      const puntata = parseInt(args[1])
      
      if (isNaN(puntata) || puntata <= 0) {
        return conn.sendMessage(m.chat, { 
          text: '❌  𝗣𝗨𝗡𝗧𝗔𝗧𝗔  𝗡𝗢𝗡  𝗩𝗔𝗟𝗜𝗗𝗔' 
        }, { quoted: m })
      }
      
      if (puntata > user.money) {
        return conn.sendMessage(m.chat, { 
          text: `
╭━━━━━━━━━━━━━━━━╮
┃  ⚠️  𝗙𝗢𝗡𝗗𝗜  𝗜𝗡𝗦𝗨𝗙𝗙𝗜𝗖𝗜𝗘𝗡𝗧𝗜  ┃
╰━━━━━━━━━━━━━━━━╯

💰  𝗧𝗶  𝗺𝗮𝗻𝗰𝗮𝗻𝗼  ➤  ${(puntata - user.money).toLocaleString()} €
💳  𝗦𝗮𝗹𝗱𝗼  𝗮𝘁𝘁𝘂𝗮𝗹𝗲  ➤  ${user.money.toLocaleString()} €
`.trim()
        }, { quoted: m })
      }

      const text = `
╭━━━━━━━━━╮
┃   🪙  𝗦𝗢𝗥𝗧𝗘    ┃
╰━━━━━━━━━╯

🎯  𝗣𝗨𝗡𝗧𝗔𝗧𝗔  ➤  ${puntata.toLocaleString()} €

🪙  𝗦𝗖𝗘𝗚𝗟𝗜  𝗟'𝗘𝗦𝗜𝗧𝗢:
`

      const buttons = [
        { buttonId: `${usedPrefix}sorte gioca testa ${puntata}`, buttonText: { displayText: '⭕  Testa' }, type: 1 },
        { buttonId: `${usedPrefix}sorte gioca croce ${puntata}`, buttonText: { displayText: '❌  Croce' }, type: 1 },
        { buttonId: `${usedPrefix}sorte`, buttonText: { displayText: '⬅️  Cambia Puntata' }, type: 1 },
      ]

      return conn.sendMessage(m.chat, {
        text: text.trim(),
        footer: botName,
        buttons,
        headerType: 1
      }, { quoted: m })
    }

    // ───── STEP 3: risultato ─────
    if (args[0] === 'gioca') {
      const scelta = args[1]?.toLowerCase()
      const puntata = parseInt(args[2])
      
      // Aggiorna user nel caso sia cambiato
      const currentUser = getUser(m.sender, true)
      
      // Controllo puntata valida
      if (isNaN(puntata) || puntata <= 0) {
        return conn.sendMessage(m.chat, { 
          text: '❌  𝗣𝗨𝗡𝗧𝗔𝗧𝗔  𝗡𝗢𝗡  𝗩𝗔𝗟𝗜𝗗𝗔' 
        }, { quoted: m })
      }
      
      // Controllo fondi
      if (puntata > currentUser.money) {
        return conn.sendMessage(m.chat, { 
          text: `
╭━━━━━━━━━━━━━━━━╮
┃  ⚠️  𝗙𝗢𝗡𝗗𝗜  𝗜𝗡𝗦𝗨𝗙𝗙𝗜𝗖𝗜𝗘𝗡𝗧𝗜  ┃
╰━━━━━━━━━━━━━━━━╯

💰  𝗧𝗶  𝗺𝗮𝗻𝗰𝗮𝗻𝗼  ➤  ${(puntata - currentUser.money).toLocaleString()} €
💳  𝗦𝗮𝗹𝗱𝗼  𝗮𝘁𝘁𝘂𝗮𝗹𝗲  ➤  ${currentUser.money.toLocaleString()} €
      
🔙  𝗨𝘀𝗮  *${usedPrefix}sorte*  𝗽𝗲𝗿 𝘀𝗰𝗲𝗴𝗹𝗶𝗲𝗿𝗲 𝘂𝗻𝗮 𝗽𝘂𝗻𝘁𝗮𝘁𝗮 𝘃𝗮𝗹𝗶𝗱𝗮
`.trim()
        }, { quoted: m })
      }
      
      if (!scelte.some(s => s.toLowerCase() === scelta)) {
        return conn.sendMessage(m.chat, { 
          text: '❌  𝗦𝗖𝗘𝗟𝗧𝗔  𝗡𝗢𝗡  𝗩𝗔𝗟𝗜𝗗𝗔! 𝗨𝘀𝗮 "𝗧𝗲𝘀𝘁𝗮" 𝗼 "𝗖𝗿𝗼𝗰𝗲"' 
        }, { quoted: m })
      }

      const risultato = scelte[Math.floor(Math.random() * scelte.length)]
      const win = scelta === risultato.toLowerCase()
      
      let text = `
╭━━━━━━━━━━━╮
┃   🎲  𝗥𝗜𝗦𝗨𝗟𝗧𝗔𝗧𝗢   ┃
╰━━━━━━━━━━━╯

📌  𝗧𝗨𝗔  𝗦𝗖𝗘𝗟𝗧𝗔  ➤  ${scelta.toUpperCase()}
🎯  𝗘𝗦𝗜𝗧𝗢  𝗨𝗦𝗖𝗜𝗧𝗢  ➤  ${risultato.toUpperCase()}
`

      if (win) {
        const vincita = puntata * 2
        currentUser.money = (parseInt(currentUser.money) || 0) + vincita
        forceSave()
        text += `
╭━━━━━━━━━━━╮
┃   🎉  𝗛𝗔𝗜  𝗩𝗜𝗡𝗧𝗢!  ┃
╰━━━━━━━━━━━╯

💰  𝗩𝗜𝗡𝗖𝗜𝗧𝗔  ➤  +${vincita.toLocaleString()} €
`
      } else {
        currentUser.money = Math.max(0, (parseInt(currentUser.money) || 0) - puntata)
        forceSave()
        text += `
╭━━━━━━━━━━━╮
┃  💀  𝗛𝗔𝗜  𝗣𝗘𝗥𝗦𝗢!  ┃
╰━━━━━━━━━━━╯

💸  𝗣𝗘𝗥𝗗𝗜𝗧𝗔  ➤  -${puntata.toLocaleString()} €
`
      }

      text += `
━━━━━━━━━━━━━━
💳  𝗦𝗔𝗟𝗗𝗢  𝗔𝗧𝗧𝗨𝗔𝗟𝗘  ➤  ${currentUser.money.toLocaleString()} €
━━━━━━━━━━━━━━
`

      let buttons = []
      
      if (currentUser.money > 0) {
        const nextPuntata = Math.min(puntata, currentUser.money)
        buttons = [
          { buttonId: `${usedPrefix}sorte gioca testa ${nextPuntata}`, buttonText: { displayText: '⭕  Gioca Testa' }, type: 1 },
          { buttonId: `${usedPrefix}sorte gioca croce ${nextPuntata}`, buttonText: { displayText: '❌  Gioca Croce' }, type: 1 },
          { buttonId: `${usedPrefix}sorte`, buttonText: { displayText: '💰  Cambia Puntata' }, type: 1 },
        ]
      } else {
        buttons = [
          { buttonId: `${usedPrefix}sorte`, buttonText: { displayText: '💸  Ricarica e Gioca' }, type: 1 },
        ]
      }

      return conn.sendMessage(m.chat, {
        text: text.trim(),
        footer: botName,
        buttons,
        headerType: 1
      }, { quoted: m })
    }
  }
}