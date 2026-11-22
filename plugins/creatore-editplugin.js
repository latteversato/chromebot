import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default {
    command: ['editplugin', 'editpl'],
    desc: 'Modifica un plugin esistente',
    category: 'Owner',
    owner: true,

    async execute(m, extra = {}) {
        const conn = extra.conn || global.conn
        const args = extra.args || []
        const text = extra.text || (args.length ? args.join(' ') : '')
        const chat = extra.chat || m.chat
        const quoted = extra.quoted || m.quoted || null

        if (!text) {
            return conn.sendMessage(chat, {
                text: `${global.emoji?.error || '❌'} *Usa:* ${global.prefissoComandi}editplugin <nome>\n\n` +
                      `${global.emoji?.info || 'ℹ️'} Rispondi al messaggio con il nuovo codice`
            }, { quoted: m })
        }

        if (!quoted || !quoted.text) {
            return conn.sendMessage(chat, {
                text: `${global.emoji?.error || '❌'} Rispondi al messaggio che contiene il nuovo codice da inserire`
            }, { quoted: m })
        }

        const pluginName = text.toLowerCase().replace(/[^a-z0-9-_]/gi, '')
        const pluginPath = path.join(__dirname, `${pluginName}.js`)

        try {
            if (!fs.existsSync(pluginPath)) {
                return conn.sendMessage(chat, {
                    text: `${global.emoji?.error || '❌'} Il plugin "${pluginName}" non esiste`
                }, { quoted: m })
            }

            fs.writeFileSync(pluginPath, quoted.text)

            await conn.sendMessage(chat, {
                text: `${global.emoji?.success || '✅'} Plugin "${pluginName}" modificato con successo!\n\n` +
                      `${global.emoji?.info || 'ℹ️'} Ricaricamento automatico...`
            }, { quoted: m })

        } catch (error) {
            await conn.sendMessage(chat, {
                text: `${global.emoji?.error || '❌'} Errore: ${error.message}`
            }, { quoted: m })
        }
    }
}