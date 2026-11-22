export default {
  command: ['admins', '@admins', 'dmins'],
  group: true,
  
  async execute(m, { conn, participants, groupMetadata, args }) {
    const normalizeJid = (jid) => {
      if (!jid) return null
      return jid.split(':')[0]
    }
    
    if (!participants || !Array.isArray(participants)) {
      console.error('❌ participants non disponibile:', participants);
      return conn.sendMessage(m.chat, {
        text: '❌ *Errore nel caricamento dei partecipanti*'
      }, { quoted: m });
    }
    
    const groupAdmins = participants
      .filter(p => p && p.admin)
      .map(p => ({
        ...p,
        id: normalizeJid(p.id || p.jid || p.user)
      }))
      .filter(p => p.id)
    
    if (groupAdmins.length === 0) {
      return conn.sendMessage(m.chat, {
        text: '❌ *Nessun admin trovato in questo gruppo*'
      }, { quoted: m });
    }
    
    const listAdmin = groupAdmins
      .map((v, i) => `👑 ${i + 1}. @${v.id.split('@')[0]}`)
      .join('\n');

    const owner = groupMetadata?.owner ||
      groupAdmins.find(p => p.admin === 'superadmin')?.id ||
      `${m.chat.split`-`[0]}@s.whatsapp.net`;

    const message = args.join(' ') || '⚠️ Nessun messaggio specificato';

    const fakeMsg = {
      key: { 
        participants: "0@s.whatsapp.net", 
        fromMe: false, 
        id: "AdminAlert" 
      },
      message: {
        contactMessage: {
          displayName: "𝗔𝗱𝗺𝗶𝗻 𝗖𝗵𝗿𝗼𝗺𝗲 𝗕𝗼𝘁",
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;Admin;;;\nFN:Admin\nEND:VCARD`
        }
      },
      participant: "0@s.whatsapp.net"
    };

    const testo = `
╭━━━❰ ⚠️ 𝗔𝗟𝗘𝗥𝗧 𝗔𝗗𝗠𝗜𝗡 ⚠️ ❱━━━╮

💬 *𝗠𝗲𝘀𝘀𝗮𝗴𝗴𝗶𝗼:*
❝ ${message} ❞

👥 *𝗟𝗶𝘀𝘁𝗮 𝗔𝗱𝗺𝗶𝗻:*
${listAdmin}

╰━━━〔 📢 𝗖𝗛𝗥𝗢𝗠𝗘 𝗕𝗢𝗧 〕━━━╯
`.trim();

    await conn.sendMessage(m.chat, {
      text: testo,
      mentions: [...groupAdmins.map(v => v.id), owner].filter(Boolean)
    }, { quoted: fakeMsg });
  }
}