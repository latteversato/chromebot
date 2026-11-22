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
  command: ['richieste'],
  group: true,
  admin: true,
  botAdmin: true,
  
  async execute(m, { conn, args, usedPrefix, command }) {
    const groupId = m.chat
    const prefisso = getPrefisso()
    
    const pending = await conn.groupRequestParticipantsList(groupId)
    
    if (!pending.length) {
      return conn.sendMessage(m.chat, { 
        text: "✅ Nessuna richiesta in sospeso." 
      }, { quoted: m })
    }

    if (!args[0]) {
      const testo = `📨 *RICHIESTE IN SOSPESO:* ${pending.length}`

      const bottoni = [
        {
          buttonId: `${prefisso}${command} accetta`,
          buttonText: { displayText: "✅ Accetta tutte" },
          type: 1
        },
        {
          buttonId: `${prefisso}${command} rifiuta`,
          buttonText: { displayText: "❌ Rifiuta tutte" },
          type: 1
        },
        {
          buttonId: `${prefisso}${command} accetta 50`,
          buttonText: { displayText: "🔢 Accetta 50" },
          type: 1
        },
        {
          buttonId: `${prefisso}${command} accetta 100`,
          buttonText: { displayText: "🔢 Accetta 100" },
          type: 1
        },
        {
          buttonId: `${prefisso}${command} accetta 200`,
          buttonText: { displayText: "🔢 Accetta 200" },
          type: 1
        }
      ]

      return conn.sendMessage(m.chat, {
        text: testo,
        buttons: bottoni,
        headerType: 1,
        footer: `Puoi anche scrivere: ${prefisso}${command} accetta <numero>`
      }, { quoted: m })
    }

    if (args[0] === 'accetta') {
      if (args[1]) {
        const numero = parseInt(args[1])
        if (isNaN(numero) || numero <= 0) {
          return conn.sendMessage(m.chat, { 
            text: "❌ Numero non valido. Usa un numero maggiore di 0." 
          }, { quoted: m })
        }
        
        const daAccettare = pending.slice(0, numero)
        let accettati = 0
        try {
          const jidList = daAccettare.map(p => p.jid)
          await conn.groupRequestParticipantsUpdate(groupId, jidList, 'approve')
          accettati = jidList.length
        } catch {}
        return conn.sendMessage(m.chat, { 
          text: `✅ Accettate ${accettati} richieste su ${numero}.` 
        }, { quoted: m })
      } else {
        let accettati = 0
        try {
          const jidList = pending.map(p => p.jid)
          await conn.groupRequestParticipantsUpdate(groupId, jidList, 'approve')
          accettati = jidList.length
        } catch {}
        return conn.sendMessage(m.chat, { 
          text: `✅ Accettate tutte le ${accettati} richieste.` 
        }, { quoted: m })
      }
    }

    if (args[0] === 'rifiuta') {
      let rifiutati = 0
      try {
        const jidList = pending.map(p => p.jid)
        await conn.groupRequestParticipantsUpdate(groupId, jidList, 'reject')
        rifiutati = jidList.length
      } catch {}
      return conn.sendMessage(m.chat, { 
        text: `❌ Rifiutate tutte le ${rifiutati} richieste.` 
      }, { quoted: m })
    }
  }
}