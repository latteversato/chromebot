export default {
  command: ['num', 'numero'],
  
  async execute(m, { conn }) {
    let targetNumber = m.sender
    
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      targetNumber = m.mentionedJid[0]
    }
    
    if (m.quoted) {
      targetNumber = m.quoted.sender
    }
    
    let cleanNumber = targetNumber.replace(/@/g, '').replace(/\D/g, '')
    const formattedNumber = '+' + cleanNumber
    
    await conn.sendMessage(m.chat, {
      text: `📱 *𝐍𝐮𝐦𝐞𝐫𝐨:* ${formattedNumber}`,
      mentions: [targetNumber]
    }, { quoted: m })
  }
}