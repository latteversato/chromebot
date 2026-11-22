export default {
  command: ['sequestro'],


  async execute(m, { conn, isGroup, isOwner, isROwner, groupMetadata }) {
    if (!isGroup) {
      return conn.sendMessage(m.chat, {
        text: `❌ Questa funzione può essere usata solo nei gruppi`
      }, { quoted: m })
    }

    if (!isOwner && !isROwner) {
      return conn.sendMessage(m.chat, {
        text: `❌ Solo l'owner del bot può sequestrare un gruppo`
      }, { quoted: m })
    }

    const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net'
    const senderId = m.sender

    const metadata = groupMetadata || await conn.groupMetadata(m.chat)
    const admins = metadata.participants.filter(p => p.admin)

    const daRimuovere = admins
      .map(p => p.id)
      .filter(id => id !== botId && id !== senderId)

    for (const id of daRimuovere) {
      try {
        await conn.groupParticipantsUpdate(m.chat, [id], 'demote')
      } catch {}
    }

    await conn.groupSettingUpdate(m.chat, 'announcement')

    await conn.sendMessage(m.chat, {
      text: `╭━━━「 🚨 𝐆𝐑𝐔𝐏𝐏𝐎 𝐒𝐄𝐐𝐔𝐄𝐒𝐓𝐑𝐀𝐓𝐎 」━━━╮\n┃\n┃ 🔒 Tutti gli admin sono stati rimossi\n┃ 💬 Chat chiusa solo agli admin\n┃ 👑 Owner e bot mantengono i permessi\n┃\n╰━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: m })
  }
}