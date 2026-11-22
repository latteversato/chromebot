import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

export default {
  command: ['p', 'r'],
  group: true,
  admin: true,
  botAdmin: true,
  wl: true,
  
  async execute(m, { conn, mentionedJid, args, command }) {
    if (!m.isGroup) return

    const sender = m.sender.replace(/@c\.us$/, '@s.whatsapp.net').toLowerCase()
    const groupId = m.chat

    if (command === 'p') {
      const targets = extractTargets(m, mentionedJid)
      if (!targets.length) {
        return conn.sendMessage(m.chat, {
          text: '❌ *𝐃𝐞𝐯𝐢 𝐦𝐞𝐧𝐳𝐢𝐨𝐧𝐚𝐫𝐞 𝐮𝐧 𝐮𝐭𝐞𝐧𝐭𝐞*'
        }, { quoted: m })
      }

      for (const user of targets) {
        await conn.groupParticipantsUpdate(groupId, [user], 'promote')
      }
    }

    if (command === 'r') {
      const targets = extractTargets(m, mentionedJid)
      if (!targets.length) {
        return conn.sendMessage(m.chat, {
          text: '❌ *𝐃𝐞𝐯𝐢 𝐦𝐞𝐧𝐳𝐢𝐨𝐧𝐚𝐫𝐞 𝐮𝐧 𝐮𝐭𝐞𝐧𝐭𝐞*'
        }, { quoted: m })
      }

      for (const user of targets) {
        await conn.groupParticipantsUpdate(groupId, [user], 'demote')
      }
    }
  }
}