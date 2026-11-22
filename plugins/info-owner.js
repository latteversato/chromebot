export default {
    command: ['staff', 'team'],
    
    async execute(m, { conn }) {
        const createVCard = (name, number, role) => {
            return `BEGIN:VCARD
VERSION:3.0
FN:${name}
ORG:CHROME BOT;
TEL;type=CELL;type=VOICE;waid=${number}:+${number}
X-ABLabel:${role}
END:VCARD`.replace(/\n/g, '\r\n');
        };

        const contacts = global.owner.map(([number, name, isCreator]) => ({
            vcard: createVCard(
                name || 'Owner', 
                number, 
                isCreator ? 'Creator' : 'Owner'
            )
        }));

        await conn.sendMessage(m.chat, { 
            contacts: { 
                displayName: '👑 CHROME BOT OWNER', 
                contacts: contacts
            }
        }, { quoted: m });
    }
}