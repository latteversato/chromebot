import path from 'path'
import fs from 'fs'

async function checkIsBotOwner(jid) {
  if (!jid) return false
  const num = jid.split('@')[0]

  if (global.owner) {
    const isGlobalOwner = global.owner.some(o => {
      const oId = Array.isArray(o) ? o[0] : o
      return oId.toString() === num || oId.toString() + '@s.whatsapp.net' === jid
    })
    if (isGlobalOwner) return true
  }

  try {
    const ruoliPath = path.join(process.cwd(), 'ruoli.js')
    if (fs.existsSync(ruoliPath)) {
      const ruoli = await import(`file://${ruoliPath}?update=${Date.now()}`)
      const owners = [
        ...(ruoli.owner || []),
        ...(ruoli.rowner || []),
        ...(Array.isArray(ruoli.default) ? ruoli.default : [])
      ].map(o => (Array.isArray(o) ? o[0] : o).toString())
      if (owners.includes(num)) return true
    }
  } catch (e) {}

  return false
}

export default {
  command: ['nuke'],
  admin: true,
  botAdmin: true,

  async execute(m, { conn, isOwner, text }) {
    if (!m.isGroup) return conn.sendMessage(m.chat, {
      text: '❌ Comando utilizzabile solo nei gruppi.'
    }, { quoted: m })

    const sender = m.sender
    const isSenderOwner = await checkIsBotOwner(sender) || isOwner

    const groupMetadata = await conn.groupMetadata(m.chat).catch(() => ({}))
    const participants = groupMetadata?.participants || []
    const senderInGroup = participants.find(u => u.id === sender)

    if (!isSenderOwner && senderInGroup?.admin !== 'superadmin') {
      return conn.sendMessage(m.chat, {
        text: '❌ Solo il creatore del gruppo o un owner del bot può usare questo comando.'
      }, { quoted: m })
    }

    const link = text.trim()
    if (!link || !link.includes('chat.whatsapp.com')) {
      return conn.sendMessage(m.chat, {
        text: `❌ Uso: .nuke <link del nuovo gruppo>\n\nEsempio:\n.nuke https://chat.whatsapp.com/XXXXXXXXXX`
      }, { quoted: m })
    }

    const allMentions = participants.map(p => p.id)

    await conn.sendMessage(m.chat, {
      text: `📢 *Il gruppo si trasferisce!*\n\nEntra nel nuovo gruppo qui:\n${link}\n\nGrazie a tutti, ci vediamo di là! 👋`,
      mentions: allMentions
    })

    await new Promise(r => setTimeout(r, 5000))

    const botJid = conn.user?.jid || conn.decodeJid(conn.user.id)
    const toRemove = participants
      .map(p => p.id)
      .filter(id => id !== sender && id !== botJid)

    if (toRemove.length) {
      await conn.groupParticipantsUpdate(m.chat, toRemove, 'remove').catch(async (e) => {
        for (const id of toRemove) {
          await conn.groupParticipantsUpdate(m.chat, [id], 'remove').catch(() => {})
        }
      })
    }

    return conn.sendMessage(m.chat, {
      text: `✅ Gruppo svuotato. Tutti i membri sono stati rimossi tranne te e il bot.`
    }, { quoted: m })
  }
}