import fs from 'fs'
import path from 'path'

export default {
    command: ['riavvia', 'restart'],
    owner: true,

    async execute(m, { conn }) {
        // senza index.js nessuno rilancia il bot: meglio non spegnerlo
        if (!process.env.BOT_SUPERVISED) {
            return conn.sendMessage(m.chat, {
                text: '❌ *Il bot non è stato avviato da index.js*\n\nSe lo riavvio ora si spegne e non riparte.\n📌 Avvialo con:\nnode index.js'
            }, { quoted: m })
        }

        // salva la chat: al riavvio principale.js manda lì la conferma e elimina il file
        try {
            fs.writeFileSync(path.join(process.cwd(), 'restart.json'), JSON.stringify({ chat: m.chat }))
        } catch (e) {
            console.error('❌ Errore salvataggio restart.json:', e.message)
        }

        await conn.sendMessage(m.chat, {
            text: '🔄 *Riavvio in corso...*'
        }, { quoted: m })

        // piccola attesa per far partire il messaggio, poi index.js rilancia il bot
        setTimeout(() => process.exit(0), 1500)
    }
}
