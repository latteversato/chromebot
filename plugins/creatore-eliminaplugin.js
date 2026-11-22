import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  command: ['deleteplugin', 'dp'],
  owner: true,
  
  async execute(m, { conn, args }) {
    if (!args[0]) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐈𝐧𝐬𝐞𝐫𝐢𝐬𝐜𝐢 𝐢𝐥 𝐧𝐨𝐦𝐞 𝐝𝐞𝐥 𝐩𝐥𝐮𝐠𝐢𝐧 𝐝𝐚 𝐞𝐥𝐢𝐦𝐢𝐧𝐚𝐫𝐞*\n\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨: .dp menu'
      }, { quoted: m })
    }
    
    let pluginName = args[0].replace('.js', '')
    let file = path.join(__dirname, '../plugins', `${pluginName}.js`)
    
    try {
      if (!fs.existsSync(file)) {
        return conn.sendMessage(m.chat, {
          text: `❌ *𝐈𝐥 𝐩𝐥𝐮𝐠𝐢𝐧 "${pluginName}" 𝐧𝐨𝐧 𝐞𝐬𝐢𝐬𝐭𝐞*`
        }, { quoted: m })
      }
      
      fs.unlinkSync(file)
      
      await conn.sendMessage(m.chat, {
        text: `✅ *𝐏𝐥𝐮𝐠𝐢𝐧 eliminato*\n\n📁 ${pluginName}.js`
      }, { quoted: m })
      
    } catch (error) {
      console.error('❌ Errore deleteplugin:', error)
      await conn.sendMessage(m.chat, {
        text: '❌ *𝐄𝐫𝐫𝐨𝐫𝐞 𝐝𝐮𝐫𝐚𝐧𝐭𝐞 𝐥\'𝐞𝐥𝐢𝐦𝐢𝐧𝐚𝐳𝐢𝐨𝐧𝐞*'
      }, { quoted: m })
    }
  }
}