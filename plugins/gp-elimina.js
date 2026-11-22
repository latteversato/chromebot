export default {
    command: /^del(ete)?$/i,
    group: true,
    bis: true,
    botAdmin: true,
    description: "Elimina un messaggio citato",

    async execute(m, extra) {
        const { conn } = extra
        
        // Verifica che ci sia un messaggio citato
        if (!m.quoted) {
            return conn.sendMessage(m.chat, { 
                text: "❌ Devi citare un messaggio da eliminare!" 
            }, { quoted: m })
        }

        try {
            // Costruisci la key del messaggio citato
            let key = {}
            
            try {
                key.remoteJid = m.chat
                key.fromMe = m.quoted.fromMe || false
                key.id = m.quoted.id || m.quoted.key?.id
                key.participant = m.quoted.sender || m.quoted.participant || m.quoted.key?.participant
            } catch (e) {
                console.error("❌ Errore nel costruire key:", e)
            }

            // Elimina il messaggio citato
            await conn.sendMessage(m.chat, { delete: key })
            
            // Elimina anche il messaggio del comando
            await conn.sendMessage(m.chat, { delete: m.key })
            
        } catch (err) {
            console.error("❌ Errore delete:", err)
            
            // Tentativo alternativo
            try {
                if (m.quoted?.vM?.key) {
                    await conn.sendMessage(m.chat, { delete: m.quoted.vM.key })
                    await conn.sendMessage(m.chat, { delete: m.key })
                } else {
                    return conn.sendMessage(m.chat, { 
                        text: "❌ Non posso eliminare questo messaggio!" 
                    }, { quoted: m })
                }
            } catch {
                return conn.sendMessage(m.chat, { 
                    text: "❌ Errore nell'eliminazione del messaggio!" 
                }, { quoted: m })
            }
        }
    }
}