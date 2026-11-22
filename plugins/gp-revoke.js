export default {
  command: ['resetlink', 'revoca', 'azzeralink'],
  group: true,
  admin: true,
  botAdmin: true,

  async execute(m, { conn }) {
    const chat = m.chat

    try {
     
       const res = await conn.groupRevokeInvite(chat)
      let code = typeof res === 'string' ? res : (res?.code || res?.inviteCode || null)

      
      if (!code) code = await conn.groupInviteCode(chat)
      if (!code) throw new Error('codice non ricevuto')

      const autore = String(m.sender).split('@')[0].split(':')[0]
      await conn.sendMessage(chat, {
        text:
          `🔗 *𝐋𝐢𝐧𝐤 𝐫𝐞𝐢𝐦𝐩𝐨𝐬𝐭𝐚𝐭𝐨*\n\n` +
          `𝐈𝐥 𝐯𝐞𝐜𝐜𝐡𝐢𝐨 𝐥𝐢𝐧𝐤 𝐧𝐨𝐧 𝐟𝐮𝐧𝐳𝐢𝐨𝐧𝐚 𝐩𝐢𝐮̀.\n` +
          `𝐑𝐞𝐢𝐦𝐩𝐨𝐬𝐭𝐚𝐭𝐨 𝐝𝐚 @${autore}\n`,
        mentions: [m.sender]
      }, { quoted: m })
    } catch (e) {
      const msg = String(e?.message || e)
      const permessi = /not-authorized|forbidden|403/i.test(msg)
      await conn.sendMessage(chat, {
        text: permessi
          ? '❌ *𝐍𝐨𝐧 𝐡𝐨 𝐢 𝐩𝐞𝐫𝐦𝐞𝐬𝐬𝐢 𝐩𝐞𝐫 𝐫𝐞𝐢𝐦𝐩𝐨𝐬𝐭𝐚𝐫𝐞 𝐢𝐥 𝐥𝐢𝐧𝐤*\n𝐒𝐢 𝐚𝐬𝐬𝐢𝐜𝐮𝐫𝐚 𝐜𝐡𝐞 𝐢𝐨 𝐬𝐢𝐚 𝐚𝐝𝐦𝐢𝐧.'
          : `❌ *𝐄𝐫𝐫𝐨𝐫𝐞 𝐧𝐞𝐥 𝐫𝐞𝐢𝐦𝐩𝐨𝐬𝐭𝐚𝐫𝐞 𝐢𝐥 𝐥𝐢𝐧𝐤*\n${msg}`
      }, { quoted: m })
    }
  }
}