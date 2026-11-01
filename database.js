import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class DatabaseManager {
    constructor() {
        this.dbPath = path.join(__dirname, 'database.json')
        this.data = null
        this.backupInterval = 5 * 60 * 1000
        this.autoSaveInterval = 30000
        this.initDatabase()
        this.setupGlobalSync()
    }

    setupGlobalSync() {
        if (!global.db) global.db = {}
        Object.defineProperty(global.db, 'data', {
            get: () => this.data,
            set: (newData) => {
                this.data = newData
                this.saveDatabase()
            }
        })
    }

    initDatabase() {
        if (fs.existsSync(this.dbPath)) {
            try {
                const fileData = fs.readFileSync(this.dbPath, 'utf8')
                this.data = JSON.parse(fileData)
            } catch (e) {
                this.createDefaultDatabase()
            }
        } else {
            this.createDefaultDatabase()
        }
        this.ensureDatabaseStructure()
        this.startAutoSave()
        this.startBackupRotation()
    }

    createDefaultDatabase() {
        this.data = {
            users: {},
            chats: {},
            settings: {},
            stats: {},
            groups: {},
            banned: { users: [], chats: [] },
            premium: { users: [] },
            vip: { users: [] },
            backup: { lastBackup: null, versions: [] }
        }
        this.saveDatabase(true)
    }

    ensureDatabaseStructure() {
        if (!this.data.users) this.data.users = {}
        if (!this.data.chats) this.data.chats = {}
        if (!this.data.settings) this.data.settings = {}
        if (!this.data.stats) this.data.stats = {}
        if (!this.data.groups) this.data.groups = {}
        if (!this.data.banned) this.data.banned = { users: [], chats: [] }
        if (!this.data.premium) this.data.premium = { users: [] }
        if (!this.data.vip) this.data.vip = { users: [] }
        if (!this.data.backup) this.data.backup = { lastBackup: null, versions: [] }
        this.saveDatabase(true)
    }

    saveDatabase(force = false) {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2))
            return true
        } catch (e) {
            return false
        }
    }

    forceSave() {
        return this.saveDatabase(true)
    }

    syncWithGlobal() {
        if (global.db && global.db.data !== this.data) {
            global.db.data = this.data
        }
        return this.data
    }

    startAutoSave() {
        setInterval(() => {
            this.saveDatabase()
        }, this.autoSaveInterval)
    }

    startBackupRotation() {
        setInterval(() => {
            this.createBackup()
        }, this.backupInterval)
    }

    createBackup() {
        try {
            const backupDir = path.join(__dirname, 'backups')
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true })
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const backupPath = path.join(backupDir, `database-${timestamp}.json`)
            fs.writeFileSync(backupPath, JSON.stringify(this.data, null, 2))
            
            const backups = fs.readdirSync(backupDir)
                .filter(f => f.startsWith('database-'))
                .sort()
                .reverse()
                
            if (backups.length > 10) {
                for (let i = 10; i < backups.length; i++) {
                    fs.unlinkSync(path.join(backupDir, backups[i]))
                }
            }
            
            this.data.backup.lastBackup = timestamp
            this.data.backup.versions = backups.slice(0, 10)
            this.saveDatabase()
        } catch (e) {}
    }

    getUserTemplate(sender, name = '') {
        return {
            id: sender,
            name: name || 'Utente',
            registered: false,
            age: 0,
            gender: '',
            regTime: -1,
            messaggi: 0,
            command: 0,
            blasphemy: 0,
            joincount: 2,
            money: 0,
            bank: 0,
            limit: 20,
            exp: 0,
            lvl: 0,
            carne: 0,
            pollo: 0,
            ossa: 0,
            pelliccia: 0,
            grattaevinci: 0,
            chiavi: 0,
            casa: 0,
            villa: 0,
            auto: 0,
            casse: [0, 0, 0, 0, 0, 0],
            datafurto: 'assente',
            ultimofurto: 0,
            furti: 0,
            rubati: 0,
            sposato: false,
            divorziato: false,
            coniuge: '',
            ex: '',
            proposals: {},
            pendmarry: [],
            pending: [],
            amici: [],
            warn: 0,
            warnlink: 0,
            muto: false,
            banned: false,
            maxblasph: 2050,
            premium: false,
            premiumDate: -1,
            premdays: 0,
            vip: false,
            instagram: '',
            nomeinsta: null,
            comandi: [0, 0, 0],
            ultimoreclamo: ['10:10 - 20/20/2020', 0],
            ultimoprelievo: 0,
            ultimodeposito: 0,
            vittorieSlot: 0,
            categoria: null,
            ultimaAttivita: Date.now(),
            dataRegistrazione: Date.now(),
            totWarn: 0,
            totWarnLink: 0,
            totMuti: 0,
            totBannati: 0,
            totComandiEseguiti: 0,
            totMessaggiInviati: 0,
            totBestemmie: 0,
            ultimoComando: '',
            ultimoComandoTime: 0,
            ultimoMessaggio: '',
            ultimoMessaggioTime: 0,
            sessioni: [],
            dispositivi: [],
            achievements: [],
            badge: [],
            referenti: [],
            referral: '',
            tag: '',
            bio: '',
            compleanno: '',
            citta: '',
            colorePreferito: '',
            animalePreferito: '',
            timbroMessaggio: []
        }
    }

    getChatTemplate(chatId, name = '') {
        return {
            id: chatId,
            name: name || 'Gruppo',
            isBanned: false,
            welcome: true,
            detect: true,
            antinuke: false,
            sWelcome: '',
            sBye: '',
            sPromote: '',
            sDemote: '',
            antielimina: false,
            antibot: true,
            bestemmiometro: true,
            antilinkgp: true,
            antilinkig: false,
            antilinktg: false,
            antilinktk: false,
            antilinkhard: false,
            antilinkbase: false,
            antilinkbase2: false,
            antiSpam: true,
            antiviewonce: false,
            antiTraba: true,
            antiArab: false,
            antipaki: false,
            antiprivato: false,
            antiporno: false,
            antiyt: false,
            antiCall: false,
            modoadmin: true,
            soloprivato: false,
            sologruppo: false,
            expired: 0,
            messaggi: 0,
            blasphemy: 0,
            rules: '',
            delete: false,
            antiLink: true,
            risposte: false,
            gpt: false,
            chatgpt: false,
            audios: false,
            autosticker: false,
            totMessaggi: 0,
            totComandi: 0,
            totWarn: 0,
            totEspulsi: 0,
            membriAttivi: [],
            ultimaAttivita: Date.now()
        }
    }

    getGroupTemplate(groupId, name = '') {
        return {
            id: groupId,
            name: name || 'Gruppo',
            isBanned: false,
            welcome: {
                enabled: true,
                message: '',
                type: 'text'
            },
            goodbye: {
                enabled: true,
                message: '',
                type: 'text'
            },
            anti: {
                link: true,
                spam: true,
                arab: false,
                paki: false,
                porno: false,
                viewonce: false,
                bot: true,
                call: false,
                traba: true,
                yt: false,
                ig: false,
                tg: false,
                tk: false,
                hard: false,
                base: false,
                base2: false,
                nuke: false
            },
            features: {
                bestemmiometro: true,
                leveling: true,
                economy: true,
                games: true,
                chatgpt: false,
                audios: false,
                autosticker: false
            },
            settings: {
                onlyAdmin: false,
                onlyPrivate: false,
                onlyGroup: false,
                deleteMessages: false,
                autoResponses: false
            },
            stats: {
                messages: 0,
                commands: 0,
                blasphemy: 0,
                warns: 0,
                kicks: 0,
                bans: 0,
                joins: 0,
                leaves: 0
            },
            members: {
                total: 0,
                active: [],
                admins: [],
                banned: []
            },
            rules: '',
            expired: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastActivity: Date.now()
        }
    }

    getSettingsTemplate(botJid) {
        return {
            botJid: botJid,
            self: false,
            autoread: false,
            restrict: true,
            antiCall: true,
            antiPrivate: true,
            jadibot: true,
            gconly: false,
            pconly: false,
            statusonly: false,
            swonly: false,
            public: true,
            totComandiGlobali: 0,
            totMessaggiGlobali: 0,
            totUtentiUnici: 0,
            totGruppi: 0,
            dataAvvio: Date.now()
        }
    }

    getUser(userId, createIfNotExists = true) {
        if (!userId) return null
        userId = String(userId)
        if (!this.data.users[userId] && createIfNotExists) {
            this.data.users[userId] = this.getUserTemplate(userId)
            this.forceSave()
        }
        return this.data.users[userId] || null
    }

    getChat(chatId, createIfNotExists = true) {
        if (!chatId) return null
        chatId = String(chatId)
        if (!this.data.chats[chatId] && createIfNotExists) {
            this.data.chats[chatId] = this.getChatTemplate(chatId)
            this.forceSave()
        }
        return this.data.chats[chatId] || null
    }

    getGroup(groupId, createIfNotExists = true) {
        if (!groupId) return null
        groupId = String(groupId)
        if (!this.data.groups[groupId] && createIfNotExists) {
            this.data.groups[groupId] = this.getGroupTemplate(groupId)
            this.forceSave()
        }
        return this.data.groups[groupId] || null
    }

    incrementMessaggi(userId) {
        const user = this.getUser(userId, true)
        if (!user) return 0
        user.messaggi = (parseInt(user.messaggi) || 0) + 1
        user.totMessaggiInviati = (parseInt(user.totMessaggiInviati) || 0) + 1
        user.ultimoMessaggioTime = Date.now()
        user.ultimaAttivita = Date.now()
        user.exp = (parseInt(user.exp) || 0) + 5
        return user.messaggi
    }

    incrementComandi(userId, comando = '') {
        const user = this.getUser(userId, true)
        if (!user) return 0
        user.command = (parseInt(user.command) || 0) + 1
        user.totComandiEseguiti = (parseInt(user.totComandiEseguiti) || 0) + 1
        user.ultimoComando = comando || ''
        user.ultimoComandoTime = Date.now()
        user.ultimaAttivita = Date.now()
        if (!user.comandi || !Array.isArray(user.comandi)) {
            user.comandi = [0, 0, 0]
        }
        user.comandi[0] = (parseInt(user.comandi[0]) || 0) + 1
        user.exp = (parseInt(user.exp) || 0) + 10
        return user.command
    }

    incrementBestemmie(userId) {
        const user = this.getUser(userId, true)
        if (!user) return 0
        user.blasphemy = (parseInt(user.blasphemy) || 0) + 1
        user.totBestemmie = (parseInt(user.totBestemmie) || 0) + 1
        return user.blasphemy
    }

    isPremium(userId) {
        const user = this.getUser(userId, false)
        return !!(user && user.premium === true)
    }

    isVip(userId) {
        const user = this.getUser(userId, false)
        return !!(user && user.vip === true)
    }

    isBanned(userId) {
        const user = this.getUser(userId, false)
        return !!(user && user.banned === true)
    }

    isMuted(userId) {
        const user = this.getUser(userId, false)
        return !!(user && user.muto === true)
    }

    isRegistered(userId) {
        const user = this.getUser(userId, false)
        return !!(user && user.registered === true)
    }

    getLevel(userId) {
        const user = this.getUser(userId, false)
        return user ? user.lvl || 0 : 0
    }

    getExp(userId) {
        const user = this.getUser(userId, false)
        return user ? user.exp || 0 : 0
    }

    getMoney(userId) {
        const user = this.getUser(userId, false)
        return user ? user.money || 0 : 0
    }

    getBank(userId) {
        const user = this.getUser(userId, false)
        return user ? user.bank || 0 : 0
    }

    addMoney(userId, amount) {
        const user = this.getUser(userId, true)
        if (!user) return false
        user.money = (parseInt(user.money) || 0) + parseInt(amount)
        return true
    }

    removeMoney(userId, amount) {
        const user = this.getUser(userId, true)
        if (!user) return false
        user.money = Math.max(0, (parseInt(user.money) || 0) - parseInt(amount))
        return true
    }

    addBank(userId, amount) {
        const user = this.getUser(userId, true)
        if (!user) return false
        user.bank = (parseInt(user.bank) || 0) + parseInt(amount)
        return true
    }

    removeBank(userId, amount) {
        const user = this.getUser(userId, true)
        if (!user) return false
        user.bank = Math.max(0, (parseInt(user.bank) || 0) - parseInt(amount))
        return true
    }

    addExp(userId, amount) {
        const user = this.getUser(userId, true)
        if (!user) return false
        user.exp = (parseInt(user.exp) || 0) + parseInt(amount)
        return true
    }

    addWarn(userId) {
        const user = this.getUser(userId, true)
        if (!user) return 0
        user.warn = (parseInt(user.warn) || 0) + 1
        user.totWarn = (parseInt(user.totWarn) || 0) + 1
        return user.warn
    }

    removeWarn(userId) {
        const user = this.getUser(userId, false)
        if (!user) return 0
        user.warn = Math.max(0, (parseInt(user.warn) || 0) - 1)
        return user.warn
    }

    setPremium(userId, days = 30) {
        const user = this.getUser(userId, true)
        if (!user) return false
        user.premium = true
        user.premiumDate = Date.now()
        user.premdays = days
        if (!this.data.premium.users.includes(userId)) {
            this.data.premium.users.push(userId)
        }
        return true
    }

    removePremium(userId) {
        const user = this.getUser(userId, false)
        if (!user) return false
        user.premium = false
        user.premiumDate = -1
        user.premdays = 0
        const index = this.data.premium.users.indexOf(userId)
        if (index !== -1) {
            this.data.premium.users.splice(index, 1)
        }
        return true
    }

    setVip(userId) {
        const user = this.getUser(userId, true)
        if (!user) return false
        user.vip = true
        if (!this.data.vip.users.includes(userId)) {
            this.data.vip.users.push(userId)
        }
        return true
    }

    removeVip(userId) {
        const user = this.getUser(userId, false)
        if (!user) return false
        user.vip = false
        const index = this.data.vip.users.indexOf(userId)
        if (index !== -1) {
            this.data.vip.users.splice(index, 1)
        }
        return true
    }

    setBanned(userId) {
        const user = this.getUser(userId, true)
        if (!user) return false
        user.banned = true
        if (!this.data.banned.users.includes(userId)) {
            this.data.banned.users.push(userId)
        }
        return true
    }

    removeBanned(userId) {
        const user = this.getUser(userId, false)
        if (!user) return false
        user.banned = false
        const index = this.data.banned.users.indexOf(userId)
        if (index !== -1) {
            this.data.banned.users.splice(index, 1)
        }
        return true
    }
}

