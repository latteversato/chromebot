import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateWAMessageFromContent, proto } from '@realvare/baileys'
import { getChat } from '../database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const funzioniList = [
  { nome: 'Antinuke', chiave: 'antinuke', emoji: '🛡️' },
  { nome: 'Detect', chiave: 'detect', emoji: '🔍' },
  { nome: 'Benvenuto', chiave: 'welcome', emoji: '👋' },
  { nome: 'Antilink Gruppo', chiave: 'antilinkgp', emoji: '🔗' },
  { nome: 'Antilink Hard', chiave: 'antilinkhard', emoji: '⛔' },
  { nome: 'Anti Spam', chiave: 'antiSpam', emoji: '📨' },
  { nome: 'Anti Elimina', chiave: 'antielimina', emoji: '🗑️' },
  { nome: 'Anti ViewOnce', chiave: 'antiviewonce', emoji: '👀' },
  { nome: 'Anti Traba', chiave: 'antiTraba', emoji: '🚫' },
  { nome: 'Anti Pakistani', chiave: 'antipaki', emoji: '🚫' },
  { nome: 'Anti Arabi', chiave: 'antiArab', emoji: '🚫' },
  { nome: 'Anti Porno', chiave: 'antiporno', emoji: '🔞' },
  { nome: 'Anti Chiamate', chiave: 'antiCall', emoji: '📞' },
  { nome: 'Anti Bot', chiave: 'antibot', emoji: '🤖' },
  { nome: 'Bestemmiometro', chiave: 'bestemmiometro', emoji: '📊' },
  { nome: 'Auto Sticker', chiave: 'autosticker', emoji: '🏷️' },
  { nome: 'Solo Admin', chiave: 'modoadmin', emoji: '👮' },
  { nome: 'Solo Privato', chiave: 'soloprivato', emoji: '🔒' },
  { nome: 'Solo Gruppo', chiave: 'sologruppo', emoji: '👥' },
  { nome: 'Auto Delete', chiave: 'delete', emoji: '🧹' }
]

async function sendList(
  sock,
  jid,
  { text, footer = '', title = '', buttonText, sections, quoted } = {}
) {
  if (!buttonText) throw new Error('sendList: buttonText is required')
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('sendList: sections must be a non-empty array')
  }

  const msg = generateWAMessageFromContent(
    jid,
    {
      listMessage: proto.Message.ListMessage.create({
        title: title || undefined,
        description: text,
        buttonText,
        listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
        sections: sections.map(s => ({
          title: s.title || '',
          rows: s.rows.map(r => ({
            title: r.title,
            description: r.description || '',
            rowId: r.id
          }))
        })),
        footerText: footer || undefined
      })
    },
    { quoted, userJid: sock.user?.id }
  )

  await sock.relayMessage(jid, msg.message, {
    messageId: msg.key.id,
    additionalNodes: [
      {
        tag: 'biz',
        attrs: {},
        content: [{ tag: 'list', attrs: { type: 'product_list', v: '2' } }]
      }
    ]
  })
  return msg.key
}

