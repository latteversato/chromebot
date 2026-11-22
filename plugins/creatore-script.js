import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
  command: ['offscript', 'onscript'],
  owner: true,
  
  async execute(m, { conn, args, command }) {
    if (!args[0]) {
      return conn.sendMessage(m.chat, {
        text: '❌ *𝐒𝐜𝐫𝐢𝐯𝐢 𝐢𝐥 𝐧𝐨𝐦𝐞 𝐝𝐞𝐥𝐥𝐨 𝐬𝐜𝐫𝐢𝐩𝐭*\n\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨: .offscript menu'
      }, { quoted: m })
    }

    let file = args[0]
    if (!file.endsWith('.js')) file += '.js'

    const filePath = path.join(__dirname, '../plugins', file)
    
    if (!fs.existsSync(filePath)) {
      return conn.sendMessage(m.chat, {
        text: `❌ *𝐅𝐢𝐥𝐞 "${file}" 𝐧𝐨𝐧 𝐭𝐫𝐨𝐯𝐚𝐭𝐨*`
      }, { quoted: m })
    }

    let content = fs.readFileSync(filePath, 'utf-8')

    if (command === 'offscript') {
      if (content.includes('/*') && content.includes('*/')) {
        return conn.sendMessage(m.chat, {
          text: `⚠️ *𝐒𝐜𝐫𝐢𝐩𝐭 "${file}" è 𝐠𝐢à 𝐬𝐩𝐞𝐧𝐭𝐨*`
        }, { quoted: m })
      }
      
      const lines = content.split('\n')
      const preservedLine = lines.find(line => line.includes('ok'))
      const rest = lines.filter(line => !line.includes('ok'))
      const newContent = `${preservedLine || ''}\n/*\n${rest.join('\n')}\n*/`
      
      fs.writeFileSync(filePath, newContent)
      
      return conn.sendMessage(m.chat, {
        text: `✅ *𝐒𝐜𝐫𝐢𝐩𝐭 "${file}" 𝐬𝐩𝐞𝐧𝐭𝐨*`
      }, { quoted: m })
    }

    if (command === 'onscript') {
      if (!content.includes('/*') || !content.includes('*/')) {
        return conn.sendMessage(m.chat, {
          text: `⚠️ *𝐒𝐜𝐫𝐢𝐩𝐭 "${file}" è 𝐠𝐢à 𝐚𝐜𝐜𝐞𝐬𝐨*`
        }, { quoted: m })
      }
      
      const newContent = content
        .replace(/^\/\*/gm, '')
        .replace(/\*\/$/gm, '')
        .trim()
      
      fs.writeFileSync(filePath, newContent)
      
      return conn.sendMessage(m.chat, {
        text: `✅ *𝐒𝐜𝐫𝐢𝐩𝐭 "${file}" 𝐫𝐢𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨*`
      }, { quoted: m })
    }
  }
}