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

const MAX_WARN = 3

export default {
  command: ['warn', 'unwarn'],
  group: true,
  botAdmin: true,
  bis: true,
  
  async execute(m, { conn, command, text, mentionedJid, isAdmin }) {
    const targets = extractTargets(m, mentionedJid)

    if (!targets.length) {
      return conn.sendMessage(m.chat, { 
        text: '❌ *Devi menzionare un utente*' 
      }, { quoted: m })
    }

    const who = targets[0]

    if (who === toJid(conn.user?.jid)) {
      return conn.sendMessage(m.chat, {
        text: '❌ Non puoi warnare il bot'
      }, { quoted: m })
    }

    const user = getUser(who, true)
    if (!user.warn) user.warn = 0

    const mention = `@${who.split('@')[0]}`
    
    if (command === 'warn') {
      let motivo = text.replace(/@\d+/g, '').trim()
      motivo = motivo || '-'
      
      user.warn += 1
      if (!user.warnMotivi) user.warnMotivi = []
      user.warnMotivi.push({
        motivo: motivo,
        data: new Date().toLocaleString('it-IT'),
        admin: m.sender
      })
      forceSave()
      
      await conn.sendMessage(m.chat, {
        text: `⚠️ *Warn ${user.warn}/${MAX_WARN}*\n\n👤 ${mention}\n📝 Motivo: ${motivo}`,
        mentions: [who]
      }, { quoted: m })
      
      if (user.warn >= MAX_WARN) {
        let motivoList = user.warnMotivi.map((w, i) => 
          `${i+1}. ${w.motivo} (${w.data})`
        ).join('\n')
        
        if (isAdmin) {
          await conn.groupParticipantsUpdate(m.chat, [who], 'remove')
          await conn.sendMessage(m.chat, {
            text: `⛔ *Utente espulso*\n\n👤 ${mention}\n📋 *Motivi warn:*\n${motivoList}`,
            mentions: [who]
          }, { quoted: m })
        } else {
          await conn.sendMessage(m.chat, {
            text: `👮 *Richiesto intervento admin*\n\n👤 ${mention} ha raggiunto ${MAX_WARN} warn\n📋 *Motivi:*\n${motivoList}`,
            mentions: [who]
          }, { quoted: m })
        }
        user.warn = 0
        user.warnMotivi = []
        forceSave()
      }
    }
    
    if (command === 'unwarn') {
      if (user.warn === 0) {
        return conn.sendMessage(m.chat, {
          text: `✅ ${mention} non ha warn`,
          mentions: [who]
        }, { quoted: m })
      }
      
      const ultimoMotivo = user.warnMotivi?.pop()?.motivo || '-'
      user.warn -= 1
      forceSave()
      
      await conn.sendMessage(m.chat, {
        text: `✅ *Warn rimosso*\n\n👤 ${mention}\n📊 Warn attuali: ${user.warn}/${MAX_WARN}\n📝 Ultimo motivo rimosso: ${ultimoMotivo}`,
        mentions: [who]
      }, { quoted: m })
    }
  }
}
