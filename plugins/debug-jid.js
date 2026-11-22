// Plugin di diagnostica: .jiddebug  (solo admin, in gruppo)
// Mostra come sono fatti i partecipanti e se la mappa LID -> numero funziona.
export default {
  command: ['jiddebug'],
  group: true,
  admin: true,

  async execute(m, { conn, participants }) {
    const tools = global.jidTools
    const info = {
      sender: m.sender,
      numeroRisolto: tools?.phoneOf(m.sender) || 'NON NOTO',
      botId: conn.user?.id,
      botLid: conn.user?.lid || null,
      esempioPartecipanti: (participants || []).slice(0, 3)
    }
    await conn.sendMessage(m.chat, {
      text: '```' + JSON.stringify(info, null, 2) + '```'
    }, { quoted: m })
  }
}
