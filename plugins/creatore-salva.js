import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
    command: ['salva', 'save', 'saveplugin'],
    desc: 'Salva un plugin dalla risposta',
    category: 'Owner',
    owner: true,

    async execute(m, extra = {}) {
        const conn   = extra.conn || global.conn
        const args   = extra.args || []
        const text   = extra.text || (args.length ? args.join(' ') : '')
        const chat   = extra.chat || m.chat
        const sender = extra.sender || m.sender

        const quoted = extra.quoted || m.quoted || m.msg?.contextInfo?.quotedMessage || null

        if (!conn) {
            console.log('ERRORE: conn non definito nel plugin salva')
            return
        }

        if (!text) {
            return conn.sendMessage(chat, {
                text: `${global.emoji?.error || '❌'} *Usa:* ${global.prefissoComandi}salva <nome>\n\n` +
                      `${global.emoji?.info || 'ℹ️'} Rispondi a un messaggio con il codice del plugin`
            }, { quoted: m })
        }

        if (!quoted || !quoted.text) {
            return conn.sendMessage(chat, {
                text: `${global.emoji?.error || '❌'} Rispondi al messaggio con il codice del plugin!`
            }, { quoted: m })
        }

        const pluginName = text.toLowerCase().replace(/[^a-z0-9-_]/gi, '')
        const pluginCode = quoted.text
        const pluginPath = path.join(__dirname, `${pluginName}.js`)

        try {
            const pluginsDir = path.dirname(pluginPath)
            if (!fs.existsSync(pluginsDir)) {
                fs.mkdirSync(pluginsDir, { recursive: true })
            }

            fs.writeFileSync(pluginPath, pluginCode)

            await conn.sendMessage(chat, {
                text: `${global.emoji?.success || '✅'} Plugin salvato!\n` +
                      `📁 ${pluginName}.js\n\n` +
                      `${global.emoji?.info || 'ℹ️'} Ricaricamento automatico...`
            }, { quoted: m })

        } catch (error) {
            await conn.sendMessage(chat, {
                text: `${global.emoji?.error || '❌'} Errore: ${error.message}`
            }, { quoted: m })
        }
    }
}