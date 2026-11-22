export default {
  command: ['resetprefix', 'resettaprefisso'],
  owner: true,
  
  async execute(m, { conn }) {
    global.prefissoComandi = '.'
    global.prefix = new RegExp('^[' + (global.opts?.prefix || '‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')

    await conn.sendMessage(m.chat, {
      text: '✅ *𝐏𝐫𝐞𝐟𝐢𝐬𝐬𝐨 𝐫𝐢𝐩𝐫𝐢𝐬𝐭𝐢𝐧𝐚𝐭𝐨*\n\n📌 𝐏𝐫𝐞𝐟𝐢𝐬𝐬𝐨 𝐨𝐫𝐢𝐠𝐢𝐧𝐚𝐥𝐞: *.*'
    }, { quoted: m })
  }
}