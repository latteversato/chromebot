export default {
    command: ['add'],
    admin: true,
    botAdmin: true,
    group: true,
    
    async execute(m, { conn, text }) {
        if (!text) {
            return conn.sendMessage(m.chat, {
                text: `❌ *Devi inserire un numero*\n\n📌 Esempio:\n.add 393471234567`
            }, { quoted: m });
        }

        let numbers = text.split(/\s+/).filter(num => num.trim());
        
        if (numbers.length === 0) {
            return conn.sendMessage(m.chat, {
                text: `❌ *Numero non valido*`
            }, { quoted: m });
        }

        let added = [];
        let failed = [];

        for (let num of numbers) {
            num = num.replace(/[^0-9]/g, '');
            
            if (num.length < 10 || num.length > 15) {
                failed.push(`${num} (numero non valido)`);
                continue;
            }

            const jid = num + '@s.whatsapp.net';
            
            try {
                await conn.groupParticipantsUpdate(m.chat, [jid], 'add');
                added.push(num);
            } catch (error) {
                console.error('Errore aggiunta:', error);
                failed.push(num);
            }
        }

        let reply = '';
        
        if (added.length > 0) {
            reply += `✅ *Aggiunti con successo:*\n`;
            for (let num of added) {
                reply += `┃ @${num}\n`;
            }
        }
        
        if (failed.length > 0) {
            if (reply) reply += `\n`;
            reply += `❌ *Falliti:*\n`;
            for (let num of failed) {
                reply += `┃ ${num}\n`;
            }
        }

        const mentions = added.map(num => num + '@s.whatsapp.net');
        
        await conn.sendMessage(m.chat, {
            text: reply,
            mentions: mentions
        }, { quoted: m });
    }
}