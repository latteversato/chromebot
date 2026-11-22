import PhoneNumber from 'awesome-phonenumber'

export default {
  command: ['listagruppi', 'gplist', 'listgp', 'grouplist'],
  owner: true,
  
  async execute(m, { conn }) {
    try {
      await conn.sendMessage(m.chat, {
        text: '⏳ *𝐂𝐚𝐫𝐢𝐜𝐚𝐦𝐞𝐧𝐭𝐨 𝐥𝐢𝐬𝐭𝐚 𝐠𝐫𝐮𝐩𝐩𝐢...*'
      }, { quoted: m })

      const groups = Object.values(await conn.groupFetchAllParticipating())

      let txt = `╭━━━「 📋 𝐋𝐈𝐒𝐓𝐀 𝐆𝐑𝐔𝐏𝐏𝐈 」━━━╮\n`
      txt += `┃\n`
      txt += `┃ 📌 *𝐓𝐨𝐭𝐚𝐥𝐞:* ${groups.length}\n`
      txt += `┃\n`

      for (const [index, group] of groups.entries()) {
        const groupName = group.subject || '𝐒𝐞𝐧𝐳𝐚 𝐧𝐨𝐦𝐞'
        const participants = group.participants?.length || 0
        const groupId = group.id

        const botNumber = conn.user?.jid
        const isBotAdmin = group.participants?.some(p => 
          (p.id === botNumber || conn.decodeJid(p.id) === conn.decodeJid(botNumber)) && 
          (p.admin === 'admin' || p.admin === 'superadmin')
        ) ? '✅' : '❌'

        let inviteLink = '❌ 𝐍𝐨𝐧 𝐬𝐨𝐧𝐨 𝐚𝐝𝐦𝐢𝐧'
        if (isBotAdmin === '✅') {
          try {
            const code = await conn.groupInviteCode(group.id)
            inviteLink = `https://chat.whatsapp.com/${code}`
          } catch (err) {
            inviteLink = '❌ 𝐄𝐫𝐫𝐨𝐫𝐞 𝐥𝐢𝐧𝐤'
          }
        }

        txt += `╭――――――――――――――――⊱\n`
        txt += `│ ${index + 1}. *${groupName}*\n`
        txt += `│ 👥 *𝐌𝐞𝐦𝐛𝐫𝐢:* ${participants}\n`
        txt += `│ 🤖 *𝐁𝐨𝐭 𝐀𝐝𝐦𝐢𝐧:* ${isBotAdmin}\n`
        txt += `│ 🆔 *𝐈𝐃:* ${groupId}\n`
        txt += `│ 🔗 *𝐋𝐢𝐧𝐤:* ${inviteLink}\n`
        txt += `╰――――――――――――――――⊱\n\n`
      }

      txt += `╰━━━━━━━━━━━━━━━━━━╯`

      await conn.sendMessage(m.chat, {
        text: txt
      }, { quoted: m })

    } catch (error) {
      console.error('❌ Errore listagruppi:', error)
      await conn.sendMessage(m.chat, {
        text: '❌ *𝐄𝐫𝐫𝐨𝐫𝐞 𝐧𝐞𝐥 𝐜𝐚𝐫𝐢𝐜𝐚𝐫𝐞 𝐥𝐚 𝐥𝐢𝐬𝐭𝐚 𝐠𝐫𝐮𝐩𝐩𝐢*'
      }, { quoted: m })
    }
  }
}