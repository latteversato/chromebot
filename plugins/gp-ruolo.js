import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'db')
const ROLES_FILE = path.join(DB_DIR, 'ruoli-custom.json')
const ASSIGN_FILE = path.join(DB_DIR, 'ruoli-utenti.json')

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
if (!fs.existsSync(ROLES_FILE)) fs.writeFileSync(ROLES_FILE, '{}')
if (!fs.existsSync(ASSIGN_FILE)) fs.writeFileSync(ASSIGN_FILE, '{}')

function loadRoles() {
    try { return JSON.parse(fs.readFileSync(ROLES_FILE, 'utf8')) } catch { return {} }
}

function saveRoles(data) {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(data, null, 2))
}

function loadAssignments() {
    try { return JSON.parse(fs.readFileSync(ASSIGN_FILE, 'utf8')) } catch { return {} }
}

function saveAssignments(data) {
    fs.writeFileSync(ASSIGN_FILE, JSON.stringify(data, null, 2))
}

export function getUserRoles(jid) {
    const assignments = loadAssignments()
    const roles = loadRoles()
    const names = assignments[jid] || []
    return names.map(n => roles[n]).filter(Boolean)
}

const COLOR_NAMES = {
    rosso: '#FF4444', giallo: '#FFD700', verde: '#4CAF50', blu: '#2196F3',
    viola: '#9C27B0', nero: '#1a1a1a', bianco: '#FFFFFF', arancione: '#FF9800',
    rosa: '#FF4FA3', azzurro: '#00BCD4', oro: '#FFD700', argento: '#C0C0C0',
    ciano: '#00E5FF', magenta: '#E040FB', grigio: '#9E9E9E'
}