const databaseManager = new DatabaseManager()

export function getUser(userId, createIfNotExists = true) {
    return databaseManager.getUser(userId, createIfNotExists)
}

export function getChat(chatId, createIfNotExists = true) {
    return databaseManager.getChat(chatId, createIfNotExists)
}

export function getGroup(groupId, createIfNotExists = true) {
    return databaseManager.getGroup(groupId, createIfNotExists)
}

export function incrementMessaggi(userId) {
    return databaseManager.incrementMessaggi(userId)
}

export function incrementComandi(userId, comando = '') {
    return databaseManager.incrementComandi(userId, comando)
}

export function incrementBestemmie(userId) {
    return databaseManager.incrementBestemmie(userId)
}

export function isPremium(userId) {
    return databaseManager.isPremium(userId)
}

export function isVip(userId) {
    return databaseManager.isVip(userId)
}

export function isBanned(userId) {
    return databaseManager.isBanned(userId)
}

export function isMuted(userId) {
    return databaseManager.isMuted(userId)
}

export function isRegistered(userId) {
    return databaseManager.isRegistered(userId)
}

export function getLevel(userId) {
    return databaseManager.getLevel(userId)
}

export function getExp(userId) {
    return databaseManager.getExp(userId)
}

export function getMoney(userId) {
    return databaseManager.getMoney(userId)
}

