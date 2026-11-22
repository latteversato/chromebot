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
  command: ['pic'],
  group: true,
  admin: true,
  
  async execute(m, { conn, mentionedJid }) {
    const targets = extractTargets(m, mentionedJid)
    let who = targets.length ? targets[0] : m.sender

    try {
      let profilePicture = await conn.profilePictureUrl(who, 'image')
      await conn.sendMessage(m.chat, { 
        image: { url: profilePicture }, 
        caption: `📸 @${who.split('@')[0]}`,
        mentions: [who]
      }, { quoted: m })
    } catch (e) {
      await conn.sendMessage(m.chat, { 
        text: `❌ @${who.split('@')[0]} 𝐧𝐨𝐧 𝐡𝐚 𝐮𝐧𝐚 𝐟𝐨𝐭𝐨 𝐩𝐫𝐨𝐟𝐢𝐥𝐨`,
        mentions: [who]
      }, { quoted: m })
    }
  }
}