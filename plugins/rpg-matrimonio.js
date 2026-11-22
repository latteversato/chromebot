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

let proposals = {}

export default {
  command: ['sposa', 'divorzia'],
  group: true,
  
  async execute(m, { conn, command, mentionedJid }) {
    const user = getUser(m.sender, true)
    const users = global.db.data.users
    const prefix = global.prefissoComandi

    if (command === 'sposa') {
      await handleSposa(m, user, users, prefix, conn, mentionedJid)
    } else if (command === 'divorzia') {
      await handleDivorzia(m, user, users, conn)
    }
  },

  async before(m, { conn }) {
    if (!m.text) return false
    
    const text = m.text.toLowerCase().trim()
    const sender = m.sender

    if (!proposals[sender]) return false

    if (text === 'accetta' || text === 'accetto' || text === 'si' || text === 'sì') {
      const proposal = proposals[sender]
      const fromUser = proposal.from
      const toUser = sender

      clearTimeout(proposal.timeout)

      const mittente = getUser(fromUser, true)
      const ricevente = getUser(toUser, true)

      mittente.sposato = true
      mittente.coniuge = toUser
      ricevente.sposato = true
      ricevente.coniuge = fromUser
      forceSave()

      delete proposals[fromUser]
      delete proposals[toUser]

      await conn.sendMessage(m.chat, {
        text: `💍 *𝐌𝐀𝐓𝐑𝐈𝐌𝐎𝐍𝐈𝐎 𝐂𝐄𝐋𝐄𝐁𝐑𝐀𝐓𝐎!*\n\n👰 @${fromUser.split('@')[0]}\n🤵 @${toUser.split('@')[0]}\n\n💕 𝐅𝐢𝐧𝐜𝐡𝐞́ 𝐦𝐨𝐫𝐭𝐞 𝐧𝐨𝐧 𝐯𝐢 𝐬𝐞𝐩𝐚𝐫𝐢!`,
        mentions: [fromUser, toUser]
      }, { quoted: m })
      
      return true
    }

    if (text === 'rifiuta' || text === 'no' || text === 'rifiuto') {
      const proposal = proposals[sender]
      const fromUser = proposal.from
      const toUser = sender

      clearTimeout(proposal.timeout)

      delete proposals[fromUser]
      delete proposals[toUser]

      await conn.sendMessage(m.chat, {
        text: `❌ @${toUser.split('@')[0]} 𝐡𝐚 𝐫𝐢𝐟𝐢𝐮𝐭𝐚𝐭𝐨 𝐥𝐚 𝐩𝐫𝐨𝐩𝐨𝐬𝐭𝐚.`,
        mentions: [fromUser, toUser]
      }, { quoted: m })
      
      return true
    }

    return false
  }
}

