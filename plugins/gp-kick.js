function toJid(input) {
  if (!input) return null
  input = input.toString().trim().toLowerCase()

  if (input.startsWith('@')) input = input.slice(1)

  if (input.endsWith('@s.whatsapp.net') || input.endsWith('@lid')) {
    const [user, domain] = input.split('@')
    return `${user.split(':')[0]}@${domain}`
  }

  const num = input.replace(/\D/g, '')
  return num.length >= 7 ? `${num}@s.whatsapp.net` : null
}

function extractTargets(m, mentionedJid) {
  const targets = []
  const contextInfo = m.message?.extendedTextMessage?.contextInfo

  if (contextInfo?.mentionedJid?.length) {
    targets.push(...contextInfo.mentionedJid)
  }

  if (mentionedJid?.length) {
    targets.push(...mentionedJid)
  }

  if (contextInfo?.participant) {
    targets.push(contextInfo.participant)
  }

  if (m.quoted?.participant) {
    targets.push(m.quoted.participant)
  }

  if (m.quoted?.sender) {
    targets.push(m.quoted.sender)
  }

  return [...new Set(targets.map(toJid).filter(Boolean))]
}

function resolveParticipant(jid, participants = []) {
  const clean = toJid(jid)
  if (!clean) return null

  const userPart = clean.split('@')[0]
  const found = participants.find(p =>
    [p.id, p.lid, p.jid, p.phoneNumber].some(id => {
      const cleanId = toJid(id)
      return cleanId === clean || cleanId?.split('@')[0] === userPart
    })
  )

  return found ? toJid(found.id) : clean
}

export default {
  command: ['kick'],
  admin: true,
  botAdmin: true,

  async execute(m, { conn, mentionedJid }) {
    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '❌ *Questo comando funziona solo nei gruppi.*'
      })
    }

    const targets = extractTargets(m, mentionedJid)

    if (!targets.length) {
      return conn.sendMessage(m.chat, {
        text: '❌ *Devi menzionare un utente o rispondere a un suo messaggio.*'
      }, { quoted: m })
    }

    const groupMetadata = await conn.groupMetadata(m.chat).catch(() => null)
    const participants = groupMetadata?.participants || []

    const userToKick = resolveParticipant(targets[0], participants)
    const senderJid = resolveParticipant(m.key?.participant || m.participant || m.sender, participants)
    const botJids = [conn.user?.id, conn.user?.jid, conn.user?.lid]
      .map(id => resolveParticipant(id, participants))
      .filter(Boolean)

    if (userToKick === senderJid) {
      return conn.sendMessage(m.chat, {
        text: '❌ *Non puoi rimuoverti da solo.*'
      }, { quoted: m })
    }

    if (botJids.includes(userToKick)) {
      return conn.sendMessage(m.chat, {
        text: '❌ *Non puoi rimuovere il bot.*'
      }, { quoted: m })
    }

    const senderNumber = senderJid.split('@')[0]
    const kickedNumber = userToKick.split('@')[0]

    await conn.groupParticipantsUpdate(m.chat, [userToKick], 'remove')

    await conn.sendMessage(m.chat, {
      text: `👢 @${senderNumber} ha rimosso @${kickedNumber} per probabile cospirazione contro Chrome Hearts.`,
      mentions: [senderJid, userToKick]
    })
  }
}