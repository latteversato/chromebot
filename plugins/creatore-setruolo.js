import { getUser, forceSave } from '../database.js'

export default {
    command: ['setruolo'],
    owner: true,
    
    async execute(m, { conn, args, command, usedPrefix }) {
        if (!m.quoted) {
            return conn.sendMessage(m.chat, {
                text: `📝 *𝐂𝐎𝐌𝐄 𝐔𝐒𝐀𝐑𝐄*\n\nRispondi al messaggio della persona a cui vuoi assegnare un ruolo.\n\n📌 *Esempio:* .setruolo vip\n📌 *Esempio:* .setruolo premium\n📌 *Esempio:* .setruolo moderatore`
            }, { quoted: m })
        }

        if (!args[0]) {
            return conn.sendMessage(m.chat, {
                text: `❌ *Devi specificare un ruolo!*\n\nEsempio: .setruolo vip`
            }, { quoted: m })
        }

        const targetUser = m.quoted.sender
        const ruolo = args.join(' ').toLowerCase()

        const user = getUser(targetUser, true)
        const oldRole = user.ruolo || 'nessuno'
        
        user.ruolo = ruolo
        forceSave()

        let nomeTarget = 'Utente'
        try {
            nomeTarget = await conn.getName(targetUser) || targetUser.split('@')[0]
        } catch {
            nomeTarget = targetUser.split('@')[0]
        }

        const messaggio = `╔══✿ 𝐑𝐔𝐎𝐋𝐎 𝐀𝐒𝐒𝐄𝐆𝐍𝐀𝐓𝐎 ✿══╗
║
║ 👤 *Utente:* ${nomeTarget}
║ 📱 *Numero:* ${targetUser.split('@')[0]}
║
║ 🎖 *Vecchio ruolo:* ${oldRole}
║ 🎯 *Nuovo ruolo:* ${ruolo}
║
║ ✅ *Ruolo assegnato con successo!*
║
╚══════════════════╝`

        await conn.sendMessage(m.chat, {
            text: messaggio,
            contextInfo: {
                mentionedJid: [targetUser]
            }
        }, { quoted: m })
    }
}