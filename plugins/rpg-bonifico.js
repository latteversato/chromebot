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

let confirmation = {}

export default {
  command: ['trasferisci', 'bonifico'],
  
  async execute(m, { conn, args, usedPrefix, command, mentionedJid }) {
    const user = getUser(m.sender, true)
    
    if (confirmation[m.sender]) {
      return conn.sendMessage(m.chat, { 
        text: '❌ *𝐀𝐭𝐭𝐞𝐧𝐝𝐢 𝐢𝐥 𝐛𝐨𝐧𝐢𝐟𝐢𝐜𝐨 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨*',
        mentions: [m.sender]
      }, { quoted: m })
    }
    
    if (!args[0]) {
      return conn.sendMessage(m.chat, { 
        text: `❌ *𝐔𝐬𝐨 𝐜𝐨𝐫𝐫𝐞𝐭𝐭𝐨:* ${usedPrefix + command} 50 @utente` 
      }, { quoted: m })
    }
    
    const count = parseInt(args[0])
    if (isNaN(count) || count <= 0) {
      return conn.sendMessage(m.chat, { 
        text: '❌ *𝐈𝐦𝐩𝐨𝐫𝐭𝐨 𝐧𝐨𝐧 𝐯𝐚𝐥𝐢𝐝𝐨*' 
      }, { quoted: m })
    }

    const targets = extractTargets(m, mentionedJid)
    let who = targets.length ? targets[0] : null
    
    if (!who && args[1]) {
      const num = args[1].replace(/[@ .+-]/g, '')
      if (num.length >= 10) {
        who = toJid(num)
      }
    }
    
    if (!who) {
      return conn.sendMessage(m.chat, { 
        text: '❌ *𝐃𝐞𝐯𝐢 𝐦𝐞𝐧𝐳𝐢𝐨𝐧𝐚𝐫𝐞 𝐥𝐚 𝐩𝐞𝐫𝐬𝐨𝐧𝐚*' 
      }, { quoted: m })
    }
    
    if (who === toJid(m.sender)) {
      return conn.sendMessage(m.chat, { 
        text: '❌ *𝐍𝐨𝐧 𝐩𝐮𝐨𝐢 𝐭𝐫𝐚𝐬𝐟𝐞𝐫𝐢𝐫𝐞 𝐚 𝐭𝐞 𝐬𝐭𝐞𝐬𝐬𝐨*' 
      }, { quoted: m })
    }
    
    const target = getUser(who, false)
    if (!target) {
      return conn.sendMessage(m.chat, { 
        text: `❌ *𝐔𝐭𝐞𝐧𝐭𝐞 𝐧𝐨𝐧 𝐭𝐫𝐨𝐯𝐚𝐭𝐨*` 
      }, { quoted: m })
    }
    
    if (user.money < count) {
      return conn.sendMessage(m.chat, { 
        text: `❌ *𝐒𝐚𝐥𝐝𝐨 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭𝐞*\n𝐃𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐞: ${user.money}€` 
      }, { quoted: m })
    }
    
    const confirmText = `╭━━━「 💰 𝐂𝐎𝐍𝐅𝐄𝐑𝐌𝐀 𝐁𝐎𝐍𝐈𝐅𝐈𝐂𝐎 」━━━╮
┃
┃ 📤 𝐀 𝐜𝐚𝐫𝐢𝐜𝐨: @${m.sender.split('@')[0]}
┃ 📥 𝐀 𝐟𝐚𝐯𝐨𝐫𝐞: @${who.split('@')[0]}
┃ 💵 𝐈𝐦𝐩𝐨𝐫𝐭𝐨: *${count}€*
┃
┃ ⏳ 𝐇𝐚𝐢 60 𝐬𝐞𝐜𝐨𝐧𝐝𝐢
┃
┃ ✅ 𝐒𝐜𝐫𝐢𝐯𝐢: *si* 𝐩𝐞𝐫 𝐜𝐨𝐧𝐟𝐞𝐫𝐦𝐚𝐫𝐞
┃ ❌ 𝐒𝐜𝐫𝐢𝐯𝐢: *no* 𝐩𝐞𝐫 𝐚𝐧𝐧𝐮𝐥𝐥𝐚𝐫𝐞
┃
╰━━━━━━━━━━━━━━━━━━╯`

    await conn.sendMessage(m.chat, {
      text: confirmText,
      mentions: [who]
    }, { quoted: m })
    
    confirmation[m.sender] = {
      sender: m.sender,
      to: who,
      messageId: m.key.id,
      count,
      timeout: setTimeout(() => {
        conn.sendMessage(m.chat, {
          text: '❌ *𝐁𝐨𝐧𝐢𝐟𝐢𝐜𝐨 𝐚𝐧𝐧𝐮𝐥𝐥𝐚𝐭𝐨 𝐩𝐞𝐫 𝐬𝐜𝐚𝐝𝐞𝐧𝐳𝐚*',
          mentions: [m.sender]
        }, { quoted: m })
        delete confirmation[m.sender]
      }, 60000)
    }
  },
  
  async before(m, { conn }) {
    if (!m.text) return false
    if (!(m.sender in confirmation)) return false
    
    const conf = confirmation[m.sender]
    const user = getUser(conf.sender, true)
    const target = getUser(conf.to, true)
    
    const isYes = /^si|sì$/i.test(m.text)
    const isNo = /^no$/i.test(m.text)
    
    if (isNo) {
      clearTimeout(conf.timeout)
      delete confirmation[m.sender]
      await conn.sendMessage(m.chat, {
        text: '❌ *𝐁𝐨𝐧𝐢𝐟𝐢𝐜𝐨 𝐚𝐧𝐧𝐮𝐥𝐥𝐚𝐭𝐨*',
        mentions: [m.sender]
      }, { quoted: m })
      return true
    }
    
    if (isYes) {
      clearTimeout(conf.timeout)
      
      if (user.money < conf.count) {
        delete confirmation[m.sender]
        await conn.sendMessage(m.chat, {
          text: '❌ *𝐒𝐚𝐥𝐝𝐨 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭𝐞*',
          mentions: [m.sender]
        }, { quoted: m })
        return true
      }
      
      user.money -= conf.count
      target.money = (parseInt(target.money) || 0) + conf.count
      forceSave()
      
      delete confirmation[m.sender]
      
      await conn.sendMessage(m.chat, {
        text: `✅ *𝐁𝐨𝐧𝐢𝐟𝐢𝐜𝐨 𝐞𝐟𝐟𝐞𝐭𝐭𝐮𝐚𝐭𝐨*\n\n📤 @${conf.sender.split('@')[0]}\n📥 @${conf.to.split('@')[0]}\n💰 *${conf.count}€*`,
        mentions: [conf.sender, conf.to]
      }, { quoted: m })
      
      return true
    }
    
    return false
  }
}