// Plugin: checkban
// Uso: .checkban @utente | .checkban 393331234567 | rispondendo a un messaggio

const p = () => global.prefissoComandi || '.'

// Prova a ricavare il numero da un JID (gestisce anche i @lid dei gruppi)
async function jidToNumber(conn, chat, jid) {
    if (!jid) return null
    if (jid.endsWith('@lid') && chat?.endsWith('@g.us')) {
        try {
            const meta = await conn.groupMetadata(chat)
            const part = meta.participants.find(x => x.id === jid || x.lid === jid)
            const real = part?.phoneNumber || part?.jid
            if (real) return real.split('@')[0].split(':')[0]
        } catch {}
        return null
    }
    return jid.split('@')[0].split(':')[0]
}

// Controllo esistenza numero: usa sock.checknum se il tuo bot lo ha, altrimenti onWhatsApp
async function checkNumber(conn, number) {
    const jid = `${number}@s.whatsapp.net`
    try {
        if (typeof conn.checknum === 'function') {
            const r = await conn.checknum(number)
            if (typeof r === 'boolean') return { exists: r, jid }
            const first = Array.isArray(r) ? r[0] : r
            if (first && typeof first === 'object') return { exists: !!first.exists, jid: first.jid || jid }
        }
        const [res] = (await conn.onWhatsApp(jid)) || []
        return { exists: !!res?.exists, jid: res?.jid || jid }
    } catch (e) {
        return { exists: null, jid, error: e.message }
    }
}

function guessReason(number, exists) {
    if (exists) return null
    if (number.length < 8 || number.length > 15) return 'Lunghezza del numero non valida'
    if (number.startsWith('0')) return 'Prefisso internazionale mancante (es. 39 per l\'Italia)'
    return 'Non determinabile: WhatsApp non espone il motivo. Può essere un ban, una disattivazione o un numero mai registrato'
}

export default {
    command: ['checkban'],
    desc: 'Controlla se un numero è bannato su WhatsApp',
    category: 'Tools',

    async execute(m, extra) {
        const conn = extra?.conn || global.conn
        const chat = m.chat
        const text = extra.text || ''

        const reply = (t) => conn.sendMessage(chat, { text: t }, { quoted: m })

        // 1) menzione  2) messaggio quotato  3) testo
        let number = null
        const mention = m.mentionedJid?.[0] || m.quoted?.sender
        if (mention) number = await jidToNumber(conn, chat, mention)
        if (!number) number = text.replace(/[^0-9]/g, '')

        if (!number) {
            return reply(`❌ Specifica un utente o un numero!\nEsempio:\n• ${p()}checkban @utente\n• ${p()}checkban 393331234567`)
        }

        const { exists, jid, error } = await checkNumber(conn, number)

        if (exists === null) {
            return reply(`⚠️ Errore durante il controllo di *+${number}*\n${error || ''}`.trim())
        }

        // info extra se il numero esiste
        let extraInfo = ''
        if (exists) {
            try {
                const st = await conn.fetchStatus(jid)
                const bio = Array.isArray(st) ? st[0]?.status?.status : st?.status
                if (bio) extraInfo += `\n📝 Bio: ${bio}`
            } catch {}
        }

        const banned = !exists
        const reason = guessReason(number, exists)

        const msg =
            `🔎 *Check Ban*\n\n` +
            `📱 Numero: +${number}\n` +
            `🚫 Bannato: *${banned ? 'SÌ (probabile)' : 'NO'}*` +
            (reason ? `\n❓ Motivo: ${reason}` : '') +
            extraInfo

        return reply(msg)
    }
}