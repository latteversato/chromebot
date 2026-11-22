import { getChat, getUser, forceSave } from '../database.js'
import sistemaRuoli from '../ruoli.js'

let userSpamCounters = {}

const SPAM_CONFIG = {
    STICKER_LIMIT: 5,
    PHOTO_LIMIT: 5,
    VIDEO_LIMIT: 4,
    TIME_WINDOW: 10000,
    RESET_TIMEOUT: 60000,
    WARN_RESET_TIMEOUT: 60000,
    WARN_LIMIT: 3
}

export default {
    async before(m, { conn, isAdmin, isBotAdmin }) {
        if (m.fromMe) return false
        if (!m.isGroup) return false
        
        const chat = getChat(m.chat, false)
        if (!chat) return false
        if (chat.antiSpam !== true) return false
        
        // ✅ ADMIN E OWNER BYPASSANO SEMPRE
        const isOwner = sistemaRuoli.isOwner(m.sender)
        const isROwner = sistemaRuoli.isROwner(m.sender, conn)
        
        if (isAdmin || isOwner || isROwner) return false
        if (!isBotAdmin) return false
        
        const sender = m.sender
        
        if (!userSpamCounters[m.chat]) {
            userSpamCounters[m.chat] = {}
        }
        if (!userSpamCounters[m.chat][sender]) {
            userSpamCounters[m.chat][sender] = { 
                stickerCount: 0, 
                photoCount: 0, 
                videoCount: 0,
                messageIds: [], 
                warns: 0,
                lastMessageTime: 0, 
                lastWarnTime: 0,
                timer: null,
                warnTimer: null,
                warned: false
            }
        }

        const counter = userSpamCounters[m.chat][sender]
        const currentTime = Date.now()

        const isSticker = !!m.message?.stickerMessage
        const isPhoto = !!m.message?.imageMessage
        const isVideo = !!m.message?.videoMessage

        if (!isSticker && !isPhoto && !isVideo) return false

        if (counter.warned && (currentTime - counter.lastWarnTime > SPAM_CONFIG.WARN_RESET_TIMEOUT)) {
            counter.warned = false
            counter.warns = 0
        }

        if (currentTime - counter.lastMessageTime > SPAM_CONFIG.TIME_WINDOW) {
            counter.stickerCount = 0
            counter.photoCount = 0
            counter.videoCount = 0
            counter.messageIds = []
        }

        if (isSticker) counter.stickerCount++
        else if (isPhoto) counter.photoCount++
        else if (isVideo) counter.videoCount++

        counter.messageIds.push(m.key.id)
        counter.lastMessageTime = currentTime

        if (counter.timer) clearTimeout(counter.timer)
        counter.timer = setTimeout(() => this.resetUserCounter(m.chat, sender), SPAM_CONFIG.RESET_TIMEOUT)

        const isStickerSpam = counter.stickerCount >= SPAM_CONFIG.STICKER_LIMIT
        const isPhotoSpam = counter.photoCount >= SPAM_CONFIG.PHOTO_LIMIT
        const isVideoSpam = counter.videoCount >= SPAM_CONFIG.VIDEO_LIMIT

        if ((isStickerSpam || isPhotoSpam || isVideoSpam) && !counter.warned) {
            await this.handleSpamAction(m, conn, counter, sender, isBotAdmin)
        }

        return false
    },

    async handleSpamAction(m, conn, counter, sender, isBotAdmin) {
        if (!isBotAdmin) return

        try {
            counter.warned = true
            counter.lastWarnTime = Date.now()
            counter.warns++
            
            // Imposta gruppo in modalità announcement
            await conn.groupSettingUpdate(m.chat, 'announcement').catch(() => {})
            
            // Elimina tutti i messaggi spam
            for (const messageId of counter.messageIds) {
                try {
                    await conn.sendMessage(m.chat, { 
                        delete: { 
                            remoteJid: m.chat, 
                            fromMe: false, 
                            id: messageId, 
                            participant: m.key.participant 
                        } 
                    })
                } catch (e) {}
            }
            
            // Messaggio di warn
            let warnMessage = ""
            if (counter.warns < SPAM_CONFIG.WARN_LIMIT) {
                warnMessage = `⚠️ @${sender.split('@')[0]} hai ricevuto warn per spam eccessivo (${counter.warns}/${SPAM_CONFIG.WARN_LIMIT})`
            } else if (counter.warns === SPAM_CONFIG.WARN_LIMIT) {
                warnMessage = `⚠️ @${sender.split('@')[0]} hai raggiunto i warn massimi! Al prossimo spam verrai rimosso.`
            } else {
                warnMessage = `❌ @${sender.split('@')[0]} rimosso per spam eccessivo.`
            }
            
            await conn.sendMessage(m.chat, { 
                text: warnMessage,
                mentions: [sender]
            }).catch(() => {})
            
            // Ripristina impostazioni gruppo dopo 5 secondi
            setTimeout(async () => {
                await conn.groupSettingUpdate(m.chat, 'not_announcement').catch(() => {})
            }, 5000)
            
            // Reset contatori immediato
            counter.stickerCount = 0
            counter.photoCount = 0
            counter.videoCount = 0
            counter.messageIds = []
            
            // Rimuovi utente se supera i warn
            if (counter.warns > SPAM_CONFIG.WARN_LIMIT) {
                await conn.groupParticipantsUpdate(m.chat, [sender], 'remove').catch(() => {})
                this.resetUserCounter(m.chat, sender)
                return
            }
            
            // Timer per reset warn dopo 1 minuto
            if (counter.warnTimer) clearTimeout(counter.warnTimer)
            counter.warnTimer = setTimeout(() => {
                if (userSpamCounters[m.chat] && userSpamCounters[m.chat][sender]) {
                    userSpamCounters[m.chat][sender].warned = false
                    userSpamCounters[m.chat][sender].warns = 0
                }
            }, SPAM_CONFIG.WARN_RESET_TIMEOUT)
            
        } catch (error) {
            console.error('❌ Errore antispam:', error)
        }
    },

    resetUserCounter(chatId, userId) {
        if (userSpamCounters[chatId] && userSpamCounters[chatId][userId]) {
            delete userSpamCounters[chatId][userId]
        }
    },

    resetSpamCounters(chatId = null, userId = null) {
        if (chatId && userId) {
            this.resetUserCounter(chatId, userId)
        } else if (chatId) {
            delete userSpamCounters[chatId]
        } else {
            userSpamCounters = {}
        }
    }
}