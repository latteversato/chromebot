function toJid(input) {
  if (!input) return null
  input = input.toString().trim().toLowerCase()

  if (input.startsWith('@')) input = input.slice(1)
  if (input.endsWith('@s.whatsapp.net')) return input

  const num = input.replace(/\D/g, '')
  return num.length >= 10 ? `${num}@s.whatsapp.net` : null
}

function extractTargets(m, mentionedJid) {
  let targets = []

  if (mentionedJid?.length) {
    targets.push(...mentionedJid)
  }

  if (m.quoted?.sender) {
    targets.push(m.quoted.sender)
  }

  if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
    targets.push(...m.message.extendedTextMessage.contextInfo.mentionedJid)
  }

  return [...new Set(targets.map(toJid).filter(Boolean))]
}

// numero reale se noto (gestione LID), altrimenti le cifre del jid
function numberOf(jid) {
  return global.jidTools?.phoneOf(jid) || jid.split('@')[0].replace(/\D/g, '')
}

function getList(chatId) {
  const list = global.whitelist?.[chatId]
  return Array.isArray(list) ? list : []
}

export default {
    command: ['addwl', 'delwl', 'listwl', 'resetwl', 'resetallwl'],
    owner: true,

    async execute(m, { conn, text, command, mentionedJid }) {
        const prefix = global.prefissoComandi || '.'
        const sistemaRuoli = global.sistemaRuoli

        if (!global.whitelist) global.whitelist = {}

        // ━━━ RESET DI TUTTI I GRUPPI (funziona ovunque, anche in privato) ━━━
        if (command === 'resetallwl') {
            if (!text || text.toLowerCase() !== 'conferma') {
                const gruppi = Object.keys(global.whitelist).filter(k => getList(k).length).length
                return conn.sendMessage(m.chat, {
                    text: `⚠️ *ATTENZIONE* ⚠️\n\nStai per eliminare la whitelist di *TUTTI* i gruppi (${gruppi} gruppi con utenti in whitelist).\nPer confermare, scrivi:\n${prefix}resetallwl conferma`
                }, { quoted: m })
            }

            try {
                let totale = 0
                for (const key of Object.keys(global.whitelist)) {
                    totale += getList(key).length
                    delete global.whitelist[key]
                }
                sistemaRuoli._saveWhitelist()

                return conn.sendMessage(m.chat, {
                    text: `✅ *Tutte le whitelist sono state resettate*\n\n🗑️ Utenti rimossi: ${totale}`
                }, { quoted: m })
            } catch (e) {
                return conn.sendMessage(m.chat, {
                    text: '❌ *Errore nel reset delle whitelist*'
                }, { quoted: m })
            }
        }

        // ━━━ DA QUI IN POI SOLO NEI GRUPPI ━━━
        if (!m.isGroup) {
            return conn.sendMessage(m.chat, { text: '❌ Questo comando funziona solo nei gruppi!' }, { quoted: m })
        }

        if (command === 'listwl') {
            const list = getList(m.chat)

            if (!list.length) {
                return conn.sendMessage(m.chat, {
                    text: '📭 *Nessun utente in whitelist in questo gruppo*'
                }, { quoted: m })
            }

            let msg = '╭━━━「 🛡️ WHITELIST 」━━━╮\n'
            let mentions = []

            const sorted = [...list].sort()

            for (let i = 0; i < sorted.length; i++) {
                const num = sorted[i]
                msg += `┃ ${i + 1}. @${num}\n`
                mentions.push(num + '@s.whatsapp.net')
            }

            msg += `╰━━━━━━━━━━━━━━━━━━╯\n`
            msg += `📌 *Totale:* ${sorted.length} utenti`

            return conn.sendMessage(m.chat, {
                text: msg,
                mentions
            }, { quoted: m })
        }

        if (command === 'resetwl') {
            if (!text || text.toLowerCase() !== 'conferma') {
                return conn.sendMessage(m.chat, {
                    text: `⚠️ *ATTENZIONE* ⚠️\n\nStai per resettare la whitelist di QUESTO gruppo.\nPer confermare, scrivi:\n${prefix}resetwl conferma`
                }, { quoted: m })
            }

            try {
                const rimossi = getList(m.chat).length
                delete global.whitelist[m.chat]
                sistemaRuoli._saveWhitelist()

                return conn.sendMessage(m.chat, {
                    text: `✅ *Whitelist resettata per questo gruppo*\n\n🗑️ Utenti rimossi: ${rimossi}`
                }, { quoted: m })
            } catch (e) {
                return conn.sendMessage(m.chat, {
                    text: '❌ *Errore nel reset della whitelist*'
                }, { quoted: m })
            }
        }

        if (command === 'addwl' || command === 'delwl') {
            const targets = extractTargets(m, mentionedJid)

            if (!targets.length) {
                return conn.sendMessage(m.chat, {
                    text: `❌ *Devi menzionare un utente o rispondere a un messaggio*\n\n📌 Esempio:\n${prefix}${command} @utente`
                }, { quoted: m })
            }

            const fatti = []
            const saltati = []
            const errori = []

            for (const jid of targets) {
                const giaIn = sistemaRuoli.isChatWhitelisted(jid, m.chat)

                if (command === 'addwl') {
                    if (giaIn) saltati.push(jid)
                    else if (sistemaRuoli.addWhitelist(jid, m.chat)) fatti.push(jid)
                    else errori.push(jid)
                } else {
                    if (!giaIn) saltati.push(jid)
                    else if (sistemaRuoli.removeWhitelist(jid, m.chat)) fatti.push(jid)
                    else errori.push(jid)
                }
            }

            const tag = (jid) => `@${numberOf(jid)}`
            const mentions = [...fatti, ...saltati, ...errori].map(j => numberOf(j) + '@s.whatsapp.net')

            let msg = ''

            if (fatti.length) {
                msg += command === 'addwl'
                    ? `🛡️ *Aggiunti alla whitelist di questo gruppo:*\n${fatti.map(tag).join('\n')}\n\n`
                    : `🗑️ *Rimossi dalla whitelist di questo gruppo:*\n${fatti.map(tag).join('\n')}\n\n`
            }

            if (saltati.length) {
                msg += command === 'addwl'
                    ? `✅ *Già in whitelist:*\n${saltati.map(tag).join('\n')}\n\n`
                    : `❌ *Non erano in whitelist:*\n${saltati.map(tag).join('\n')}\n\n`
            }

            if (errori.length) {
                msg += `❌ *Errore nel salvare:*\n${errori.map(tag).join('\n')}\n\n`
            }

            return conn.sendMessage(m.chat, {
                text: msg.trim(),
                mentions
            }, { quoted: m })
        }
    }
}
