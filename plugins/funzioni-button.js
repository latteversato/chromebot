export default {
    name: 'funzioni-button',
    
    execute: async (m, { conn, usedPrefix }) => {
        // Questo plugin cattura i click sui pulsanti delle funzioni
        if (!m.message?.buttonsResponseMessage) return
        
        const buttonId = m.message.buttonsResponseMessage.selectedButtonId
        
        // Se è un pulsante di enable/disable
        if (buttonId && (buttonId.startsWith('.attiva ') || buttonId.startsWith('.disabilita '))) {
            // Simula un messaggio normale con il comando
            const fakeMessage = {
                ...m,
                message: { conversation: buttonId },
                text: buttonId
            }
            
            // Usa il gestore normale
            await global.gestore.gestisciMessaggio(fakeMessage, conn)
        }
    }
}