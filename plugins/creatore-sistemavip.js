import vipManager from '../vipManager.js'

export default {
    command: ['addvip', 'delvip', 'listvip', 'resetvip'],
    group: true,
    whitelist: true,
    
    async execute(m, { conn, text, command, usedPrefix, canManageVip, isOwner, isROwner, isWhitelisted, sistemaRuoli }) {
        const prefix = usedPrefix || global.prefissoComandi || '.'
        
        if (!m.isGroup) {
            return conn.sendMessage(m.chat, { text: global.messaggi?.soloGroup || '❌ Questo comando funziona solo nei gruppi!' }, { quoted: m })
        }

        if (!canManageVip && !isOwner && !isROwner && !isWhitelisted) {
            return conn.sendMessage(m.chat, { text: global.messaggi?.soloWhitelist || '❌ Solo gli utenti in whitelist possono usare questo comando!' }, { quoted: m })
        }
        
        if (command === 'listvip') {
            const vips = vipManager.getVips(m.chat)
            
            if (!vips || vips.length === 0) {
                return conn.sendMessage(m.chat, {
                    text: '📭 *Nessun VIP in questo gruppo*'
                }, { quoted: m })
            }
            
            let list = '╭━━━「 👑 LISTA VIP 」━━━╮\n'
            let mentions = []
            
            const sortedVips = [...vips].sort()
            
            for (let i = 0; i < sortedVips.length; i++) {
                const num = sortedVips[i]
                const vipJid = num + '@s.whatsapp.net'
                
                list += `┃ ${i + 1}. @${num}\n`
                mentions.push(vipJid)
            }
            
            list += `╰━━━━━━━━━━━━━━━━━━╯\n`
            list += `📌 *Totale:* ${vips.length} VIP`
            
            return conn.sendMessage(m.chat, {
                text: list,
                mentions
            }, { quoted: m })
        }
        
        if (command === 'resetvip') {
            if (!text || text.toLowerCase() !== 'conferma') {
                return conn.sendMessage(m.chat, {
                    text: `⚠️ *ATTENZIONE* ⚠️\n\nStai per resettare TUTTI i VIP di questo gruppo.\nPer confermare, scrivi:\n${prefix}resetvip conferma`
                }, { quoted: m })
            }
            
            const success = vipManager.resetVips(m.chat)
            if (global.db?.data?.vip?.groups?.[m.chat]) {
                global.db.data.vip.groups[m.chat] = []
            }
            const chatData = global.db?.getChat ? global.db.getChat(m.chat, false) : null
            if (chatData && Array.isArray(chatData.vip)) {
                chatData.vip = []
            }
            if (global.db?.forceSave) global.db.forceSave()
            
            if (success) {
                return conn.sendMessage(m.chat, {
                    text: '✅ *Lista VIP resettata per questo gruppo*\n\nOra ci sono 0 VIP nella lista.'
                }, { quoted: m })
            } else {
                return conn.sendMessage(m.chat, {
                    text: '❌ *Errore nel reset della lista VIP*'
                }, { quoted: m })
            }
        }
        
        if (command === 'addvip' || command === 'delvip') {
            const targets = global.extractTargets ? global.extractTargets(m) : []
            
            if (!targets.length) {
                return conn.sendMessage(m.chat, {
                    text: `❌ *Devi menzionare un utente o rispondere a un messaggio*\n\n📌 Esempio:\n${prefix}${command} @utente`
                }, { quoted: m })
            }

            const who = targets[0]
            const number = sistemaRuoli?.cleanNum ? sistemaRuoli.cleanNum(who) : who.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '')
            const jid = number + '@s.whatsapp.net'
            
            if (!number || number.length < 7 || number.length > 15) {
                return conn.sendMessage(m.chat, {
                    text: '❌ *Numero non valido*'
                }, { quoted: m })
            }
            
            if (command === 'addvip') {
                const isAlreadyVIP = vipManager.isVip(m.chat, number)
                
                if (isAlreadyVIP) {
                    return conn.sendMessage(m.chat, {
                        text: `✅ @${number} *è già VIP in questo gruppo*`,
                        mentions: [jid]
                    }, { quoted: m })
                }
                
                const success = sistemaRuoli ? sistemaRuoli.addVip(m.sender, number, m.chat) : vipManager.addVip(m.chat, number)
                
                if (success) {
                    return conn.sendMessage(m.chat, {
                        text: `✅ @${number} *aggiunto ai VIP di questo gruppo*`,
                        mentions: [jid]
                    }, { quoted: m })
                } else {
                    return conn.sendMessage(m.chat, {
                        text: '❌ *Errore nel salvare*'
                    }, { quoted: m })
                }
                
            } else if (command === 'delvip') {
                const isVIP = vipManager.isVip(m.chat, number)
                
                if (!isVIP) {
                    return conn.sendMessage(m.chat, {
                        text: `❌ @${number} *non è VIP in questo gruppo*`,
                        mentions: [jid]
                    }, { quoted: m })
                }
                
                const success = sistemaRuoli ? sistemaRuoli.removeVip(m.sender, number, m.chat) : vipManager.removeVip(m.chat, number)
                
                if (success) {
                    return conn.sendMessage(m.chat, {
                        text: `🗑️ @${number} *rimosso dai VIP di questo gruppo*`,
                        mentions: [jid]
                    }, { quoted: m })
                } else {
                    return conn.sendMessage(m.chat, {
                        text: '❌ *Errore nel salvare*'
                    }, { quoted: m })
                }
            }
        }
    }
}