export default {
    command: ['aperto', 'open', 'sblocca', 'normale'],
    desc: 'Apre il gruppo (solo admin)',
    category: 'Group',
    admin: true,
    botAdmin: true,

    async execute(m, extra) {
        // Usa la conn da extra (che è già passata dal gestore)
        const conn = extra?.conn || global.conn
        
        // Usa la chat da m (che è già normalizzata dal gestore)
        const chat = m.chat

        try {
            // Verifica se siamo in un gruppo
            if (!chat.endsWith('@g.us')) {
                return conn.sendMessage(chat, {
                    text: `${global.emoji?.error || '❌'} Questo comando funziona solo nei gruppi`
                })
            }

            // Verifica i permessi admin (già verificati dal gestore, ma facciamo un controllo extra)
            if (!extra?.isAdmin) {
                return conn.sendMessage(chat, {
                    text: `${global.emoji?.error || '❌'} Solo gli admin possono usare questo comando`
                })
            }

            if (!extra?.isBotAdmin) {
                return conn.sendMessage(chat, {
                    text: `${global.emoji?.error || '❌'} Devo essere admin del gruppo per aprirlo!`
                })
            }

            // Esegui l'apertura
            await conn.groupSettingUpdate(chat, 'not_announcement')
            
            const buttonMessage = {
                text: 'Gruppo Aperto🔓',
                footer: 'Clicca per chiudere il Gruppo',
                buttons: [
                    { buttonId: `${global.prefissoComandi}chiuso`, buttonText: { displayText: '🔒 Chiudi Chat' }, type: 1 }
                ],
                headerType: 1
            }
            
            await conn.sendMessage(chat, buttonMessage)
            
        } catch (error) {
            console.error('Errore aperto:', error)
            
            let errorMessage = `${global.emoji?.error || '❌'} Errore: `
            
            if (error.message.includes('not-authorized') || error.message.includes('403')) {
                errorMessage += 'Non ho i permessi per aprire il gruppo. Assicurati che io sia admin.'
            } else if (error.message.includes('401')) {
                errorMessage += 'Autorizzazione negata. Il bot potrebbe non essere configurato correttamente.'
            } else {
                errorMessage += error.message
            }
            
            await conn.sendMessage(chat, {
                text: errorMessage
            }, { quoted: m })
        }
    }
}