function estraiComandi(content) {
  const arr = content.match(/(?:handler\.)?command\s*[:=]\s*\[([\s\S]*?)\]/)
  if (arr) {
    return [...arr[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map(x => x[1].trim())
  }

  const str = content.match(/(?:handler\.)?command\s*[:=]\s*['"`]([^'"`]+)['"`]/)
  if (str) return [str[1].trim()]

  const rgx = content.match(/(?:handler\.)?command\s*[:=]\s*\/\^?\(?([^/]+?)\)?\$?\/[a-z]*/)
  if (rgx) {
    return rgx[1].split('|').map(c => c.replace(/[^\p{L}\p{N}_-]/gu, '')).filter(Boolean)
  }

  return []
}

const menuPlugin = {
  command: ['menu', 'help', 'comandi'],

  async execute(m, { conn, args }) {
    const senderName = await conn.getName(m.sender)
    const botName = "𝐂𝐇𝐑𝐎𝐌𝐄 𝐁𝐎𝐓"
    const vs = "2.0.0"
    const prefix = global.prefissoComandi

    if (args[0]) {
      return menuPlugin.showCategory(m, { conn, args })
    }

    const pluginsFolder = path.join(__dirname, '../plugins')
    const files = fs.readdirSync(pluginsFolder).filter(f => f.endsWith('.js'))
    let totalCmds = 0

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(pluginsFolder, file), 'utf8')
        totalCmds += estraiComandi(content).length
      } catch {}
    }

    let menuText = `╭━━━「 ⚡ 𝗠𝗘𝗡𝗨 𝗖𝗛𝗥𝗢𝗠𝗘 𝗕𝗢𝗧 」━━━╮\n`
    menuText += `┃\n`
    menuText += `┃ 👤 *𝐔𝐭𝐞𝐧𝐭𝐞:* ${senderName}\n`
    menuText += `┃ 🤖 *𝐁𝐨𝐭:* ${botName}\n`
    menuText += `┃ 🔧 *𝐕𝐞𝐫𝐬𝐢𝐨𝐧𝐞:* ${vs}\n`
    menuText += `┃ 📊 *𝐂𝐨𝐦𝐚𝐧𝐝𝐢:* ${totalCmds}\n`
    menuText += `┃\n`
    menuText += `╰━━━━━━━━━━━━━━━━━━╯\n\n`
    menuText += `📌 𝐒𝐞𝐥𝐞𝐳𝐢𝐨𝐧𝐚 𝐮𝐧𝐚 𝐜𝐚𝐭𝐞𝐠𝐨𝐫𝐢𝐚 𝐝𝐚𝐥 𝐦𝐞𝐧𝐮 𝐪𝐮𝐢 𝐬𝐨𝐭𝐭𝐨 👇`

    const sections = [
      {
        title: '📂 CATEGORIE COMANDI',
        rows: [
          { title: '📋 Tutti', description: 'Elenco completo dei comandi', id: `${prefix}menu all` },
          { title: '👑 Owner', description: 'Comandi riservati all\'owner', id: `${prefix}menu owner` },
          { title: '🛠️ Admin', description: 'Comandi per gli admin gruppo', id: `${prefix}menu admin` },
          { title: '🎮 Giochi', description: 'Minigiochi e intrattenimento', id: `${prefix}menu giochi` },
          { title: '🔧 Strumenti', description: 'Utility e convertitori', id: `${prefix}menu strumenti` },
          { title: '🎨 Creatore', description: 'Strumenti creativi', id: `${prefix}menu creatore` },
          { title: '👥 Gruppo', description: 'Comandi per il gruppo', id: `${prefix}menu gp` },
          { title: '👑 VIP', description: 'Comandi esclusivi VIP', id: `${prefix}menu vip` }
        ]
      },
      {
        title: '⚙️ GESTIONE',
        rows: [
          { title: '⚙️ Funzioni', description: 'Stato funzioni attive sul gruppo', id: `${prefix}menu funzioni` }
        ]
      }
    ]

    await sendList(conn, m.chat, {
      text: menuText,
      footer: `─── 🔹 ${botName} 🔹 ───`,
      title: botName,
      buttonText: '📜 APRI MENU',
      sections,
      quoted: m
    })
  },

  async showCategory(m, { conn, args }) {
    const category = args[0]?.toLowerCase()
    const botName = "𝐂𝐇𝐑𝐎𝐌𝐄 𝐁𝐎𝐓"
    const prefix = global.prefissoComandi

    if (category === 'funzioni') {
      return menuPlugin.showFunzioni(m, { conn })
    }

    const pluginsFolder = path.join(__dirname, '../plugins')
    const files = fs.readdirSync(pluginsFolder).filter(f => f.endsWith('.js'))

    let cmds = []
    let title = ""

    const titoli = {
      owner: '👑 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐎𝐖𝐍𝐄𝐑',
      admin: '🛠️ 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐀𝐃𝐌𝐈𝐍',
      giochi: '🎮 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐆𝐈𝐎𝐂𝐇𝐈',
      strumenti: '🔧 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐒𝐓𝐑𝐔𝐌𝐄𝐍𝐓𝐈',
      creatore: '🎨 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐂𝐑𝐄𝐀𝐓𝐎𝐑𝐄',
      gp: '👥 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐆𝐑𝐔𝐏𝐏𝐎',
      vip: '👑 𝐂𝐎𝐌𝐀𝐍𝐃𝐈 𝐕𝐈𝐏',
      all: '📋 𝐓𝐔𝐓𝐓𝐈 𝐈 𝐂𝐎𝐌𝐀𝐍𝐃𝐈'
    }

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(pluginsFolder, file), 'utf8')
        const commands = estraiComandi(content)
        if (!commands.length) continue

        const prefissoFile = file.split(/[-_.]/)[0].toLowerCase()
        const isOwner = /\br?owner\s*[:=]\s*true/.test(content)
        const isAdmin = /\badmin\s*[:=]\s*true/.test(content)
        const isVip = /\bvip\s*[:=]\s*true/.test(content)

        const categorie = new Set(['all', prefissoFile])
        if (isOwner) categorie.add('owner')
        if (isAdmin && !isOwner) categorie.add('admin')
        if (isVip) categorie.add('vip')

        if (categorie.has(category) && titoli[category]) {
          title = titoli[category]
          commands.forEach(cmd => cmds.push(`┃ ${prefix}${cmd}`))
        }
      } catch {}
    }

    cmds = [...new Set(cmds)].sort()

    if (!cmds.length) {
      return conn.sendMessage(m.chat, {
        text: `❌ *𝐍𝐞𝐬𝐬𝐮𝐧 𝐜𝐨𝐦𝐚𝐧𝐝𝐨 𝐭𝐫𝐨𝐯𝐚𝐭𝐨*`
      }, { quoted: m })
    }

    let menuText = `╭━━━「 ${title} 」━━━╮\n`
    menuText += `┃\n`
    menuText += cmds.join('\n')
    menuText += `\n┃\n`
    menuText += `╰━━━━━━━━━━━━━━━━━━╯\n\n`
    menuText += `📌 *𝐓𝐨𝐭𝐚𝐥𝐞:* ${cmds.length} comandi`

    await sendList(conn, m.chat, {
      text: menuText,
      footer: `─── 🔹 ${botName} 🔹 ───`,
      title: botName,
      buttonText: '📜 MENU',
      sections: [
        {
          title: '🔙 NAVIGAZIONE',
          rows: [
            { title: '🔙 Indietro', description: 'Torna al menu principale', id: `${prefix}menu` }
          ]
        }
      ],
      quoted: m
    })
  },

  async showFunzioni(m, { conn }) {
    const botName = "𝐂𝐇𝐑𝐎𝐌𝐄 𝐁𝐎𝐓"
    const prefix = global.prefissoComandi
    const chat = getChat(m.chat, false)

    if (!chat) {
      return conn.sendMessage(m.chat, {
        text: `❌ *𝐅𝐮𝐧𝐳𝐢𝐨𝐧𝐢 𝐧𝐨𝐧 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐢*`
      }, { quoted: m })
    }

    const attive = funzioniList.filter(f => chat[f.chiave])
    const disattive = funzioniList.filter(f => !chat[f.chiave])

    let text = `╭━━━「 ⚙️ 𝐅𝐔𝐍𝐙𝐈𝐎𝐍𝐈 𝐆𝐑𝐔𝐏𝐏𝐎 」━━━╮\n┃\n`
    text += `┃ 🟢 *𝐀𝐓𝐓𝐈𝐕𝐄 (${attive.length})*\n`
    if (attive.length) {
      text += attive.map(f => `┃ ${f.emoji} ${f.nome}`).join('\n') + '\n'
    } else {
      text += `┃ 𝐍𝐞𝐬𝐬𝐮𝐧𝐚\n`
    }
    text += `┃\n`
    text += `┃ 🔴 *𝐃𝐈𝐒𝐀𝐓𝐓𝐈𝐕𝐄 (${disattive.length})*\n`
    if (disattive.length) {
      text += disattive.map(f => `┃ ${f.emoji} ${f.nome}`).join('\n') + '\n'
    } else {
      text += `┃ 𝐍𝐞𝐬𝐬𝐮𝐧𝐚\n`
    }
    text += `┃\n`
    text += `┃ ✏️ *𝐂𝐨𝐦𝐚𝐧𝐝𝐢:*\n`
    text += `┃ ${prefix}attiva <funzione>\n`
    text += `┃ ${prefix}disabilita <funzione>\n`
    text += `╰━━━━━━━━━━━━━━━━━━╯`

    const sections = [
      {
        title: '🟢 ATTIVA UNA FUNZIONE',
        rows: funzioniList.map(f => ({
          title: `${f.emoji} ${f.nome}`,
          description: chat[f.chiave] ? 'Attualmente attiva' : 'Attualmente disattiva',
          id: `${prefix}attiva ${f.chiave}`
        }))
      },
      {
        title: '🔙 NAVIGAZIONE',
        rows: [
          { title: '🔙 Indietro', description: 'Torna al menu principale', id: `${prefix}menu` }
        ]
      }
    ]

    await sendList(conn, m.chat, {
      text,
      footer: `─── 🔹 ${botName} 🔹 ───`,
      title: botName,
      buttonText: '⚙️ GESTISCI FUNZIONI',
      sections,
      quoted: m
    })
  }
}

export default menuPlugin