export function getBank(userId) {
    return databaseManager.getBank(userId)
}

export function addMoney(userId, amount) {
    return databaseManager.addMoney(userId, amount)
}

export function removeMoney(userId, amount) {
    return databaseManager.removeMoney(userId, amount)
}

export function addBank(userId, amount) {
    return databaseManager.addBank(userId, amount)
}

export function removeBank(userId, amount) {
    return databaseManager.removeBank(userId, amount)
}

export function addExp(userId, amount) {
    return databaseManager.addExp(userId, amount)
}

export function addWarn(userId) {
    return databaseManager.addWarn(userId)
}

export function removeWarn(userId) {
    return databaseManager.removeWarn(userId)
}

export function setPremium(userId, days = 30) {
    return databaseManager.setPremium(userId, days)
}

export function removePremium(userId) {
    return databaseManager.removePremium(userId)
}

export function setVip(userId) {
    return databaseManager.setVip(userId)
}

export function removeVip(userId) {
    return databaseManager.removeVip(userId)
}

export function setBanned(userId) {
    return databaseManager.setBanned(userId)
}

export function removeBanned(userId) {
    return databaseManager.removeBanned(userId)
}

export function forceSave() {
    return databaseManager.forceSave()
}

if (!global.db) global.db = {}
global.db.data = databaseManager.data
global.db.getUser = getUser
global.db.getChat = getChat
global.db.getGroup = getGroup
global.db.incrementMessaggi = incrementMessaggi
global.db.incrementComandi = incrementComandi
global.db.incrementBestemmie = incrementBestemmie
global.db.isPremium = isPremium
global.db.isVip = isVip
global.db.isBanned = isBanned
global.db.isMuted = isMuted
global.db.isRegistered = isRegistered
global.db.getLevel = getLevel
global.db.getExp = getExp
global.db.getMoney = getMoney
global.db.getBank = getBank
global.db.addMoney = addMoney
global.db.removeMoney = removeMoney
global.db.addBank = addBank
global.db.removeBank = removeBank
global.db.addExp = addExp
global.db.addWarn = addWarn
global.db.removeWarn = removeWarn
global.db.setPremium = setPremium
global.db.removePremium = removePremium
global.db.setVip = setVip
global.db.removeVip = removeVip
global.db.setBanned = setBanned
global.db.removeBanned = removeBanned
global.db.forceSave = forceSave

export default databaseManager