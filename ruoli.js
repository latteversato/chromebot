import path from "path"
import fs from "fs"
import { fileURLToPath } from 'url'
import vipManager from './vipManager.js'
const _digits = (j) => (j || '').toString().split('@')[0].split(':')[0].replace(/\D/g, '')
const candidates = (j) => global.jidTools?.candidates(j) || [_digits(j)].filter(Boolean)
const phoneOf = (j) => global.jidTools?.phoneOf(j) || null
const learnParticipants = (l) => global.jidTools?.learnParticipants(l)
const participantMatches = (p, j) => global.jidTools ? global.jidTools.participantMatches(p, j) : false

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

global.owner = [
    ['447518154201', 'filo', true],
    ['584169222239', 'seba', true],
    ['390935931356', 'tqx gays', true]
]

global.prefissoComandi = '.'

global.emoji = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    bot: '🤖',
    vip: '👑',
    owner: '👑',
    admin: '👑',
    premium: '⭐'
}

global.messaggi = {
    soloOwner: `${global.emoji.owner} Solo l'owner può usare questo comando!`,
    soloVip: `${global.emoji.vip} Solo gli utenti VIP possono usare questo comando!`,
    soloWhitelist: `${global.emoji.info} Solo gli utenti in whitelist possono usare questo comando!`,
    soloAdmin: `${global.emoji.admin} Solo gli admin del gruppo possono usare questo comando!`,
    soloBotAdmin: `${global.emoji.bot} Devo essere admin per usare questo comando!`,
    soloPremium: `${global.emoji.premium} Solo utenti premium possono usare questo comando!`,
    soloGroup: `${global.emoji.info} Questo comando è solo per i gruppi!`,
    soloPrivate: `${global.emoji.info} Questo comando è solo per chat private!`
}

if (!global.db) global.db = { data: { users: {}, chats: {} } }
if (!global.db.data) global.db.data = { users: {}, chats: {} }
if (!global.db.data.users) global.db.data.users = {}
if (!global.db.data.chats) global.db.data.chats = {}

if (!global.whitelist) global.whitelist = {}

function cleanNum(jid) {
    return (jid || '').toString().split('@')[0].split(':')[0].replace(/\D/g, '')
}

