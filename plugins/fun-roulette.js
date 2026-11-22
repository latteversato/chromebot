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

const lobbies = {}
const MAX_LIVES = 5
const MAX_QUOTA = 10000
const divider = "┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈"

export default {
  command: ['rlt', 'roulette'],
  
  async execute(m, { conn, args, mentionedJid }) {
    const sender = m.sender
    const user = getUser(sender, true)
    const cmd = args[0]?.toLowerCase()
    const lobbyName = args[1]?.toLowerCase()

    // CREA LOBBY
    if (cmd === "lobby" || cmd === "crea") {
      const quota = parseInt(args[2])
      if (!lobbyName || isNaN(quota)) {
        return conn.sendMessage(m.chat, {
          text: `${divider}
📌 *𝐔𝐒𝐎:* .rlt lobby <𝐧𝐨𝐦𝐞> <𝐪𝐮𝐨𝐭𝐚>
📝 *𝐄𝐬𝐞𝐦𝐩𝐢𝐨:* .rlt lobby rossa 500
${divider}`
        }, { quoted: m })
      }

      if (quota > MAX_QUOTA || quota < 100) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐐𝐮𝐨𝐭𝐚 𝐧𝐨𝐧 𝐯𝐚𝐥𝐢𝐝𝐚!*\n💰 𝐌𝐢𝐧: 100€ | 𝐌𝐚𝐱: ${MAX_QUOTA}€`
        }, { quoted: m })
      }

      if (lobbies[lobbyName]) {
        return conn.sendMessage(m.chat, {
          text: `⚠️ *𝐋𝐨𝐛𝐛𝐲 "${lobbyName}" 𝐠𝐢𝐚̀ 𝐞𝐬𝐢𝐬𝐭𝐞𝐧𝐭𝐞!*`
        }, { quoted: m })
      }

      if (user.money < quota) {
        return conn.sendMessage(m.chat, {
          text: `💸 *𝐅𝐨𝐧𝐝𝐢 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭𝐢!*\n💰 𝐓𝐢 𝐬𝐞𝐫𝐯𝐨𝐧𝐨: ${quota}€`
        }, { quoted: m })
      }

      user.money -= quota
      forceSave()

      lobbies[lobbyName] = {
        name: lobbyName,
        quota,
        pool: quota,
        owner: sender,
        active: false,
        players: {
          [sender]: {
            name: await conn.getName(sender),
            lives: MAX_LIVES,
            shots: 0
          }
        },
        turnOrder: [sender],
        currentTurnIndex: 0,
        createdAt: Date.now()
      }

      return conn.sendMessage(m.chat, {
        text: `${divider}
🎰 *𝐋𝐎𝐁𝐁𝐘 𝐂𝐑𝐄𝐀𝐓𝐀*

📛 *𝐍𝐨𝐦𝐞:* ${lobbyName}
👑 *𝐂𝐫𝐞𝐚𝐭𝐨𝐫𝐞:* ${await conn.getName(sender)}
💰 *𝐐𝐮𝐨𝐭𝐚:* ${quota}€
👤 *𝐆𝐢𝐨𝐜𝐚𝐭𝐨𝐫𝐢:* 1/${MAX_LIVES * 2}

📢 𝐔𝐬𝐚: .rlt join ${lobbyName}
▶️ 𝐔𝐬𝐚: .rlt start ${lobbyName}
${divider}`
      }, { quoted: m })
    }

    // JOIN LOBBY
    if (cmd === "join" || cmd === "entra") {
      const game = lobbies[lobbyName]
      if (!game) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐋𝐨𝐛𝐛𝐲 "${lobbyName}" 𝐧𝐨𝐧 𝐭𝐫𝐨𝐯𝐚𝐭𝐚!*`
        }, { quoted: m })
      }

      if (game.active) {
        return conn.sendMessage(m.chat, {
          text: `🚫 *𝐏𝐚𝐫𝐭𝐢𝐭𝐚 𝐠𝐢𝐚̀ 𝐢𝐧𝐢𝐳𝐢𝐚𝐭𝐚!*`
        }, { quoted: m })
      }

      if (game.players[sender]) {
        return conn.sendMessage(m.chat, {
          text: `⚠️ *𝐒𝐞𝐢 𝐠𝐢𝐚̀ 𝐢𝐧 𝐪𝐮𝐞𝐬𝐭𝐚 𝐥𝐨𝐛𝐛𝐲!*`
        }, { quoted: m })
      }

      if (Object.keys(game.players).length >= MAX_LIVES * 2) {
        return conn.sendMessage(m.chat, {
          text: `🚫 *𝐋𝐨𝐛𝐛𝐲 𝐩𝐢𝐞𝐧𝐚!* 𝐌𝐚𝐱: ${MAX_LIVES * 2} 𝐠𝐢𝐨𝐜𝐚𝐭𝐨𝐫𝐢`
        }, { quoted: m })
      }

      if (user.money < game.quota) {
        return conn.sendMessage(m.chat, {
          text: `💸 *𝐅𝐨𝐧𝐝𝐢 𝐢𝐧𝐬𝐮𝐟𝐟𝐢𝐜𝐢𝐞𝐧𝐭𝐢!*\n💰 𝐓𝐢 𝐬𝐞𝐫𝐯𝐨𝐧𝐨: ${game.quota}€`
        }, { quoted: m })
      }

      user.money -= game.quota
      game.pool += game.quota
      forceSave()

      game.players[sender] = {
        name: await conn.getName(sender),
        lives: MAX_LIVES,
        shots: 0
      }
      game.turnOrder.push(sender)

      return conn.sendMessage(m.chat, {
        text: `${divider}
✅ *𝐈𝐒𝐂𝐑𝐈𝐙𝐈𝐎𝐍𝐄 𝐄𝐅𝐅𝐄𝐓𝐓𝐔𝐀𝐓𝐀*

👤 ${await conn.getName(sender)}
❤️ *𝐕𝐢𝐭𝐞:* ${MAX_LIVES}
💰 *𝐐𝐮𝐨𝐭𝐚:* ${game.quota}€
👥 *𝐈𝐧 𝐥𝐨𝐛𝐛𝐲:* ${Object.keys(game.players).length}
${divider}`
      }, { quoted: m })
    }

    // START GAME
    if (cmd === "start" || cmd === "inizia") {
      const game = lobbies[lobbyName]
      if (!game) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐋𝐨𝐛𝐛𝐲 "${lobbyName}" 𝐧𝐨𝐧 𝐭𝐫𝐨𝐯𝐚𝐭𝐚!*`
        }, { quoted: m })
      }

      if (game.owner !== sender) {
        return conn.sendMessage(m.chat, {
          text: `🚫 *𝐒𝐨𝐥𝐨 @${game.owner.split('@')[0]} 𝐩𝐮𝐨̀ 𝐚𝐯𝐯𝐢𝐚𝐫𝐞!*`,
          mentions: [game.owner]
        }, { quoted: m })
      }

      if (Object.keys(game.players).length < 2) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐒𝐞𝐫𝐯𝐨𝐧𝐨 𝐦𝐢𝐧𝐢𝐦𝐨 𝟐 𝐠𝐢𝐨𝐜𝐚𝐭𝐨𝐫𝐢!*`
        }, { quoted: m })
      }

      game.active = true
      game.startedAt = Date.now()

      return conn.sendMessage(m.chat, {
        text: `${divider}
🎰 *𝐑𝐎𝐔𝐋𝐄𝐓𝐓𝐄 𝐈𝐍𝐈𝐙𝐈𝐀𝐓𝐀!*

📛 *𝐋𝐨𝐛𝐛𝐲:* ${lobbyName}
👥 *𝐆𝐢𝐨𝐜𝐚𝐭𝐨𝐫𝐢:* ${game.turnOrder.length}
💰 *𝐌𝐨𝐧𝐭𝐞𝐩𝐫𝐞𝐦𝐢:* ${game.pool}€
🔫 *𝐓𝐮𝐫𝐧𝐨 𝐝𝐢:* @${game.turnOrder[0].split('@')[0]}
${divider}`,
        mentions: [game.turnOrder[0]]
      }, { quoted: m })
    }

    // SPARA
    if (cmd === "shot" || cmd === "spara") {
      const targets = extractTargets(m, mentionedJid)
      const mention = targets.length ? targets[0] : null
      
      const game = Object.values(lobbies).find(g => 
        g.active && g.players[sender] && mention && g.players[mention]
      )

      if (!mention || !game) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐃𝐞𝐯𝐢 𝐦𝐞𝐧𝐳𝐢𝐨𝐧𝐚𝐫𝐞 𝐮𝐧 𝐠𝐢𝐨𝐜𝐚𝐭𝐨𝐫𝐞!*\n📌 𝐄𝐬𝐞𝐦𝐩𝐢𝐨: .rlt shot @utente`
        }, { quoted: m })
      }

      const currentPlayer = game.turnOrder[game.currentTurnIndex]
      if (sender !== currentPlayer) {
        return conn.sendMessage(m.chat, {
          text: `⏳ *𝐍𝐨𝐧 è 𝐢𝐥 𝐭𝐮𝐨 𝐭𝐮𝐫𝐧𝐨!*\n🔫 𝐓𝐨𝐜𝐜𝐚 𝐚: @${currentPlayer.split('@')[0]}`,
          mentions: [currentPlayer]
        }, { quoted: m })
      }

      const target = game.players[mention]
      if (!target || target.lives <= 0) {
        return conn.sendMessage(m.chat, {
          text: `☠️ *𝐆𝐢𝐨𝐜𝐚𝐭𝐨𝐫𝐞 𝐠𝐢𝐚̀ 𝐞𝐥𝐢𝐦𝐢𝐧𝐚𝐭𝐨!*`
        }, { quoted: m })
      }

      game.players[sender].shots++
      
      const isHit = Math.random() < 0.4
      let resultText = ""

      if (isHit) {
        target.lives--
        resultText = `💥 *𝐂𝐎𝐋𝐏𝐎 𝐕𝐄𝐑𝐎!*\n@${mention.split('@')[0]} 𝐩𝐞𝐫𝐝𝐞 𝐮𝐧𝐚 𝐯𝐢𝐭𝐚!`
        
        if (target.lives <= 0) {
          delete game.players[mention]
          game.turnOrder = game.turnOrder.filter(p => p !== mention)
          resultText += `\n☠️ *𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐓𝐎!*`
        } else {
          resultText += `\n❤️ *𝐕𝐢𝐭𝐞 𝐫𝐢𝐦𝐚𝐬𝐭𝐞:* ${target.lives}`
        }
      } else {
        resultText = `🧨 *𝐂𝐎𝐋𝐏𝐎 𝐅𝐀𝐋𝐒𝐎!*\n𝐍𝐞𝐬𝐬𝐮𝐧 𝐝𝐚𝐧𝐧𝐨 𝐢𝐧𝐟𝐥𝐢𝐭𝐭𝐨.`
      }

      const remainingPlayers = Object.keys(game.players)
      if (remainingPlayers.length === 1) {
        const winnerId = remainingPlayers[0]
        const winner = game.players[winnerId]
        
        const winnerUser = getUser(winnerId, true)
        winnerUser.money += game.pool
        forceSave()
        
        delete lobbies[game.name]
        
        return conn.sendMessage(m.chat, {
          text: `${divider}
🏆 *𝐕𝐈𝐓𝐓𝐎𝐑𝐈𝐀!*

👑 *𝐕𝐢𝐧𝐜𝐢𝐭𝐨𝐫𝐞:* ${winner.name}
💰 *𝐏𝐫𝐞𝐦𝐢𝐨:* ${game.pool}€
⏱️ *𝐃𝐮𝐫𝐚𝐭𝐚:* ${Math.floor((Date.now() - game.startedAt) / 60000)} 𝐦𝐢𝐧
${divider}`
        }, { quoted: m })
      }

      do {
        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.turnOrder.length
      } while (!game.players[game.turnOrder[game.currentTurnIndex]])

      const nextPlayer = game.turnOrder[game.currentTurnIndex]
      
      return conn.sendMessage(m.chat, {
        text: `${resultText}\n\n${divider}\n🔁 *𝐏𝐫𝐨𝐬𝐬𝐢𝐦𝐨 𝐭𝐮𝐫𝐧𝐨:* @${nextPlayer.split('@')[0]}\n💰 *𝐌𝐨𝐧𝐭𝐞𝐩𝐫𝐞𝐦𝐢:* ${game.pool}€\n👥 *𝐆𝐢𝐨𝐜𝐚𝐭𝐨𝐫𝐢:* ${remainingPlayers.length}\n${divider}`,
        mentions: [mention, nextPlayer]
      }, { quoted: m })
    }

    // STATO VITE
    if (cmd === "vite" || cmd === "lives" || cmd === "status") {
      const game = Object.values(lobbies).find(g => g.players[sender])
      if (!game) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐍𝐨𝐧 𝐬𝐞𝐢 𝐢𝐧 𝐧𝐞𝐬𝐬𝐮𝐧𝐚 𝐩𝐚𝐫𝐭𝐢𝐭𝐚!*`
        }, { quoted: m })
      }

      let statusText = `${divider}\n❤️ *𝐒𝐓𝐀𝐓𝐎 𝐏𝐀𝐑𝐓𝐈𝐓𝐀*\n📛 *𝐋𝐨𝐛𝐛𝐲:* ${game.name}\n${divider}\n`
      
      for (const [jid, player] of Object.entries(game.players)) {
        const tag = jid === game.turnOrder[game.currentTurnIndex] ? "🔫 " : "👤 "
        statusText += `${tag}${player.name}: ${player.lives} 𝐯𝐢𝐭𝐞`
        
        if (jid === game.owner) {
          statusText += " 👑"
        }
        statusText += "\n"
      }
      
      statusText += `${divider}\n💰 *𝐌𝐨𝐧𝐭𝐞𝐩𝐫𝐞𝐦𝐢:* ${game.pool}€\n${game.active ? `🔫 *𝐓𝐮𝐫𝐧𝐨 𝐚𝐭𝐭𝐮𝐚𝐥𝐞:* ${game.players[game.turnOrder[game.currentTurnIndex]]?.name || "𝐍𝐞𝐬𝐬𝐮𝐧𝐨"}` : "⏳ *𝐈𝐧 𝐚𝐭𝐭𝐞𝐬𝐚*"}\n${divider}`
      
      return conn.sendMessage(m.chat, {
        text: statusText
      }, { quoted: m })
    }

    // LISTA LOBBY
    if (cmd === "list" || cmd === "lista") {
      const activeLobbies = Object.values(lobbies).filter(l => !l.active)
      
      if (activeLobbies.length === 0) {
        return conn.sendMessage(m.chat, {
          text: `${divider}\n📭 *𝐍𝐞𝐬𝐬𝐮𝐧𝐚 𝐥𝐨𝐛𝐛𝐲 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐞*\n${divider}`
        }, { quoted: m })
      }
      
      let listText = `${divider}\n🎰 *𝐋𝐎𝐁𝐁𝐘 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐈𝐋𝐈*\n${divider}\n`
      
      activeLobbies.forEach(lobby => {
        listText += `📛 *${lobby.name}*\n👑 ${lobby.players[lobby.owner]?.name}\n💰 ${lobby.quota}€ | 👥 ${Object.keys(lobby.players).length}\n${divider}\n`
      })
      
      listText += `📌 *𝐔𝐧𝐢𝐬𝐜𝐢𝐭𝐢 𝐜𝐨𝐧:* .rlt join <𝐧𝐨𝐦𝐞>`
      
      return conn.sendMessage(m.chat, {
        text: listText
      }, { quoted: m })
    }

    // ABBANDONA
    if (cmd === "leave" || cmd === "abbandona") {
      const game = Object.values(lobbies).find(g => g.players[sender])
      
      if (!game) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐍𝐨𝐧 𝐬𝐞𝐢 𝐢𝐧 𝐧𝐞𝐬𝐬𝐮𝐧𝐚 𝐥𝐨𝐛𝐛𝐲!*`
        }, { quoted: m })
      }
      
      if (game.active) {
        return conn.sendMessage(m.chat, {
          text: `🚫 *𝐍𝐨𝐧 𝐩𝐮𝐨𝐢 𝐚𝐛𝐛𝐚𝐧𝐝𝐨𝐧𝐚𝐫𝐞 𝐝𝐮𝐫𝐚𝐧𝐭𝐞 𝐮𝐧𝐚 𝐩𝐚𝐫𝐭𝐢𝐭𝐚!*`
        }, { quoted: m })
      }
      
      if (sender === game.owner) {
        delete lobbies[game.name]
        user.money += game.quota
        forceSave()
        return conn.sendMessage(m.chat, {
          text: `🗑️ *𝐋𝐨𝐛𝐛𝐲 𝐞𝐥𝐢𝐦𝐢𝐧𝐚𝐭𝐚!*\n💰 ${game.quota}€ 𝐫𝐞𝐬𝐭𝐢𝐭𝐮𝐢𝐭𝐢`
        }, { quoted: m })
      }
      
      delete game.players[sender]
      game.turnOrder = game.turnOrder.filter(p => p !== sender)
      game.pool -= game.quota
      user.money += game.quota
      forceSave()
      
      return conn.sendMessage(m.chat, {
        text: `👋 *𝐇𝐚𝐢 𝐚𝐛𝐛𝐚𝐧𝐝𝐨𝐧𝐚𝐭𝐨 𝐥𝐚 𝐥𝐨𝐛𝐛𝐲*\n💰 ${game.quota}€ 𝐫𝐞𝐬𝐭𝐢𝐭𝐮𝐢𝐭𝐢`
      }, { quoted: m })
    }

    // STOP FORZATO
    if (cmd === "stop" || cmd === "ferma") {
      const game = lobbies[lobbyName]
      if (!game) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐋𝐨𝐛𝐛𝐲 "${lobbyName}" 𝐧𝐨𝐧 𝐭𝐫𝐨𝐯𝐚𝐭𝐚!*`
        }, { quoted: m })
      }
      
      if (game.owner !== sender) {
        return conn.sendMessage(m.chat, {
          text: `🚫 *𝐒𝐨𝐥𝐨 @${game.owner.split('@')[0]} 𝐩𝐮𝐨̀ 𝐟𝐞𝐫𝐦𝐚𝐫𝐞 𝐥𝐚 𝐩𝐚𝐫𝐭𝐢𝐭𝐚!*`,
          mentions: [game.owner]
        }, { quoted: m })
      }
      
      Object.keys(game.players).forEach(playerId => {
        const player = getUser(playerId, true)
        player.money += game.quota
      })
      forceSave()
      
      delete lobbies[lobbyName]
      
      return conn.sendMessage(m.chat, {
        text: `⛔ *𝐏𝐚𝐫𝐭𝐢𝐭𝐚 𝐟𝐞𝐫𝐦𝐚𝐭𝐚*\n💰 𝐐𝐮𝐨𝐭𝐞 𝐫𝐞𝐬𝐭𝐢𝐭𝐮𝐢𝐭𝐞 𝐚 𝐭𝐮𝐭𝐭𝐢 𝐢 𝐠𝐢𝐨𝐜𝐚𝐭𝐨𝐫𝐢`
      }, { quoted: m })
    }

    // AIUTO
    if (!cmd || cmd === "help") {
      return conn.sendMessage(m.chat, {
        text: `${divider}
🎰 *𝐑𝐎𝐔𝐋𝐄𝐓𝐓𝐄 𝐑𝐔𝐒𝐒𝐀 - 𝐂𝐎𝐌𝐀𝐍𝐃𝐈*

🎲 *𝐂𝐫𝐞𝐚𝐳𝐢𝐨𝐧𝐞:*
.rlt lobby <𝐧𝐨𝐦𝐞> <𝐪𝐮𝐨𝐭𝐚> - 𝐂𝐫𝐞𝐚 𝐥𝐨𝐛𝐛𝐲
.rlt join <𝐧𝐨𝐦𝐞> - 𝐔𝐧𝐢𝐬𝐜𝐢𝐭𝐢
.rlt start <𝐧𝐨𝐦𝐞> - 𝐀𝐯𝐯𝐢𝐚 𝐩𝐚𝐫𝐭𝐢𝐭𝐚

🎯 *𝐆𝐢𝐨𝐜𝐨:*
.rlt shot @𝐮𝐭𝐞𝐧𝐭𝐞 - 𝐒𝐩𝐚𝐫𝐚𝐫𝐞
.rlt vite - 𝐌𝐨𝐬𝐭𝐫𝐚 𝐯𝐢𝐭𝐞

📋 *𝐆𝐞𝐬𝐭𝐢𝐨𝐧𝐞:*
.rlt list - 𝐋𝐨𝐛𝐛𝐲 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐢
.rlt leave - 𝐀𝐛𝐛𝐚𝐧𝐝𝐨𝐧𝐚 𝐥𝐨𝐛𝐛𝐲
.rlt stop <𝐧𝐨𝐦𝐞> - 𝐅𝐞𝐫𝐦𝐚 𝐩𝐚𝐫𝐭𝐢𝐭𝐚

❓ *𝐀𝐢𝐮𝐭𝐨:*
.rlt help - 𝐌𝐨𝐬𝐭𝐫𝐚 𝐪𝐮𝐞𝐬𝐭𝐨 𝐦𝐞𝐬𝐬𝐚𝐠𝐠𝐢𝐨
${divider}`
      }, { quoted: m })
    }
  }
}