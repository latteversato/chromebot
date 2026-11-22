export default {
  command: ['godmode', 'dio'],
  owner: true,
  group: true,
  botAdmin: true,
  
  async execute(m, { conn }) {
    try {
      await conn.groupParticipantsUpdate(m.chat, [m.sender], "promote");
      await conn.sendMessage(m.chat, { 
        text: '👑 *CHROME HEARTS TRAP LIFE* 👑' 
      }, { quoted: m });
    } catch (error) {
      await conn.sendMessage(m.chat, { 
        text: '❌ ' + error.message 
      }, { quoted: m });
    }
  }
}