export default {
    command: ['chiuso', 'close', 'blocca'],
    admin: true,
    botAdmin: true,

    async execute(m, extra) {
        const conn = extra?.conn || global.conn
        
        try {
            await conn.groupSettingUpdate(m.chat, 'announcement')
            
            const buttonMessage = {
                text: '🔒 Gruppo chiuso!',
                footer: 'Cliccca per aprire il Gruppo',
                buttons: [
                    { buttonId: `${global.prefissoComandi}aperto`, buttonText: { displayText: '🔓 Apri Gruppo' }, type: 1 }
                ],
                headerType: 1
            }
            
            await conn.sendMessage(m.chat, buttonMessage)
            
        } catch (error) {
            console.error('Errore chiuso:', error)
            await conn.sendMessage(m.chat, {
                text: `❌ Errore: ${error.message}`
            })
        }
    }
}