export default {
    isOwner(sender) {
        if (!sender) return false
        const nums = candidates(sender)
        return global.owner.some(ownerData => {
            const ownerNum = Array.isArray(ownerData) ? ownerData[0] : ownerData
            return nums.includes(ownerNum.toString().replace(/\D/g, ''))
        })
    },
    
    isROwner(sender, conn) {
        if (!sender) return false
        const senderNums = candidates(sender)
        if (!senderNums.length) return false
        const nums = (global.owner || []).map(o => cleanNum(Array.isArray(o) ? o[0] : o))
        try {
            for (const id of [conn?.user?.id, conn?.user?.lid]) {
                const n = cleanNum(id)
                if (n) nums.push(n)
            }
        } catch {}
        return nums.some(n => senderNums.includes(n))
    },
    
    isVip(sender, chatId) {
        if (this.isOwner(sender) || this.isROwner(sender, global.conn)) {
            return true
        }
        
        if (chatId && chatId.includes('@g.us')) {
            return candidates(sender).some(n => vipManager.isVip(chatId, n))
        }
        
        return false
    },

    // Whitelist globale: valida per qualsiasi chat/gruppo.
    isGlobalWhitelisted(sender) {
        if (!sender) return false
        const list = global.whitelist?.global
        if (!Array.isArray(list)) return false
        return candidates(sender).some(n => list.includes(n))
    },

    // Whitelist per singolo gruppo: global.whitelist[groupId] = ['3931234...', ...]
    isChatWhitelisted(sender, chatId) {
        if (!sender || !chatId) return false
        const list = global.whitelist?.[chatId]
        if (!Array.isArray(list)) return false
        return candidates(sender).some(n => list.includes(n))
    },

    // Whitelist completa: owner/rowner sempre inclusi, poi globale, poi per-gruppo.
    isWhitelisted(sender, chatId) {
        if (!sender) return false
        if (this.isOwner(sender) || this.isROwner(sender, global.conn)) return true
        if (this.isGlobalWhitelisted(sender)) return true
        if (chatId && this.isChatWhitelisted(sender, chatId)) return true
        return false
    },

    addWhitelist(sender, chatId = 'global') {
        if (!sender) return false
        const num = phoneOf(sender) || cleanNum(sender)
        if (!num) return false
        if (!global.whitelist) global.whitelist = {}
        if (!Array.isArray(global.whitelist[chatId])) global.whitelist[chatId] = []
        if (!candidates(sender).some(n => global.whitelist[chatId].includes(n))) global.whitelist[chatId].push(num)
        this._saveWhitelist()
        return true
    },

    removeWhitelist(sender, chatId = 'global') {
        if (!sender) return false
        const list = global.whitelist?.[chatId]
        if (!Array.isArray(list)) return false
        let removed = false
        for (const n of candidates(sender)) {
            const idx = list.indexOf(n)
            if (idx !== -1) { list.splice(idx, 1); removed = true }
        }
        if (!removed) return false
        this._saveWhitelist()
        return true
    },

    _saveWhitelist() {
        try {
            const dir = path.join(__dirname, 'dn')
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            fs.writeFileSync(path.join(dir, 'whitelist.json'), JSON.stringify(global.whitelist, null, 2))
        } catch (e) {
            console.error('❌ Errore salvataggio whitelist:', e.message)
        }
    },
    
    isPremium(sender) {
        if (this.isOwner(sender) || this.isROwner(sender, global.conn)) {
            return true
        }
        const user = global.db.data.users[sender]
        return !!(user && user.premium === true)
    },
    
    isGroupAdmin(participants, sender) {
        if (!participants || !Array.isArray(participants) || !sender) return false
        learnParticipants(participants)
        const participant = participants.find(p => participantMatches(p, sender))
        return !!(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'))
    },
    
    async isAdmin(chat, sender, conn) {
        try {
            if (!chat || !sender || !conn) return false
            
            const groupMetadata = await conn.groupMetadata(chat).catch(() => null)
            if (!groupMetadata || !groupMetadata.participants) return false
            
            const participants = groupMetadata.participants
            return this.isGroupAdmin(participants, sender)
        } catch {
            return false
        }
    },
    
    async isBotAdmin(chat, conn) {
        try {
            if (!chat || !conn) return false
            
            const botJid = conn.decodeJid(conn.user?.id)
            const groupMetadata = await conn.groupMetadata(chat).catch(() => null)
            if (!groupMetadata || !groupMetadata.participants) return false
            
            const participants = groupMetadata.participants
            return this.isGroupAdmin(participants, botJid) ||
                (conn.user?.lid ? this.isGroupAdmin(participants, conn.user.lid) : false)
        } catch {
            return false
        }
    },
    
    async isGroupCreator(chat, sender, conn) {
        try {
            if (!chat || !sender || !conn) return false
            
            const groupMetadata = await conn.groupMetadata(chat).catch(() => null)
            if (!groupMetadata || !groupMetadata.participants) return false
            
            const participants = groupMetadata.participants
            const participant = participants.find(p => {
                const participantId = p.id || p.jid || ''
                return participantId === sender
            })
            
            return !!(participant && participant.admin === 'superadmin')
        } catch {
            return false
        }
    },
    
    getRoleMessage(role) {
        return global.messaggi[`solo${role.charAt(0).toUpperCase() + role.slice(1)}`] || 'Accesso negato!'
    },
    
    verifyRole(requiredRole, options = {}) {
        const { m, conn, chat, participants } = options
        
        switch(requiredRole) {
            case 'owner':
                return this.isOwner(m?.sender)
            case 'rowner':
                return this.isROwner(m?.sender, conn)
            case 'vip':
                return this.isVip(m?.sender, m?.chat)
            case 'whitelist':
                return this.isWhitelisted(m?.sender, m?.chat)
            case 'premium':
                return this.isPremium(m?.sender)
            case 'admin':
                return this.isGroupAdmin(participants, m?.sender)
            case 'botAdmin':
                return this.isBotAdmin(chat, conn)
            case 'group':
                return m?.chat?.endsWith('@g.us')
            case 'private':
                return !m?.chat?.endsWith('@g.us')
            default:
                return false
        }
    }
}
