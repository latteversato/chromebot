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
  command: ['trava', 'travazzappo', 'crash'],
  
  async execute(m, { conn, mentionedJid, args }) {
    // Estrai i target esattamente come fa il comando .p
    const targets = extractTargets(m, mentionedJid)
    
    // Se non ci sono target, mostra errore come .p con font
    if (!targets.length) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐃𝐞𝐯𝐢 𝐦𝐞𝐧𝐳𝐢𝐨𝐧𝐚𝐫𝐞 𝐮𝐧 𝐮𝐭𝐞𝐧𝐭𝐞*'
      }, { quoted: m })
    }
    
    // Array con 5 messaggi diversi con font
    const messages = [
      '𝐦𝐨 𝐭𝐞 𝐭𝐫𝐚𝐯𝐚𝐳𝐳𝐚𝐩𝐩𝐨 𝐢𝐨 🫰🏻🫰🏻',
      '𝐬𝐞𝐢 𝐭𝐚𝐥𝐦𝐞𝐧𝐭𝐞 𝐬𝐟𝐢𝐠𝐚𝐭𝐨 𝐜𝐡𝐞 𝐦𝐨 𝐭𝐢 𝐦𝐚𝐧𝐝𝐨 𝐢𝐧 𝐩𝐞𝐫𝐦𝐚 𝐜𝐫𝐚𝐬𝐡 💀',
      '𝐢 𝐦𝐢𝐞𝐢 𝐭𝐫𝐚𝐯𝐚 𝐬𝐨𝐧𝐨 𝐩𝐞𝐠𝐠𝐢𝐨 𝐝𝐢 𝐠𝐨𝐫𝐥𝐨𝐜𝐤 🔥',
      '𝐨𝐩𝐬 𝐬𝐜𝐨𝐫𝐫𝐞𝐠𝐠𝐢𝐚 𝐩𝐨𝐭𝐞𝐧𝐭𝐞 💨',
      '𝐜𝐫𝐚𝐬𝐡𝐢𝐨𝐬? 𝐦𝐚 𝐬𝐞 𝐧𝐨𝐧 𝐡𝐚𝐢 𝐢𝐨𝐬? 𝐡𝐚𝐢 𝐥𝐚 𝐦𝐚𝐦𝐦𝐚 𝐭𝐫𝐨𝐢𝐚 🤡'
    ]
    
    // Crea i messaggi per ogni target
    for (const target of targets) {
      // Seleziona un messaggio casuale
      const randomMessage = messages[Math.floor(Math.random() * messages.length)]
      
      // Prepara il messaggio
      const targetNumber = target.split('@')[0]
      const senderNumber = m.sender?.split('@')[0] || 'qualcuno'
      
      let messageText = ''
      
      // Messaggio personalizzato se è per se stesso con font
      if (target === m.sender) {
        messageText = `@${targetNumber} 𝐭𝐢 𝐬𝐭𝐚𝐢 𝐩𝐞𝐫 𝐭𝐫𝐚𝐯𝐚𝐳𝐳𝐚𝐩𝐩𝐚𝐫𝐞 𝐝𝐚 𝐬𝐨𝐥𝐨/𝐚? 🫰🏻🫰🏻`
      } else {
        messageText = `@${targetNumber} ${randomMessage}`
      }
      
      await conn.sendMessage(m.chat, {
        text: messageText,
        mentions: [target]
      }, { quoted: m })
    }
  }
}