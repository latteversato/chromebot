import { getUser } from '../database.js'

const COLOR_NAMES = {
    rosso: '#FF5252', giallo: '#FFD700', verde: '#4CD964', blu: '#448AFF',
    viola: '#B266FF', nero: '#FFFFFF', bianco: '#FFFFFF', arancione: '#FFA726',
    rosa: '#FF6EC7', azzurro: '#29B6F6', oro: '#FFD700', argento: '#E0E0E0',
    ciano: '#18FFFF', magenta: '#FF4FE0', grigio: '#BDBDBD'
}

const RAINBOW_WORDS = ['rainbow', 'arcobaleno']
const RAINBOW_PALETTE = ['#FF5252', '#FFA726', '#FFD700', '#4CD964', '#29B6F6', '#B266FF', '#FF4FE0']

function resolveColor(name) {
    const key = name.toLowerCase().trim()
    if (RAINBOW_WORDS.includes(key)) return 'rainbow'
    if (COLOR_NAMES[key]) return COLOR_NAMES[key]
    if (/^#[0-9a-f]{6}$/i.test(key)) return key
    return null
}

export { RAINBOW_PALETTE }

export default {
    command: ['colore'],

    async execute(m, extra) {
        const { conn, text } = extra
        const chat = m.chat
        const sender = m.sender

        const nomeColore = text.trim()
        if (!nomeColore) {
            return conn.sendMessage(chat, {
                text: `🎨 Uso: .colore <nome colore>\n\nColori disponibili:\n${Object.keys(COLOR_NAMES).join(', ')}, rainbow\n\nOppure un codice hex, es: .colore #FF00AA`
            }, { quoted: m })
        }

        const hex = resolveColor(nomeColore)
        if (!hex) {
            return conn.sendMessage(chat, {
                text: `❌ Colore non valido.\nColori disponibili:\n${Object.keys(COLOR_NAMES).join(', ')}, rainbow`
            }, { quoted: m })
        }

        const user = getUser(sender, true)
        user.colore = hex
        user.coloreNome = nomeColore.toLowerCase()

        const label = hex === 'rainbow' ? '🌈 Rainbow' : nomeColore
        return conn.sendMessage(chat, {
            text: `✅ Colore del tuo nome impostato: *${label}*`
        }, { quoted: m })
    }
}