function resolveColor(name) {
    const key = name.toLowerCase().trim()
    if (COLOR_NAMES[key]) return COLOR_NAMES[key]
    if (/^#[0-9a-f]{6}$/i.test(key)) return key
    return null
}

async function checkIsBotOwner(jid) {
    if (!jid) return false
    const num = jid.split('@')[0]

    if (global.owner) {
        const isGlobalOwner = global.owner.some(o => {
            const oId = Array.isArray(o) ? o[0] : o
            return oId.toString() === num || oId.toString() + '@s.whatsapp.net' === jid
        })
        if (isGlobalOwner) return true
    }

    try {
        const ruoliPath = path.join(process.cwd(), 'ruoli.js')
        if (fs.existsSync(ruoliPath)) {
            const mod = await import(`file://${ruoliPath}?update=${Date.now()}`)
            const owners = [
                ...(mod.owner || []),
                ...(mod.rowner || []),
                ...(Array.isArray(mod.default) ? mod.default : [])
            ].map(o => (Array.isArray(o) ? o[0] : o).toString())
            if (owners.includes(num)) return true
        }
    } catch (e) {}

    return false
}

function extractTargets(m, mentionedJid) {
    let targets = []
    if (mentionedJid?.length) targets.push(...mentionedJid)
    if (m.quoted?.sender) targets.push(m.quoted.sender)
    return [...new Set(targets)]
}

export default {
    command: ['ruolo'],

    async execute(m, extra) {
        const { conn, mentionedJid, isOwner, args, text } = extra
        const chat = m.chat
        const sender = m.sender

        if (!m.isGroup) return conn.sendMessage(chat, {
            text: '❌ Comando utilizzabile solo nei gruppi.'
        }, { quoted: m })

        const groupMetadata = await conn.groupMetadata(chat).catch(() => ({}))
        const participants = groupMetadata?.participants || []
        const senderInGroup = participants.find(u => u.id === sender)
        const isSenderOwner = await checkIsBotOwner(sender) || isOwner
        const isSenderAdmin = senderInGroup?.admin === 'admin' || senderInGroup?.admin === 'superadmin'

        if (!isSenderOwner && !isSenderAdmin) {
            return conn.sendMessage(chat, {
                text: '❌ Solo admin o owner possono gestire i ruoli.'
            }, { quoted: m })
        }

        const sub = args[0]?.toLowerCase()
        const roles = loadRoles()

        if (sub === 'create') {
            const nome = args.slice(1).join(' ').toLowerCase().trim()
            if (!nome) return conn.sendMessage(chat, {
                text: '❌ Uso: .ruolo create <nome>'
            }, { quoted: m })

            if (roles[nome]) return conn.sendMessage(chat, {
                text: `❌ Il ruolo *${nome}* esiste già.`
            }, { quoted: m })

            roles[nome] = {
                nome,
                colori: ['#FFFFFF'],
                sticker: null,
                createdBy: sender,
                createdAt: Date.now()
            }
            saveRoles(roles)

            return conn.sendMessage(chat, {
                text: `✅ Ruolo *${nome}* creato.\nImposta colore con .ruolo colore ${nome} <colore1>/<colore2>\nImposta sticker rispondendo a uno sticker con .ruolo sticker ${nome}`
            }, { quoted: m })
        }

        if (sub === 'colore') {
            const rest = args.slice(1)
            const colorArg = rest[rest.length - 1]
            const nome = rest.slice(0, -1).join(' ').toLowerCase().trim()
            if (!nome || !colorArg) return conn.sendMessage(chat, {
                text: '❌ Uso: .ruolo colore <nome> <colore1>/<colore2>\nColori disponibili: ' + Object.keys(COLOR_NAMES).join(', ')
            }, { quoted: m })

            if (!roles[nome]) return conn.sendMessage(chat, {
                text: `❌ Il ruolo *${nome}* non esiste.`
            }, { quoted: m })

            const parts = colorArg.split('/').map(s => s.trim()).filter(Boolean)
            if (parts.length > 2) return conn.sendMessage(chat, {
                text: '❌ Massimo 2 colori per ruolo.'
            }, { quoted: m })

            const resolved = parts.map(resolveColor)
            if (resolved.includes(null)) return conn.sendMessage(chat, {
                text: '❌ Colore non valido.\nColori disponibili: ' + Object.keys(COLOR_NAMES).join(', ') + '\nOppure un hex tipo #FF0000'
            }, { quoted: m })

            roles[nome].colori = resolved
            saveRoles(roles)

            return conn.sendMessage(chat, {
                text: `✅ Colore del ruolo *${nome}* aggiornato: ${parts.join(' → ')}`
            }, { quoted: m })
        }

        if (sub === 'sticker') {
            const nome = args.slice(1).join(' ').toLowerCase().trim()
            if (!nome) return conn.sendMessage(chat, {
                text: '❌ Uso: rispondi a uno sticker con .ruolo sticker <nome>'
            }, { quoted: m })

            if (!roles[nome]) return conn.sendMessage(chat, {
                text: `❌ Il ruolo *${nome}* non esiste.`
            }, { quoted: m })

            const contextInfo = m.message?.extendedTextMessage?.contextInfo
            const quotedStanzaId = contextInfo?.stanzaId
            const quotedParticipant = contextInfo?.participant
            const quotedMessageRaw = m.quoted?.message || contextInfo?.quotedMessage
            const stickerMsg = quotedMessageRaw?.stickerMessage

            if (!stickerMsg) return conn.sendMessage(chat, {
                text: '❌ Rispondi a uno sticker per impostarlo come icona del ruolo.'
            }, { quoted: m })

            const fakeMsg = {
                key: {
                    remoteJid: chat,
                    fromMe: false,
                    id: quotedStanzaId || m.quoted?.id || '',
                    participant: quotedParticipant || m.quoted?.participant || undefined
                },
                message: { stickerMessage: stickerMsg }
            }

            try {
                let buffer
                if (typeof conn.downloadMediaMessage === 'function') {
                    buffer = await conn.downloadMediaMessage(fakeMsg)
                } else if (typeof conn.downloadM === 'function') {
                    buffer = await conn.downloadM(stickerMsg, 'sticker')
                } else {
                    const { downloadContentFromMessage } = await import('@realvare/baileys')
                    const stream = await downloadContentFromMessage(stickerMsg, 'sticker')
                    const chunks = []
                    for await (const chunk of stream) chunks.push(chunk)
                    buffer = Buffer.concat(chunks)
                }

                if (!buffer || !buffer.length) throw new Error('Buffer vuoto ricevuto dal download')

                const STICKER_DIR = path.join(DB_DIR, 'ruoli-sticker')
                if (!fs.existsSync(STICKER_DIR)) fs.mkdirSync(STICKER_DIR, { recursive: true })
                const filePath = path.join(STICKER_DIR, `${nome}.webp`)
                fs.writeFileSync(filePath, buffer)

                roles[nome].sticker = filePath
                saveRoles(roles)

                return conn.sendMessage(chat, {
                    text: `✅ Sticker del ruolo *${nome}* salvato.`
                }, { quoted: m })
            } catch (err) {
                console.error('Errore salvataggio sticker ruolo:', err)
                return conn.sendMessage(chat, {
                    text: `❌ Errore nel salvare lo sticker: ${err.message || err}`
                }, { quoted: m })
            }
        }

        if (sub === 'add' || sub === 'remove') {
            const targets = extractTargets(m, mentionedJid)
            const targetNumbers = targets.map(t => t.split('@')[0])

            const nome = args.slice(1)
                .filter(a => !a.startsWith('@') && !targetNumbers.includes(a.replace('@', '')))
                .join(' ')
                .toLowerCase()
                .trim()

            if (!targets.length || !nome) return conn.sendMessage(chat, {
                text: `❌ Uso: .ruolo ${sub} @utente <nome ruolo>`
            }, { quoted: m })

            if (!roles[nome]) return conn.sendMessage(chat, {
                text: `❌ Il ruolo *${nome}* non esiste.`
            }, { quoted: m })

            const assignments = loadAssignments()

            for (const jid of targets) {
                if (!assignments[jid]) assignments[jid] = []
                if (sub === 'add') {
                    if (!assignments[jid].includes(nome)) assignments[jid].push(nome)
                } else {
                    assignments[jid] = assignments[jid].filter(r => r !== nome)
                }
            }
            saveAssignments(assignments)

            const verb = sub === 'add' ? 'assegnato a' : 'rimosso da'
            return conn.sendMessage(chat, {
                text: `✅ Ruolo *${nome}* ${verb} ${targets.length} utente/i.`,
                mentions: targets
            }, { quoted: m })
        }

        if (sub === 'delete') {
            const nome = args.slice(1).join(' ').toLowerCase().trim()
            if (!nome) return conn.sendMessage(chat, {
                text: '❌ Uso: .ruolo delete <nome>'
            }, { quoted: m })

            if (!roles[nome]) return conn.sendMessage(chat, {
                text: `❌ Il ruolo *${nome}* non esiste.`
            }, { quoted: m })

            delete roles[nome]
            saveRoles(roles)

            const assignments = loadAssignments()
            for (const jid of Object.keys(assignments)) {
                assignments[jid] = assignments[jid].filter(r => r !== nome)
            }
            saveAssignments(assignments)

            return conn.sendMessage(chat, {
                text: `✅ Ruolo *${nome}* eliminato.`
            }, { quoted: m })
        }

        if (sub === 'list') {
            const names = Object.keys(roles)
            if (!names.length) return conn.sendMessage(chat, {
                text: '❌ Nessun ruolo creato ancora.'
            }, { quoted: m })

            const list = names.map(n => `• ${n} (${roles[n].colori.join('/')})${roles[n].sticker ? ' 🏷️' : ''}`).join('\n')
            return conn.sendMessage(chat, {
                text: `📋 *Ruoli esistenti:*\n\n${list}`
            }, { quoted: m })
        }

        return conn.sendMessage(chat, {
            text: `📋 *Comandi .ruolo*\n\n.ruolo create <nome>\n.ruolo colore <nome> <colore1>/<colore2>\n.ruolo sticker <nome> (in risposta a uno sticker)\n.ruolo add @utente <nome>\n.ruolo remove @utente <nome>\n.ruolo delete <nome>\n.ruolo list`
        }, { quoted: m })
    }
}