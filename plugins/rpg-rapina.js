export default {
    command: ['ruba'],
    
    async execute(m, { conn, text }) {
        if (!m.quoted || !m.quoted.sender) {
            return conn.sendMessage(m.chat, { 
                text: '❌ Rispondi al messaggio della persona da cui vuoi rubare!\nEsempio: .ruba 30' 
            }, { quoted: m });
        }

        if (m.quoted.sender === m.sender) {
            return conn.sendMessage(m.chat, { 
                text: '❌ Non puoi rubare a te stesso!' 
            }, { quoted: m });
        }

        if (!text || isNaN(text) || text < 1 || text > 50) {
            return conn.sendMessage(m.chat, { 
                text: '❌ Inserisci una percentuale valida (1-50)!\nEsempio: .ruba 30' 
            }, { quoted: m });
        }

        const percentualeRichiesta = parseInt(text);
        
        if (percentualeRichiesta < 1 || percentualeRichiesta > 50) {
            return conn.sendMessage(m.chat, { 
                text: '❌ La percentuale deve essere tra 1 e 50!' 
            }, { quoted: m });
        }

        const ladro = m.sender;
        const vittima = m.quoted.sender;

        if (!global.db.data.users[ladro]) global.db.data.users[ladro] = { money: 0, bank: 0 };
        if (!global.db.data.users[vittima]) global.db.data.users[vittima] = { money: 0, bank: 0 };

        const userLadro = global.db.data.users[ladro];
        const userVittima = global.db.data.users[vittima];

        if (userVittima.money < 10) {
            return conn.sendMessage(m.chat, { 
                text: '❌ Questa persona ha solo soldi in banca (protetti) o è troppo povera!' 
            }, { quoted: m });
        }

        const successo = Math.random() < 0.2;

        if (successo) {
            const percentualeEffettiva = Math.floor(percentualeRichiesta * 0.5);
            const importoRubato = Math.floor(userVittima.money * (percentualeEffettiva / 100));

            userLadro.money += importoRubato;
            userVittima.money -= importoRubato;

            const messaggio = `
╭━━━「 ✅ RUBATA 」━━━╮
┃
┃  🕴️ *Hai rubato con successo!*
┃
┃  💰 *Importo:* €${importoRubato}
┃  📊 *Richiesto:* ${percentualeRichiesta}%
┃  📉 *Ottenuto:* ${percentualeEffettiva}%
┃  💳 *Rubato dal:* Portafoglio
┃  👤 *Vittima:* @${vittima.split('@')[0]}
┃
┃  🏦 *Soldi in banca:* €${userVittima.bank} (protetti)
┃
╰━━━━━━━━━━━━━━━━╯`;

            await conn.sendMessage(m.chat, { 
                text: messaggio,
                mentions: [vittima]
            }, { quoted: m });

        } else {
            const multa = 5000;

            userLadro.money = Math.max(0, userLadro.money - multa);

            const messaggio = `
╭━━━「 ❌ FALLITA 」━━━╮
┃
┃  😅 *Sei stato scoperto!*
┃
┃  💸 *Multa:* €${multa}
┃  👮 Sei stato beccato
┃
┃  📊 *Tentativo:* ${percentualeRichiesta}%
┃
╰━━━━━━━━━━━━━━━━╯`;

            await conn.sendMessage(m.chat, { 
                text: messaggio
            }, { quoted: m });
        }
    }
}