import { getUser } from '../database.js'

export default {
    command: ['checkban', 'checkwhatsapp'],
    
    async execute(m, { conn, args, command, usedPrefix }) {
        const user = getUser(m.sender, true)
        
        if (!args[0]) {
            return conn.sendMessage(m.chat, {
                text: `📱 *CHECK BAN WHATSAPP*\n\nInserisci il numero da verificare\nEs: ${usedPrefix}checkban 393471234567`
            })
        }

        let numero = args[0].replace(/[^0-9]/g, '')
        if (!numero.startsWith('+')) {
            numero = numero.startsWith('0') ? '+39' + numero.substring(1) : '+39' + numero
        }

        try {
            const result = await conn.onWhatsApp(numero)
            
            if (!result || result.length === 0 || !result[0].exists) {
                return conn.sendMessage(m.chat, {
                    text: `📱 *${numero}*\n\n❌ *BANNATO?* NO\n📌 *Motivo:* Numero non registrato su WhatsApp`
                })
            }

            const userJid = result[0].jid
            
            try {
                await conn.presenceSubscribe(userJid)
                
                try {
                    await conn.sendPresenceUpdate('composing', userJid)
                    return conn.sendMessage(m.chat, {
                        text: `📱 *${numero}*\n\n✅ *BANNATO?* NO\n📌 *Stato:* Numero attivo e raggiungibile`
                    })
                } catch {
                    return conn.sendMessage(m.chat, {
                        text: `📱 *${numero}*\n\n⚠️ *BANNATO?* FORSE\n📌 *Stato:* Numero esistente ma con restrizioni`
                    })
                }
                
            } catch {
                return conn.sendMessage(m.chat, {
                    text: `📱 *${numero}*\n\n❌ *BANNATO?* SI\n📌 *Stato:* Numero bannato o bloccato`
                })
            }
            
        } catch (error) {
            return conn.sendMessage(m.chat, {
                text: `📱 *${numero}*\n\n❌ *BANNATO?* SI\n📌 *Motivo:* Errore verifica - probabilmente bannato`
            })
        }
    }
}