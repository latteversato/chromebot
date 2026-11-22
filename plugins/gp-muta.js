import { getUser, forceSave } from "../database.js"

function toJid(input) {
  if (!input) return null
  input = input.toString().trim().toLowerCase()
  if (input.startsWith('@')) input = input.slice(1)
  
  if (input.includes('@s.whatsapp.net') || input.includes('@g.us')) {
    return input
  }
  
  const num = input.replace(/\D/g, '')
  return num.length >= 10 ? `${num}@s.whatsapp.net` : null
}

function normalizeJid(jid) {
  if (!jid) return null
  const num = jid.split('@')[0].replace(/\D/g, '')
  return num
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

export default {
  command: ["muta", "smuta"],
  group: true,
  botAdmin: true,
  bis: true,

  async execute(m, { conn, command, mentionedJid }) {
    const chatId = m.chat
    const targets = extractTargets(m, mentionedJid)

    if (!targets.length) {
      return conn.sendMessage(chatId, {
        text: "❌ *Devi menzionare un utente o quotare un suo messaggio*"
      }, { quoted: m })
    }

    const target = targets[0]
    
    const meta = await conn.groupMetadata(chatId)
    const participants = meta.participants
    
    const targetNumber = normalizeJid(target)
    const ownerNumber = meta.owner ? normalizeJid(meta.owner) : null
    
    const targetParticipant = participants.find(p => {
      const participantNumber = normalizeJid(p.id)
      return participantNumber === targetNumber
    })
    
    const isAdmin = targetParticipant && 
      (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin')
    
    const isOwner = ownerNumber && targetNumber === ownerNumber
    const botNumber = normalizeJid(conn.user?.id)
    const isBot = targetNumber === botNumber

    if (isOwner) {
      return conn.sendMessage(chatId, { 
        text: "❌ Non puoi mutare il proprietario del gruppo." 
      }, { quoted: m })
    }

    if (isAdmin) {
      return conn.sendMessage(chatId, { 
        text: "❌ Non puoi mutare un amministratore del gruppo." 
      }, { quoted: m })
    }

    if (isBot) {
      return conn.sendMessage(chatId, { 
        text: "❌ Non puoi mutare il bot." 
      }, { quoted: m })
    }

    const user = getUser(target, true)
    const muted = user.muto === true

    if (command === "muta" && muted) {
      return conn.sendMessage(chatId, { 
        text: "❌ Questo utente è già mutato." 
      }, { quoted: m })
    }

    if (command === "smuta" && !muted) {
      return conn.sendMessage(chatId, { 
        text: "❌ Questo utente non è mutato." 
      }, { quoted: m })
    }

    user.muto = command === "muta"
    forceSave()

    const action = command === "muta" ? "mutato" : "smutato"
    const emoji = command === "muta" ? "🔇" : "🔊"
    const number = target.split("@")[0]

    await conn.sendMessage(chatId, {
      text: `${emoji} *Utente ${action}*\n\n👤 @${number}`,
      mentions: [target]
    }, { quoted: m })
  },

  async before(m, { conn, isBotAdmin }) {
    if (!m.isGroup || m.fromMe || !m.sender) return false

    const sender = toJid(m.sender)
    const user = getUser(sender)

    if (!user?.muto) return false
    if (!isBotAdmin) return true

    const meta = await conn.groupMetadata(m.chat).catch(() => null)
    if (meta) {
      const participants = meta.participants
      const senderNumber = normalizeJid(sender)
      const ownerNumber = meta.owner ? normalizeJid(meta.owner) : null
      
      const senderParticipant = participants.find(p => {
        const participantNumber = normalizeJid(p.id)
        return participantNumber === senderNumber
      })
      
      const isAdmin = senderParticipant && 
        (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin')
      
      if (isAdmin || senderNumber === ownerNumber) {
        return false
      }
    }

    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: m.key.id,
        participant: m.key.participant || sender
      }
    })

    return true
  }
}