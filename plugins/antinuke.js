import { getChat, forceSave } from '../database.js'

// i partecipanti possono arrivare come stringa o come oggetto (id / phoneNumber)
const jidOf = (p) => (typeof p === 'string' ? p : p?.phoneNumber || p?.id || p?.jid || null)
const norm = (j) => (j && global.normalizeJid ? global.normalizeJid(j) : j)
const userOf = (j) => j.split('@')[0].split(':')[0]

export default {
    command: ['antinuke'],
    owner: true,
    group: true,
    botAdmin: true,

    async execute(m, { conn, args }) {
        const chatData = getChat(m.chat, true)

        if (chatData.antinuke === undefined) {
            chatData.antinuke = false
            forceSave()
        }

        const sub = args[0]?.toLowerCase?.()

        if (!sub || sub === 'stato') {
            const status = chatData.antinuke ? '🟢 ATTIVO' : '🔴 DISATTIVO'
            return conn.sendMessage(m.chat, {
                text: `╭─〔 ANTINUKE PROTETTO 〕
│ Stato: ${status}
│
│ Protegge: solo owner del bot e utenti in
│ whitelist (di questo gruppo) possono
│ promuovere o rimuovere admin.
│
│ Comandi:
│ • .antinuke on     → attiva protezione
│ • .antinuke off    → disattiva
│ • .antinuke stato  → vedi stato attuale
╰──────────────`,
            }, { quoted: m })
        }

        if (sub === 'on' || sub === 'off') {
            const nuovoStato = sub === 'on'
            if (nuovoStato === chatData.antinuke) {
                return conn.sendMessage(m.chat, {
                    text: `ℹ️ Antinuke è già ${nuovoStato ? 'attivo' : 'disattivato'}.`
                }, { quoted: m })
            }

            chatData.antinuke = nuovoStato
            forceSave()

            return conn.sendMessage(m.chat, {
                text: nuovoStato
                    ? '🛡️ *Antinuke attivato*\nDa ora solo owner e whitelist possono gestire gli admin.'
                    : '❌ *Antinuke disattivato*\nGestione admin tornata normale.',
            }, { quoted: m })
        }

        return conn.sendMessage(m.chat, {
            text: '❌ Comando non riconosciuto.\nUsa: .antinuke on / off / stato'
        }, { quoted: m })
    },

    // Qui solo le notifiche "X ha promosso Y".
    // La protezione vera (annullare l'azione, bloccare il gruppo) è gestisciAntinuke in principale.js.
    async groupUpdate(update, conn) {
        try {
            const { id: groupId, participants, action } = update

            if (!groupId?.endsWith('@g.us') || !participants?.length) return
            if (action !== 'promote' && action !== 'demote') return

            const actorJid = norm(jidOf(update.author || update.actor))
            if (!actorJid) return

            const chatData = getChat(groupId, false)
            const antinukeActive = chatData?.antinuke === true

            // owner, bot e whitelist del gruppo sono autorizzati
            const autorizzato = !!global.sistemaRuoli?.isWhitelisted?.(actorJid, groupId)

            // antinuke attivo + autore non autorizzato: l'avviso lo manda principale.js
            if (antinukeActive && !autorizzato) return

            for (const participant of participants) {
                const targetJid = norm(jidOf(participant))
                if (!targetJid) continue

                const actorNumber = userOf(actorJid)
                const targetNumber = userOf(targetJid)

                const text = action === 'promote'
                    ? `👑 @${actorNumber} ha promosso @${targetNumber} ad *amministratore*`
                    : `📉 @${actorNumber} ha rimosso @${targetNumber} dagli amministratori`

                await conn.sendMessage(groupId, {
                    text,
                    mentions: [actorJid, targetJid]
                }).catch(() => {})
            }
        } catch (err) {
            console.error('Errore antinuke groupUpdate:', err)
        }
    }
}
