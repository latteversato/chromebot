import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ruoliPath = path.join(__dirname, '../ruoli.js')

const cleanNum = j => (j || '').toString().split('@')[0].split(':')[0].replace(/\D/g, '')


const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]+/g, ' ') + "'"

function findOwnerBlock(src) {
  const m = /global\.owner\s*=\s*\[/.exec(src)
  if (!m) return null
  const start = m.index
  let depth = 0
  let quote = null
  for (let i = m.index + m[0].length - 1; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue }
    if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) return { start, end: i + 1 }
    }
  }
  return null
}

function saveOwners(list) {
  try {
    const src = fs.readFileSync(ruoliPath, 'utf8')
    const block = findOwnerBlock(src)
    if (!block) return false

    const body = list
      .map(o => `    [${q(o[0])}, ${q(o[1] ?? 'Owner')}, ${o[2] === false ? 'false' : 'true'}]`)
      .join(',\n')
    const newBlock = `global.owner = [\n${body}\n]`

    const out = src.slice(0, block.start) + newBlock + src.slice(block.end)
    const tmp = ruoliPath + '.tmp'
    fs.writeFileSync(tmp, out, 'utf8')
    fs.renameSync(tmp, ruoliPath)
    return true
  } catch (e) {
    console.error('❌ Errore salvataggio owner:', e.message)
    return false
  }
}

const normalized = () =>
  (global.owner || []).map(o => (Array.isArray(o) ? [...o] : [o, 'Owner', true]))

export default {
  command: ['addowner', 'delowner', 'listowner'],
  owner: true,

  async execute(m, { conn, text = '', usedPrefix, command }) {
    const reply = (t, mentions) =>
      conn.sendMessage(m.chat, mentions ? { text: t, mentions } : { text: t }, { quoted: m })

    
    if (command === 'listowner') {
      const list = normalized()
      if (!list.length) return reply('📭 *𝐍𝐞𝐬𝐬𝐮𝐧 𝐨𝐰𝐧𝐞𝐫 𝐧𝐞𝐥𝐥𝐚 𝐥𝐢𝐬𝐭𝐚*')

      let out = '╭━━━「 👑 𝐋𝐈𝐒𝐓𝐀 𝐎𝐖𝐍𝐄𝐑 」━━━╮\n'
      list.forEach((o, i) => {
        out += `┃ ${i + 1}. @${cleanNum(o[0])} - ${o[1] || '𝐎𝐰𝐧𝐞𝐫'}\n`
      })
      out += `╰━━━━━━━━━━━━━━━━━━╯\n`
      out += `📌 *𝐓𝐨𝐭𝐚𝐥𝐞:* ${list.length} owner`

      return reply(out, list.map(o => cleanNum(o[0]) + '@s.whatsapp.net'))
    }

    let who = null
    let ownerName = ''

    if (m.mentionedJid && m.mentionedJid.length > 0) {
      who = m.mentionedJid[0]
      ownerName = text.replace(/@\d+/g, '').trim()
    } else if (m.quoted) {
      who = m.quoted.sender
      ownerName = text.trim()
    } else if (text) {
      const parts = text.trim().split(/\s+/)
      const possibleNumber = parts[0].replace(/[^0-9]/g, '')
      if (possibleNumber.length >= 8) {
        who = possibleNumber + '@s.whatsapp.net'
        ownerName = parts.slice(1).join(' ')
      }
    }

    ownerName = (ownerName || '𝐎𝐰𝐧𝐞𝐫').slice(0, 30)

    if (!who) {
      return reply(`❌ *𝐔𝐬𝐨:* ${usedPrefix}addowner @utente Nome\n${usedPrefix}delowner @utente`)
    }

    
    const number =
      global.jidTools?.phoneOf?.(who) ||
      (who.endsWith('@lid') ? null : cleanNum(who))

    if (!number || number.length < 8) {
      return reply('❌ *𝐍𝐮𝐦𝐞𝐫𝐨 𝐧𝐨𝐧 𝐯𝐚𝐥𝐢𝐝𝐨*')
    }

    const list = normalized()
    const exists = list.some(o => cleanNum(o[0]) === number)

   
    if (command === 'addowner') {
      if (exists) return reply(`✅ @${number} *è 𝐠𝐢à 𝐨𝐰𝐧𝐞𝐫*`, [number + '@s.whatsapp.net'])

      list.push([number, ownerName, true])

      if (!saveOwners(list)) {
        return reply('❌ *𝐈𝐦𝐩𝐨𝐬𝐬𝐢𝐛𝐢𝐥𝐞 𝐬𝐚𝐥𝐯𝐚𝐫𝐞 𝐥𝐚 𝐥𝐢𝐬𝐭𝐚 𝐨𝐰𝐧𝐞𝐫 𝐧𝐞𝐥 𝐟𝐢𝐥𝐞*')
      }

      if (!global.owner) global.owner = []
      global.owner.splice(0, global.owner.length, ...list)

      return reply(
        `✅ @${number} *𝐚𝐠𝐠𝐢𝐮𝐧𝐭𝐨 𝐚𝐠𝐥𝐢 𝐨𝐰𝐧𝐞𝐫*\n👤 *𝐍𝐨𝐦𝐞:* ${ownerName}`,
        [number + '@s.whatsapp.net']
      )
    }

    if (!exists) return reply(`❌ @${number} *𝐧𝐨𝐧 è 𝐨𝐰𝐧𝐞𝐫*`, [number + '@s.whatsapp.net'])

    const senderNums = global.jidTools?.candidates?.(m.sender) || [cleanNum(m.sender)]
    if (senderNums.includes(number)) {
      return reply('⚠️ *𝐍𝐨𝐧 𝐩𝐮𝐨𝐢 𝐫𝐢𝐦𝐮𝐨𝐯𝐞𝐫𝐭𝐢 𝐝𝐚 𝐬𝐨𝐥𝐨*')
    }
    if (list.length <= 1) {
      return reply('⚠️ *𝐍𝐨𝐧 𝐩𝐮𝐨𝐢 𝐫𝐢𝐦𝐮𝐨𝐯𝐞𝐫𝐞 𝐥’𝐮𝐥𝐭𝐢𝐦𝐨 𝐨𝐰𝐧𝐞𝐫*')
    }

    const filtered = list.filter(o => cleanNum(o[0]) !== number)

    if (!saveOwners(filtered)) {
      return reply('❌ *𝐈𝐦𝐩𝐨𝐬𝐬𝐢𝐛𝐢𝐥𝐞 𝐬𝐚𝐥𝐯𝐚𝐫𝐞 𝐥𝐚 𝐥𝐢𝐬𝐭𝐚 𝐨𝐰𝐧𝐞𝐫 𝐧𝐞𝐥 𝐟𝐢𝐥𝐞*')
    }

    global.owner.splice(0, global.owner.length, ...filtered)

    return reply(`🗑️ @${number} *𝐫𝐢𝐦𝐨𝐬𝐬𝐨 𝐝𝐚𝐠𝐥𝐢 𝐨𝐰𝐧𝐞𝐫*`, [number + '@s.whatsapp.net'])
  }
}