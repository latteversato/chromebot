import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni __dirname in ambiente ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    command: ['listpl'],
    desc: 'Mostra la lista di tutti i plugin disponibili',
    category: 'Main',
    group: false,
    admin: false,

    async execute(m, extra) {
        const conn = extra?.conn || global.conn;
        const chat = m.chat;

        try {
            let pluginsPath = path.join(__dirname, '../plugins');

            if (!fs.existsSync(pluginsPath)) {
                return await conn.sendMessage(chat, { text: '❌ La cartella plugins non esiste!' }, { quoted: m });
            }

            let files = fs.readdirSync(pluginsPath).filter(file => file.endsWith('.js'));

            // Importa ogni plugin per leggere la proprietà 'perm' (opzionale)
            let plugins = files.map(file => {
                try {
                    let plugin = require(path.join(pluginsPath, file));
                    return plugin?.command ? file : null;
                } catch {
                    return file;
                }
            }).filter(Boolean);

            // Ordina alfabeticamente
            plugins.sort((a, b) => a.localeCompare(b));

            // Messaggio con solo tutti i plugin + numero totale
            let listMessage = 
`📦 *Lista di tutti i plugin* 📦

${plugins.map((p, i) => `│ ${i + 1}. ${p}`).join('\n')}

Totale plugin: ${plugins.length}`;

            await conn.sendMessage(chat, { text: listMessage }, { quoted: m });

        } catch (error) {
            await conn.sendMessage(chat, { text: `❌ Errore durante la lettura dei file: ${error.message}` }, { quoted: m });
        }
    }
};