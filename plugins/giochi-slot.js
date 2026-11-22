import { getUser, forceSave } from '../database.js'

const slotSymbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐', '👑', '🔥', '💰']

function getRandomSymbol() {
  return slotSymbols[Math.floor(Math.random() * slotSymbols.length)]
}

function calculateWin(combination, bet) {
  const uniqueSymbols = new Set(combination)
  
  if (uniqueSymbols.size === 1) {
    const symbol = combination[0]
    if (symbol === '7️⃣') return bet * 50
    if (symbol === '👑') return bet * 40
    if (symbol === '💎') return bet * 30
    if (symbol === '💰') return bet * 25
    if (symbol === '🔥') return bet * 20
    if (symbol === '⭐') return bet * 15
    if (symbol === '🎰') return bet * 10
    return bet * 8
  }
  
  if (uniqueSymbols.size === 2) {
    const counts = {}
    combination.forEach(s => counts[s] = (counts[s] || 0) + 1)
    
    if (Object.values(counts).includes(2)) {
      return Math.floor(bet * 5)
    }
  }
  
  const jackpot = Math.random() < 0.01
  if (jackpot) {
    return bet * 100
  }
  
  return 0
}

function formatCombination(combo) {
  return `╭─────────────╮
│  ${combo.join(' │ ')}  │
╰─────────────╯`
}

export default {
  command: ['slot', 'slotmachine', 'slots'],
  category: 'Game',
  
  async execute(m, { conn, args }) {
    const bet = parseInt(args[0])
    
    if (!bet || isNaN(bet) || bet <= 0) {
      return conn.sendMessage(m.chat, {
        text: '🎰 *SLOT MACHINE*\n\n📌 *Comando:* .slot [puntata]\n📌 *Esempio:* .slot 100\n\n💰 *MOLTIPLICATORI:*\n• 7️⃣7️⃣7️⃣ → x50\n• 👑👑👑 → x40\n• 💎💎💎 → x30\n• 💰💰💰 → x25\n• 🔥🔥🔥 → x20\n• ⭐⭐⭐ → x15\n• 🎰🎰🎰 → x10\n• Tripli uguali → x8\n• Doppi uguali → x5\n\n🎁 *JACKPOT 1%* → x100!'
      }, { quoted: m })
    }

    const user = getUser(m.sender, true)
    const userMoney = parseInt(user.money) || 0

    if (userMoney < bet) {
      return conn.sendMessage(m.chat, {
        text: `❌ *SALDO INSUFFICIENTE*\n\nHai: ${userMoney} soldi\nServono: ${bet} soldi`
      }, { quoted: m })
    }

    user.money = userMoney - bet
    forceSave()

    const combination = [
      getRandomSymbol(),
      getRandomSymbol(),
      getRandomSymbol()
    ]

    const winAmount = calculateWin(combination, bet)
    
    let message = '┏━━━━━━━━━━━━━━━━━━┓\n┃     🎰 *SLOT* 🎰     ┃\n┗━━━━━━━━━━━━━━━━━━┛\n\n'
    message += formatCombination(combination) + '\n\n'
    
    if (winAmount > 0) {
      user.money = (parseInt(user.money) || 0) + winAmount
      forceSave()
      
      const profit = winAmount - bet
      message += `━━━━━━━━━━━━━━━━━━━\n`
      message += `✅ *VITTORIA!*\n`
      message += `💰 Vinto: *${winAmount}* soldi\n`
      message += `📈 Profitto: *+${profit}* soldi\n`
      message += `💵 Nuovo saldo: *${user.money}* soldi\n`
      message += `━━━━━━━━━━━━━━━━━━━`
    } else {
      message += `━━━━━━━━━━━━━━━━━━━\n`
      message += `❌ *MIKE PERSO!*\n`
      message += `💰 Puntata: *${bet}* soldi\n`
      message += `💵 Saldo rimasto: *${user.money}* soldi\n`
      message += `━━━━━━━━━━━━━━━━━━━`
    }

    const buttons = [{
      buttonId: `.slot ${bet}`,
      buttonText: { displayText: '🎰 Gioca ancora' },
      type: 1
    }]

    await conn.sendMessage(m.chat, {
      text: message,
      buttons: buttons,
      headerType: 1
    }, { quoted: m })
  }
}