async function handleSposa(m, user, users, prefix, conn, mentionedJid) {
  const targets = extractTargets(m, mentionedJid)
  
  if (!targets.length) {
    return conn.sendMessage(m.chat, {
      text: `💍 *𝐓𝐚𝐠𝐠𝐚 𝐥𝐚 𝐩𝐞𝐫𝐬𝐨𝐧𝐚 𝐝𝐚 𝐬𝐩𝐨𝐬𝐚𝐫𝐞!*\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨: ${prefix}sposa @utente`
    }, { quoted: m })
  }

  const mention = targets[0]
  
  if (mention === toJid(m.sender)) {
    return conn.sendMessage(m.chat, {
      text: '❌ *𝐍𝐨𝐧 𝐩𝐮𝐨𝐢 𝐬𝐩𝐨𝐬𝐚𝐫𝐭𝐢 𝐝𝐚 𝐬𝐨𝐥𝐨!*'
    }, { quoted: m })
  }

  let destinatario = getUser(mention, false)
  if (!destinatario) {
    return conn.sendMessage(m.chat, {
      text: '❌ *𝐔𝐭𝐞𝐧𝐭𝐞 𝐧𝐨𝐧 𝐭𝐫𝐨𝐯𝐚𝐭𝐨*'
    }, { quoted: m })
  }

  if (user.sposato) {
    return conn.sendMessage(m.chat, {
      text: `💔 𝐒𝐞𝐢 𝐠𝐢𝐚̀ 𝐬𝐩𝐨𝐬𝐚𝐭𝐨 𝐜𝐨𝐧 @${user.coniuge.split('@')[0]}!`,
      mentions: [user.coniuge]
    }, { quoted: m })
  }

  if (destinatario.sposato) {
    return conn.sendMessage(m.chat, {
      text: `💔 @${mention.split('@')[0]} 𝐞̀ 𝐠𝐢𝐚̀ 𝐬𝐩𝐨𝐬𝐚𝐭𝐨!`,
      mentions: [mention]
    }, { quoted: m })
  }

  if (proposals[m.sender] || proposals[mention]) {
    return conn.sendMessage(m.chat, {
      text: '⏳ *𝐔𝐧𝐚 𝐩𝐫𝐨𝐩𝐨𝐬𝐭𝐚 𝐞̀ 𝐠𝐢𝐚̀ 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨*'
    }, { quoted: m })
  }

  proposals[mention] = { from: m.sender, timeout: null }
  proposals[m.sender] = { to: mention, timeout: null }

  let testo = `💍 *𝐏𝐑𝐎𝐏𝐎𝐒𝐓𝐀 𝐃𝐈 𝐌𝐀𝐓𝐑𝐈𝐌𝐎𝐍𝐈𝐎*\n\n@${mention.split('@')[0]}, @${m.sender.split('@')[0]} 𝐯𝐮𝐨𝐥𝐞 𝐬𝐩𝐨𝐬𝐚𝐫𝐭𝐢!\n\n⏳ *𝐇𝐚𝐢 60 𝐬𝐞𝐜𝐨𝐧𝐝𝐢 𝐩𝐞𝐫 𝐫𝐢𝐬𝐩𝐨𝐧𝐝𝐞𝐫𝐞*\n📝 𝐒𝐜𝐫𝐢𝐯𝐢 *accetta* 𝐨 *rifiuta*`

  await conn.sendMessage(m.chat, {
    text: testo,
    mentions: [mention, m.sender]
  }, { quoted: m })

  let timeoutCallback = () => {
    if (proposals[mention]) {
      conn.sendMessage(m.chat, {
        text: `⏳ 𝐏𝐫𝐨𝐩𝐨𝐬𝐭𝐚 𝐚𝐧𝐧𝐮𝐥𝐥𝐚𝐭𝐚: @${m.sender.split('@')[0]} 𝐞 @${mention.split('@')[0]} 𝐧𝐨𝐧 𝐡𝐚𝐧𝐧𝐨 𝐫𝐢𝐬𝐩𝐨𝐬𝐭𝐨.`,
        mentions: [m.sender, mention]
      })
      delete proposals[mention]
      delete proposals[m.sender]
    }
  }

  proposals[mention].timeout = setTimeout(timeoutCallback, 60000)
  proposals[m.sender].timeout = proposals[mention].timeout
}

async function handleDivorzia(m, user, users, conn) {
  if (!user.sposato) {
    return conn.sendMessage(m.chat, {
      text: '💔 *𝐍𝐨𝐧 𝐬𝐞𝐢 𝐬𝐩𝐨𝐬𝐚𝐭𝐨!*'
    }, { quoted: m })
  }

  let exId = user.coniuge
  let ex = getUser(exId, true)

  if (!ex) {
    return conn.sendMessage(m.chat, {
      text: '❌ *𝐂𝐨𝐧𝐢𝐮𝐠𝐞 𝐧𝐨𝐧 𝐭𝐫𝐨𝐯𝐚𝐭𝐨*'
    }, { quoted: m })
  }

  if (!user.ex) user.ex = []
  if (!user.ex.includes(exId)) user.ex.push(exId)

  if (!ex.ex) ex.ex = []
  if (!ex.ex.includes(m.sender)) ex.ex.push(m.sender)

  user.sposato = false
  user.coniuge = ''
  ex.sposato = false
  ex.coniuge = ''
  
  forceSave()

  await conn.sendMessage(m.chat, {
    text: `💔 *𝐃𝐈𝐕𝐎𝐑𝐙𝐈𝐎 𝐂𝐎𝐍𝐅𝐄𝐑𝐌𝐀𝐓𝐎*\n\n@${m.sender.split('@')[0]} 𝐞 @${exId.split('@')[0]} 𝐧𝐨𝐧 𝐬𝐨𝐧𝐨 𝐩𝐢𝐮̀ 𝐬𝐩𝐨𝐬𝐢.`,
    mentions: [m.sender, exId]
  }, { quoted: m })
}