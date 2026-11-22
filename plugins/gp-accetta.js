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
  if (mentionedJid?.length) targets.push(...mentionedJid)
  if (m.quoted?.sender) targets.push(m.quoted.sender)
  if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
    targets.push(...m.message.extendedTextMessage.contextInfo.mentionedJid)
  }
  return [...new Set(targets.map(toJid).filter(Boolean))]
}

const getPrefisso = () => global.prefissoComandi || '.'

export default {
  command: ['accetta'],
  group: true,
  admin: true,
  botAdmin: true,
  
  async execute(m, { conn }) {
    const groupId = m.chat
    const pending = await conn.groupRequestParticipantsList(groupId)
    if (!pending.length) return conn.sendMessage(m.chat, { text: "✅ Nessuna richiesta in sospeso." }, { quoted: m })
    
    const jidList = pending.map(p => p.jid)
    await conn.groupRequestParticipantsUpdate(groupId, jidList, 'approve')
    conn.sendMessage(m.chat, { text: `✅ Accettate ${jidList.length} richieste.` }, { quoted: m })
  }
}