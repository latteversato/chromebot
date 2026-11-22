import { getUser, forceSave } from '../database.js'

function toJid(input) {
  if (!input) return null
  input = input.toString().trim().toLowerCase()

  if (input.startsWith('@')) input = input.slice(1)
  if (input.endsWith('@s.whatsapp.net')) return input

  const num = input.replace(/\D/g, '')
  return num.length >= 10 ? `${num}@s.whatsapp.net` : null
}

function extractTargets(m, mentionedJid) {
  let targets = []

  if (mentionedJid?.length) {
    targets.push(...mentionedJid)
  }

  if (m.quoted?.sender) {
    targets.push(m.quoted.sender)
  }

  if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
    targets.push(...m.message.extendedTextMessage.contextInfo.mentionedJid)
  }

  return [...new Set(targets.map(toJid).filter(Boolean))]
}

function formatMoney(amount) {
  if (amount === Infinity || amount === 'Infinity') return '∞'
  if (isNaN(amount) || amount === null || amount === undefined) return '0€'
  return amount + '€'
}

export default {
  command: ['azzeramoney', 'addmoney', 'removemoney', 'setmoney'],
  owner: true,
  
  async execute(m, { conn, command, text, mentionedJid }) {
    const targets = extractTargets(m, mentionedJid)
    let mention = targets[0] || m.quoted?.sender
    
    if (!mention) {
      return conn.sendMessage(m.chat, {
        text: '❌ Devi menzionare un utente o rispondere al suo messaggio'
      }, { quoted: m })
    }

    mention = toJid(mention)
    if (!mention) {
      return conn.sendMessage(m.chat, {
        text: '❌ JID non valido'
      }, { quoted: m })
    }

    const user = getUser(mention, true)
    
    const cleanText = text.replace(/@\d+/g, '').trim().toLowerCase()
    let amount
    
    if (cleanText === 'infinity' || cleanText === '∞' || cleanText === 'infinito' || cleanText === 'illimitato') {
      amount = 'Infinity'
    } else {
      amount = parseInt(cleanText) || 0
    }
    
    const mentionTag = `@${mention.split('@')[0]}`

    if (command === 'azzeramoney') {
      user.money = 0
      forceSave()
      
      return conn.sendMessage(m.chat, {
        text: `╭━━━「 ✅ SALDO AZZERATO 」━━━╮
┃
┃ 👤 ${mentionTag}
┃ 💳 Nuovo saldo: 0€
┃
╰━━━━━━━━━━━━━━━━━━╯`,
        mentions: [mention]
      }, { quoted: m })
    }

    if (command === 'setmoney') {
      if (!amount && amount !== 'Infinity') {
        return conn.sendMessage(m.chat, {
          text: '❌ Inserisci un importo valido o "infinity"\n\nEsempio: .setmoney @utente 1000\nOppure: .setmoney @utente infinity'
        }, { quoted: m })
      }

      user.money = amount
      forceSave()

      return conn.sendMessage(m.chat, {
        text: `╭━━━「 ✅ SALDO IMPOSTATO 」━━━╮
┃
┃ 👤 ${mentionTag}
┃ 💳 Nuovo saldo: ${formatMoney(user.money)}
┃
╰━━━━━━━━━━━━━━━━━━╯`,
        mentions: [mention]
      }, { quoted: m })
    }

    if (command === 'addmoney') {
      if ((!amount && amount !== 'Infinity') || amount === 0) {
        return conn.sendMessage(m.chat, {
          text: '❌ Inserisci un importo valido o "infinity"\n\nEsempio: .addmoney @utente 1000\nOppure: .addmoney @utente infinity'
        }, { quoted: m })
      }

      if (amount === 'Infinity') {
        user.money = 'Infinity'
      } else {
        if (user.money === 'Infinity') {
          user.money = 'Infinity'
        } else {
          const currentMoney = parseInt(user.money) || 0
          user.money = currentMoney + amount
        }
      }
      
      forceSave()

      return conn.sendMessage(m.chat, {
        text: `╭━━━「 ✅ MONEY AGGIUNTA 」━━━╮
┃
┃ 👤 ${mentionTag}
┃ 💰 +${amount === 'Infinity' ? '∞' : amount + '€'}
┃ 💳 Nuovo saldo: ${formatMoney(user.money)}
┃
╰━━━━━━━━━━━━━━━━━━╯`,
        mentions: [mention]
      }, { quoted: m })
    }

    if (command === 'removemoney') {
      if (!amount || amount <= 0) {
        return conn.sendMessage(m.chat, {
          text: '❌ Inserisci un importo valido\n\nEsempio: .removemoney @utente 500'
        }, { quoted: m })
      }

      if (user.money === 'Infinity') {
        return conn.sendMessage(m.chat, {
          text: `╭━━━「 ⚠️ OPERAZIONE NON POSSIBILE 」━━━╮
┃
┃ 👤 ${mentionTag}
┃ 💳 L'utente ha soldi infiniti
┃ 📝 Usa .setmoney per modificare
┃
╰━━━━━━━━━━━━━━━━━━╯`,
          mentions: [mention]
        }, { quoted: m })
      }

      const currentMoney = parseInt(user.money) || 0
      
      if (amount > currentMoney) {
        user.money = 0
      } else {
        user.money = currentMoney - amount
      }
      
      forceSave()

      return conn.sendMessage(m.chat, {
        text: `╭━━━「 ✅ MONEY RIMOSSA 」━━━╮
┃
┃ 👤 ${mentionTag}
┃ 💰 -${amount}€
┃ 💳 Nuovo saldo: ${formatMoney(user.money)}
┃
╰━━━━━━━━━━━━━━━━━━╯`,
        mentions: [mention]
      }, { quoted: m })
    }
  }
}