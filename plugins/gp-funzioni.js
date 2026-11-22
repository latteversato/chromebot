import { getChat, forceSave } from '../database.js'

export default {
    command: ['enable', 'disable', 'attiva', 'disabilita'],

    async execute(m, { conn, args, command, sender, isGroup, isAdmin, isOwner, isROwner }) {
        const chatId = m.chat
        const isEnable = /enable|attiva|on|1/i.test(command)
        const feature = (args[0] || '').toLowerCase()

        let chatData = getChat(chatId, true)

        if (!feature) {
            const elenco = [
                { nome: 'Antinuke', chiave: 'antinuke', emoji: '🛡️' },
                { nome: 'Detect', chiave: 'detect', emoji: '🔍' },
                { nome: 'Benvenuto', chiave: 'welcome', emoji: '👋' },
                { nome: 'Antilink Gruppo', chiave: 'antilinkgp', emoji: '🔗' },
                { nome: 'Antilink Hard', chiave: 'antilinkhard', emoji: '⛔' },
                { nome: 'Anti Spam', chiave: 'antiSpam', emoji: '📨' },
                { nome: 'Anti Elimina', chiave: 'antielimina', emoji: '🗑️' },
                { nome: 'Anti ViewOnce', chiave: 'antiviewonce', emoji: '👀' },
                { nome: 'Anti Traba', chiave: 'antiTraba', emoji: '🚫' },
                { nome: 'Anti Pakistani', chiave: 'antipaki', emoji: '🚫' },
                { nome: 'Anti Arabi', chiave: 'antiArab', emoji: '🚫' },
                { nome: 'Anti Porno', chiave: 'antiporno', emoji: '🔞' },
                { nome: 'Anti Chiamate', chiave: 'antiCall', emoji: '📞' },
                { nome: 'Anti Bot', chiave: 'antibot', emoji: '🤖' },
                { nome: 'Bestemmiometro', chiave: 'bestemmiometro', emoji: '📊' },
                { nome: 'Auto Sticker', chiave: 'autosticker', emoji: '🏷️' },
                { nome: 'Solo Admin', chiave: 'modoadmin', emoji: '👮' },
                { nome: 'Solo Privato', chiave: 'soloprivato', emoji: '🔒' },
                { nome: 'Solo Gruppo', chiave: 'sologruppo', emoji: '👥' },
                { nome: 'Auto Delete', chiave: 'delete', emoji: '🧹' }
            ]

            const attive = elenco.filter(f => chatData[f.chiave])
            const disattive = elenco.filter(f => !chatData[f.chiave])

            let text = `╭━━━「 ⚙️ 𝐅𝐔𝐍𝐙𝐈𝐎𝐍𝐈 𝐆𝐑𝐔𝐏𝐏𝐎 」━━━╮\n┃\n`
            text += `┃ 🟢 *𝐀𝐓𝐓𝐈𝐕𝐄 (${attive.length})*\n`
            text += attive.length ? attive.map(f => `┃   ${f.emoji} ${f.nome}`).join('\n') + '\n' : `┃   𝐍𝐞𝐬𝐬𝐮𝐧𝐚\n`
            text += `┃\n`
            text += `┃ 🔴 *𝐃𝐈𝐒𝐀𝐓𝐓𝐈𝐕𝐄 (${disattive.length})*\n`
            text += disattive.length ? disattive.map(f => `┃   ${f.emoji} ${f.nome}`).join('\n') + '\n' : `┃   𝐍𝐞𝐬𝐬𝐮𝐧𝐚\n`
            text += `┃\n`
            text += `┃ ✏️ *𝐂𝐨𝐦𝐚𝐧𝐝𝐢:*\n`
            text += `┃   .attiva <funzione>\n`
            text += `┃   .disabilita <funzione>\n`
            text += `┃\n`
            text += `┃ 📑 *𝐂𝐡𝐢𝐚𝐯𝐢 𝐝𝐢𝐬𝐩𝐨𝐧𝐢𝐛𝐢𝐥𝐢:*\n`
            text += `┃   ${elenco.map(f => f.chiave).join(', ')}\n`
            text += `╰━━━━━━━━━━━━━━━━━━╯`

            return conn.sendMessage(m.chat, { text }, { quoted: m })
        }

        if (!isGroup) {
            return conn.sendMessage(m.chat, {
                text: `╭━━━「 ❌ 𝐄𝐑𝐑𝐎𝐑𝐄 」━━━╮\n┃\n┃ Questa funzione può essere usata solo nei gruppi\n┃\n╰━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: m })
        }

        if (!isAdmin && !isOwner && !isROwner) {
            return conn.sendMessage(m.chat, {
                text: `❌ Solo gli admin del gruppo possono usare questa funzione`
            }, { quoted: m })
        }

        const mappaFunzioni = {
            'antinuke': 'antinuke',
            'detect': 'detect',
            'benvenuto': 'welcome',
            'welcome': 'welcome',
            'antilinkgp': 'antilinkgp',
            'antilinkhard': 'antilinkhard',
            'antispam': 'antiSpam',
            'antielimina': 'antielimina',
            'antiviewonce': 'antiviewonce',
            'antitraba': 'antiTraba',
            'antipaki': 'antipaki',
            'antiarab': 'antiArab',
            'antiporno': 'antiporno',
            'anticall': 'antiCall',
            'antibot': 'antibot',
            'bestemmiometro': 'bestemmiometro',
            'autosticker': 'autosticker',
            'modoadmin': 'modoadmin',
            'soloprivato': 'soloprivato',
            'sologruppo': 'sologruppo',
            'delete': 'delete'
        }

        if (!mappaFunzioni[feature]) {
            return conn.sendMessage(m.chat, {
                text: `╭━━━「 ❌ 𝐍𝐎𝐍 𝐑𝐈𝐂𝐎𝐍𝐎𝐒𝐂𝐈𝐔𝐓𝐀 」━━━╮\n┃\n┃ La funzione "${feature}" non esiste\n┃ Usa .enable per vedere la lista\n┃\n╰━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: m })
        }

        if (feature === 'antinuke' && !isOwner && !isROwner) {
            return conn.sendMessage(m.chat, {
                text: `❌ Solo l'owner del bot può attivare/disattivare l'antinuke`
            }, { quoted: m })
        }

        if (feature === 'antilinkhard' && isEnable) {
            chatData.antilinkgp = false
        }
        if (feature === 'antilinkgp' && isEnable) {
            chatData.antilinkhard = false
        }

        chatData[mappaFunzioni[feature]] = isEnable
        forceSave()

        const statusEmoji = isEnable ? '🟢' : '🔴'
        const statusText = isEnable ? 'ATTIVATA' : 'DISATTIVATA'

        let extraNote = ''
        if (feature === 'antilinkhard' && isEnable) {
            extraNote = '\n┃ ⚠️ 𝐀𝐧𝐭𝐢𝐥𝐢𝐧𝐤 𝐆𝐫𝐮𝐩𝐩𝐨 𝐝𝐢𝐬𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨 (mutuamente esclusivo)'
        }
        if (feature === 'antilinkgp' && isEnable) {
            extraNote = '\n┃ ⚠️ 𝐀𝐧𝐭𝐢𝐥𝐢𝐧𝐤 𝐇𝐚𝐫𝐝 𝐝𝐢𝐬𝐚𝐭𝐭𝐢𝐯𝐚𝐭𝐨 (mutuamente esclusivo)'
        }

        await conn.sendMessage(m.chat, {
            text: `╭━━━「 ✅ 𝐂𝐎𝐍𝐅𝐄𝐑𝐌𝐀 」━━━╮\n┃\n┃ 📌 𝐅𝐮𝐧𝐳𝐢𝐨𝐧𝐞: ${feature}\n┃ ${statusEmoji} 𝐒𝐭𝐚𝐭𝐨: ${statusText}${extraNote}\n┃ 👤 𝐀𝐝𝐦𝐢𝐧: @${sender.split('@')[0]}\n┃\n╰━━━━━━━━━━━━━━━━━━╯`,
            mentions: [sender]
        }, { quoted: m })
    }
}