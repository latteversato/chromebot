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

const adoptions = {}

export default {
  command: ['adotta', 'abbandona'],
  
  async execute(m, { conn, command, mentionedJid }) {
    const user = getUser(m.sender, true)
    const users = global.db.data.users
    const prefix = global.prefissoComandi

    if (command === 'adotta') {
      await handleAdotta(m, user, users, conn, mentionedJid)
    } else if (command === 'abbandona') {
      await handleAbbandona(m, user, users, conn, mentionedJid)
    }
  },

  async before(m, { conn }) {
    if (!m.text) return false
    
    const text = m.text.toLowerCase().trim()
    const sender = m.sender

    if (!adoptions[sender]) return false

    if (text === 'accetta' || text === 'accetto' || text === 'si' || text === 'sì') {
      const adoption = adoptions[sender]
      const fromUser = adoption.from
      const toUser = sender

      clearTimeout(adoption.timeout)

      const mittente = getUser(fromUser, true)
      const ricevente = getUser(toUser, true)

      if (!mittente.figli) mittente.figli = []
      if (!ricevente.genitori) ricevente.genitori = []

      mittente.figli.push(toUser)
      ricevente.genitori.push(fromUser)

      delete adoptions[fromUser]
      delete adoptions[toUser]

      forceSave()

      await conn.sendMessage(m.chat, {
        text: `👨‍👧‍👦 *ADOZIONE COMPLETATA!*\n\n👶 @${toUser.split('@')[0]} è stato adottato da @${fromUser.split('@')[0]}!`,
        mentions: [fromUser, toUser]
      }, { quoted: m })
      
      return true
    }

    if (text === 'rifiuta' || text === 'no' || text === 'rifiuto') {
      const adoption = adoptions[sender]
      const fromUser = adoption.from
      const toUser = sender

      clearTimeout(adoption.timeout)

      delete adoptions[fromUser]
      delete adoptions[toUser]

      await conn.sendMessage(m.chat, {
        text: `❌ @${toUser.split('@')[0]} ha rifiutato l'adozione.`,
        mentions: [fromUser, toUser]
      }, { quoted: m })
      
      return true
    }

    return false
  }
}

async function handleAdotta(m, user, users, conn, mentionedJid) {
  const targets = extractTargets(m, mentionedJid)

  if (!targets.length) {
    return conn.sendMessage(m.chat, { 
      text: `👶 *TAGGA LA PERSONA CHE VUOI ADOTTARE!*\nEsempio: .adotta @utente` 
    }, { quoted: m })
  }

  const mention = targets[0]

  if (mention === toJid(m.sender)) {
    return conn.sendMessage(m.chat, { 
      text: '🚫 Non puoi adottare te stesso!' 
    }, { quoted: m })
  }

  const destinatario = getUser(mention, true)

  if (!user.figli) user.figli = []
  if (!destinatario.genitori) destinatario.genitori = []

  if (user.figli.includes(mention)) {
    return conn.sendMessage(m.chat, { 
      text: `👨‍👧 Hai già adottato @${mention.split('@')[0]}!`,
      mentions: [mention]
    }, { quoted: m })
  }

  if (destinatario.genitori.includes(m.sender)) {
    return conn.sendMessage(m.chat, { 
      text: `👶 @${mention.split('@')[0]} è già tuo figlio!`,
      mentions: [mention]
    }, { quoted: m })
  }

  if (adoptions[m.sender] || adoptions[mention]) {
    return conn.sendMessage(m.chat, { 
      text: `⏳ Una richiesta di adozione è già in corso.` 
    }, { quoted: m })
  }

  adoptions[mention] = { from: m.sender, timeout: null }
  adoptions[m.sender] = { to: mention, timeout: null }

  const testo = `👨‍👧 *RICHIESTA DI ADOZIONE*\n\n`
              + `@${mention.split('@')[0]}, vuoi essere adottato/a da @${m.sender.split('@')[0]}?\n\n`
              + `⏳ *Hai 60 secondi per scegliere.*\n`
              + `📝 Scrivi *accetta* o *rifiuta*`

  await conn.sendMessage(m.chat, {
    text: testo,
    mentions: [mention, m.sender]
  }, { quoted: m })

  const timeoutCallback = () => {
    if (adoptions[mention]) {
      conn.sendMessage(m.chat, {
        text: `⏳ Richiesta di adozione annullata: @${m.sender.split('@')[0]} e @${mention.split('@')[0]} non hanno risposto in tempo.`,
        mentions: [m.sender, mention]
      }).catch(() => {})
      
      delete adoptions[mention]
      delete adoptions[m.sender]
    }
  }

  const timeoutId = setTimeout(timeoutCallback, 60000)
  if (adoptions[mention]) adoptions[mention].timeout = timeoutId
  if (adoptions[m.sender]) adoptions[m.sender].timeout = timeoutId
}

async function handleAbbandona(m, user, users, conn, mentionedJid) {
  const targets = extractTargets(m, mentionedJid)

  if (!targets.length) {
    return conn.sendMessage(m.chat, { 
      text: `⚠️ *TAGGA LA PERSONA DA ABBANDONARE!*\nEsempio: .abbandona @utente` 
    }, { quoted: m })
  }

  const mention = targets[0]

  const target = getUser(mention, false)
  if (!target) {
    return conn.sendMessage(m.chat, { 
      text: '❌ Utente non trovato.' 
    }, { quoted: m })
  }

  if (!user.figli) user.figli = []
  if (!target.genitori) target.genitori = []

  let relazione = false

  if (user.figli.includes(mention)) {
    user.figli = user.figli.filter(f => f !== mention)
    target.genitori = target.genitori.filter(g => g !== m.sender)
    relazione = true
  }

  if (!relazione) {
    return conn.sendMessage(m.chat, { 
      text: `❌ Non sei in una relazione di adozione con @${mention.split('@')[0]}!`,
      mentions: [mention]
    }, { quoted: m })
  }

  forceSave()

  await conn.sendMessage(m.chat, {
    text: `💔 @${m.sender.split('@')[0]} ha abbandonato @${mention.split('@')[0]}.`,
    mentions: [m.sender, mention]
  }, { quoted: m })
}