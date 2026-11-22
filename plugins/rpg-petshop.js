// petsystem.js - Sistema completo animali
import { getUser } from '../database.js'

export default {
    command: ['petshop', 'animali', 'mieianimali', 'compra', 'compracibo', 'dacibo', 'rinominapet', 'fame'],
    
    async execute(m, { conn, args, command }) {
        const user = getUser(m.sender, true)
        
        if (!user.pets) user.pets = []
        if (!user.cibo) user.cibo = 0
        if (!user.ultimoPasto) user.ultimoPasto = {}
        if (!user.ex) user.ex = []
        if (!user.figli) user.figli = []
        if (!user.genitori) user.genitori = []
        if (!user.coniuge) user.coniuge = ''
        if (!user.sposato) user.sposato = false

        const reply = (text) => conn.sendMessage(m.chat, { text }, { quoted: m })

        if (command === 'petshop' || command === 'animali') {
            const testo = `╭══🐾 *𝐏𝐄𝐓 𝐒𝐇𝐎𝐏* ══╮
│
│ 👤 *𝐂𝐥𝐢𝐞𝐧𝐭𝐞:* @${m.sender.split('@')[0]}
│ 💰 *𝐒𝐨𝐥𝐝𝐢:* ${user.money || 0} €
│ 🍖 *𝐂𝐢𝐛𝐨:* ${user.cibo || 0} 𝐤𝐠
│ 🐕 *𝐀𝐧𝐢𝐦𝐚𝐥𝐢:* ${user.pets.length}
│
╰══════════════════╯`

            const buttons = [
                { buttonId: `${global.prefissoComandi}compra cane`, buttonText: { displayText: '🐕 𝐂𝐚𝐧𝐞 (𝟓.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra gatto`, buttonText: { displayText: '🐈 𝐆𝐚𝐭𝐭𝐨 (𝟒.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra coniglio`, buttonText: { displayText: '🐇 𝐂𝐨𝐧𝐢𝐠𝐥𝐢𝐨 (𝟐.𝟓𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra criceto`, buttonText: { displayText: '🐹 𝐂𝐫𝐢𝐜𝐞𝐭𝐨 (𝟏.𝟓𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra pappagallo`, buttonText: { displayText: '🦜 𝐏𝐚𝐩𝐩𝐚𝐠𝐚𝐥𝐥𝐨 (𝟑.𝟓𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra tartaruga`, buttonText: { displayText: '🐢 𝐓𝐚𝐫𝐭𝐚𝐫𝐮𝐠𝐚 (𝟑.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra serpente`, buttonText: { displayText: '🐍 𝐒𝐞𝐫𝐩𝐞𝐧𝐭𝐞 (𝟔.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra volpe`, buttonText: { displayText: '🦊 𝐕𝐨𝐥𝐩𝐞 (𝟖.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra lupo`, buttonText: { displayText: '🐺 𝐋𝐮𝐩𝐨 (𝟏𝟎.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra orso`, buttonText: { displayText: '🐻 𝐎𝐫𝐬𝐨 (𝟏𝟓.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra leone`, buttonText: { displayText: '🦁 𝐋𝐞𝐨𝐧𝐞 (𝟐𝟓.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra tigre`, buttonText: { displayText: '🐯 𝐓𝐢𝐠𝐫𝐞 (𝟑𝟎.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra elefante`, buttonText: { displayText: '🐘 𝐄𝐥𝐞𝐟𝐚𝐧𝐭𝐞 (𝟒𝟎.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra cavallo`, buttonText: { displayText: '🐎 𝐂𝐚𝐯𝐚𝐥𝐥𝐨 (𝟓𝟎.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra drago`, buttonText: { displayText: '🐉 𝐃𝐫𝐚𝐠𝐨 (𝟐𝟎𝟎.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra unicorno`, buttonText: { displayText: '🦄 𝐔𝐧𝐢𝐜𝐨𝐫𝐧𝐨 (𝟏𝟓𝟎.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compra capra`, buttonText: { displayText: '🐐 𝐂𝐚𝐩𝐫𝐚 (𝟏.𝟎𝟎𝟎.𝟎𝟎𝟎€)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}compracibo`, buttonText: { displayText: '🍖 𝐂𝐢𝐛𝐨 (𝟐𝟎𝟎€/𝐤𝐠)' }, type: 1 },
                { buttonId: `${global.prefissoComandi}mieianimali`, buttonText: { displayText: '📋 𝐈 𝐌𝐢𝐞𝐢 𝐀𝐧𝐢𝐦𝐚𝐥𝐢' }, type: 1 },
                { buttonId: `${global.prefissoComandi}dacibo`, buttonText: { displayText: '🍽️ 𝐃𝐚𝐢 𝐝𝐚 𝐌𝐚𝐧𝐠𝐢𝐚𝐫𝐞' }, type: 1 },
                { buttonId: `${global.prefissoComandi}fame`, buttonText: { displayText: '⚠️ 𝐂𝐨𝐧𝐭𝐫𝐨𝐥𝐥𝐚 𝐅𝐚𝐦𝐞' }, type: 1 }
            ]

            return await conn.sendMessage(m.chat, {
                text: testo,
                mentions: [m.sender],
                footer: "𝐒𝐞𝐥𝐞𝐳𝐢𝐨𝐧𝐚 𝐮𝐧'𝐨𝐩𝐳𝐢𝐨𝐧𝐞:",
                buttons: buttons,
                headerType: 1
            })
        }

        if (command === 'compra') {
            if (!args[0]) return reply('❌ 𝐃𝐞𝐯𝐢 𝐬𝐩𝐞𝐜𝐢𝐟𝐢𝐜𝐚𝐫𝐞 𝐮𝐧 𝐚𝐧𝐢𝐦𝐚𝐥𝐞!')
            
            const animali = {
                cane: { emoji: '🐕', prezzo: 5000 },
                gatto: { emoji: '🐈', prezzo: 4000 },
                coniglio: { emoji: '🐇', prezzo: 2500 },
                criceto: { emoji: '🐹', prezzo: 1500 },
                pappagallo: { emoji: '🦜', prezzo: 3500 },
                tartaruga: { emoji: '🐢', prezzo: 3000 },
                serpente: { emoji: '🐍', prezzo: 6000 },
                volpe: { emoji: '🦊', prezzo: 8000 },
                lupo: { emoji: '🐺', prezzo: 10000 },
                orso: { emoji: '🐻', prezzo: 15000 },
                leone: { emoji: '🦁', prezzo: 25000 },
                tigre: { emoji: '🐯', prezzo: 30000 },
                elefante: { emoji: '🐘', prezzo: 40000 },
                cavallo: { emoji: '🐎', prezzo: 50000 },
                drago: { emoji: '🐉', prezzo: 200000 },
                unicorno: { emoji: '🦄', prezzo: 150000 },
                capra: { emoji: '🐐', prezzo: 1000000 }
            }

            const animale = args[0].toLowerCase()
            if (!animali[animale]) return reply('❌ 𝐀𝐧𝐢𝐦𝐚𝐥𝐞 𝐧𝐨𝐧 𝐯𝐚𝐥𝐢𝐝𝐨!')

            if ((user.money || 0) < animali[animale].prezzo) {
                return reply(`❌ 𝐍𝐨𝐧 𝐡𝐚𝐢 𝐚𝐛𝐛𝐚𝐬𝐭𝐚𝐧𝐳𝐚 𝐬𝐨𝐥𝐝𝐢! 𝐌𝐚𝐧𝐜𝐚𝐧𝐨 ${animali[animale].prezzo - (user.money || 0)}€`)
            }

            user.money = (user.money || 0) - animali[animale].prezzo
            user.pets.push({
                tipo: animale,
                emoji: animali[animale].emoji,
                nome: `${animali[animale].emoji} ${animale.charAt(0).toUpperCase() + animale.slice(1)}`,
                ultimoPasto: Date.now(),
                fame: 0
            })

            return reply(`✅ 𝐇𝐚𝐢 𝐚𝐜𝐪𝐮𝐢𝐬𝐭𝐚𝐭𝐨 ${animali[animale].emoji} ${animale}!`)
        }

        if (command === 'compracibo') {
            const kg = parseInt(args[0]) || 1
            const costoCibo = kg * 200

            if ((user.money || 0) < costoCibo) {
                return reply(`❌ 𝐍𝐨𝐧 𝐡𝐚𝐢 𝐚𝐛𝐛𝐚𝐬𝐭𝐚𝐧𝐳𝐚 𝐬𝐨𝐥𝐝𝐢! 𝐌𝐚𝐧𝐜𝐚𝐧𝐨 ${costoCibo - (user.money || 0)}€`)
            }

            user.money = (user.money || 0) - costoCibo
            user.cibo = (user.cibo || 0) + kg

            return reply(`✅ 𝐀𝐜𝐪𝐮𝐢𝐬𝐭𝐚𝐭𝐢 ${kg}𝐤𝐠 𝐝𝐢 𝐜𝐢𝐛𝐨 𝐩𝐞𝐫 ${costoCibo}€`)
        }

        if (command === 'mieianimali') {
            if (user.pets.length === 0) {
                return reply('❌ 𝐍𝐨𝐧 𝐡𝐚𝐢 𝐚𝐧𝐜𝐨𝐫𝐚 𝐚𝐧𝐢𝐦𝐚𝐥𝐢! 𝐔𝐬𝐚 .𝐩𝐞𝐭𝐬𝐡𝐨𝐩 𝐩𝐞𝐫 𝐜𝐨𝐦𝐩𝐫𝐚𝐫𝐞.')
            }

            let testo = `╭══🐾 *𝐈 𝐌𝐈𝐄𝐈 𝐀𝐍𝐈𝐌𝐀𝐋𝐈* ══╮\n│\n`
            
            user.pets.forEach((pet, index) => {
                const oreFame = Math.floor((Date.now() - (pet.ultimoPasto || Date.now())) / (3600000))
                const statoFame = oreFame >= 6 ? '🍖 𝐀𝐟𝐟𝐚𝐦𝐚𝐭𝐨!' : oreFame >= 4 ? '⚠️ 𝐅𝐚𝐦𝐞' : '✅ 𝐒𝐚𝐳𝐢𝐨'
                testo += `│ ${index + 1}. ${pet.emoji} *${pet.nome}*\n│ 📊 ${statoFame}\n│\n`
            })
            
            testo += `╰══════════════════╯`

            const buttons = [
                { buttonId: `${global.prefissoComandi}dacibo`, buttonText: { displayText: '🍽️ 𝐃𝐚𝐢 𝐝𝐚 𝐌𝐚𝐧𝐠𝐢𝐚𝐫𝐞' }, type: 1 },
                { buttonId: `${global.prefissoComandi}rinominapet`, buttonText: { displayText: '✏️ 𝐑𝐢𝐧𝐨𝐦𝐢𝐧𝐚 𝐀𝐧𝐢𝐦𝐚𝐥𝐞' }, type: 1 }
            ]

            return await conn.sendMessage(m.chat, {
                text: testo,
                mentions: [m.sender],
                footer: '𝐆𝐞𝐬𝐭𝐢𝐬𝐜𝐢 𝐢 𝐭𝐮𝐨𝐢 𝐚𝐧𝐢𝐦𝐚𝐥𝐢:',
                buttons: buttons,
                headerType: 1
            })
        }

        if (command === 'dacibo') {
            if (user.pets.length === 0) {
                return reply('❌ 𝐍𝐨𝐧 𝐡𝐚𝐢 𝐚𝐧𝐢𝐦𝐚𝐥𝐢!')
            }

            if ((user.cibo || 0) < 1) {
                return reply('❌ 𝐍𝐨𝐧 𝐡𝐚𝐢 𝐜𝐢𝐛𝐨! 𝐂𝐨𝐦𝐩𝐫𝐚𝐥𝐨 𝐜𝐨𝐧 .𝐜𝐨𝐦𝐩𝐫𝐚𝐜𝐢𝐛𝐨')
            }

            let nutriti = 0
            let ciboDisponibile = user.cibo || 0
            
            const animaliAffamati = user.pets.filter(pet => {
                const orePassate = (Date.now() - (pet.ultimoPasto || Date.now())) / 3600000
                return orePassate >= 6
            })
            
            const animaliDaNutrire = Math.min(animaliAffamati.length, ciboDisponibile)
            
            if (animaliDaNutrire === 0) {
                if (animaliAffamati.length > 0) {
                    return reply(`❌ Hai ${animaliAffamati.length} animali affamati ma non hai abbastanza cibo! Hai solo ${ciboDisponibile}kg.`)
                } else {
                    return reply('✅ Tutti i tuoi animali sono già sazi!')
                }
            }
            
            for (let i = 0; i < animaliDaNutrire; i++) {
                animaliAffamati[i].ultimoPasto = Date.now()
                nutriti++
            }
            
            user.cibo = ciboDisponibile - nutriti

            let risposta = `🍖 𝐇𝐚𝐢 𝐝𝐚𝐭𝐨 𝐝𝐚 𝐦𝐚𝐧𝐠𝐢𝐚𝐫𝐞 𝐚 ${nutriti} 𝐚𝐧𝐢𝐦𝐚𝐥𝐢!\n`
            if (animaliAffamati.length > nutriti) {
                risposta += `⚠️ Rimangono ${animaliAffamati.length - nutriti} animali affamati ma non hai più cibo.`
            }
            
            return reply(risposta)
        }

        if (command === 'fame') {
            if (user.pets.length === 0) {
                return reply('❌ 𝐍𝐨𝐧 𝐡𝐚𝐢 𝐚𝐧𝐢𝐦𝐚𝐥𝐢!')
            }

            let affamati = 0
            user.pets.forEach(pet => {
                const orePassate = (Date.now() - (pet.ultimoPasto || Date.now())) / 3600000
                if (orePassate >= 6) affamati++
            })

            if (affamati === 0) {
                return reply('✅ 𝐓𝐮𝐭𝐭𝐢 𝐢 𝐭𝐮𝐨𝐢 𝐚𝐧𝐢𝐦𝐚𝐥𝐢 𝐬𝐨𝐧𝐨 𝐬𝐚𝐳𝐢!')
            } else {
                return reply(`⚠️ 𝐇𝐚𝐢 ${affamati} 𝐚𝐧𝐢𝐦𝐚𝐥𝐢 𝐚𝐟𝐟𝐚𝐦𝐚𝐭𝐢! 𝐔𝐬𝐚 .𝐝𝐚𝐜𝐢𝐛𝐨`)
            }
        }

        if (command === 'rinominapet') {
            if (user.pets.length === 0) {
                return reply('❌ 𝐍𝐨𝐧 𝐡𝐚𝐢 𝐚𝐧𝐢𝐦𝐚𝐥𝐢!')
            }

            if (!args[0] || !args[1]) {
                return reply('❌ 𝐔𝐬𝐚: .𝐫𝐢𝐧𝐨𝐦𝐢𝐧𝐚𝐩𝐞𝐭 [𝐧𝐮𝐦𝐞𝐫𝐨] [𝐧𝐮𝐨𝐯𝐨 𝐧𝐨𝐦𝐞]\n𝐄𝐬𝐞𝐦𝐩𝐢𝐨: .𝐫𝐢𝐧𝐨𝐦𝐢𝐧𝐚𝐩𝐞𝐭 1 𝐏𝐥𝐮𝐭𝐨')
            }

            const index = parseInt(args[0]) - 1
            if (index < 0 || index >= user.pets.length) {
                return reply('❌ 𝐍𝐮𝐦𝐞𝐫𝐨 𝐚𝐧𝐢𝐦𝐚𝐥𝐞 𝐧𝐨𝐧 𝐯𝐚𝐥𝐢𝐝𝐨!')
            }

            const nuovoNome = args.slice(1).join(' ')
            const vecchioNome = user.pets[index].nome
            user.pets[index].nome = `${user.pets[index].emoji} ${nuovoNome}`

            return reply(`✅ 𝐀𝐧𝐢𝐦𝐚𝐥𝐞 𝐫𝐢𝐧𝐨𝐦𝐢𝐧𝐚𝐭𝐨!\n📝 ${vecchioNome} ➔ ${user.pets[index].emoji} ${nuovoNome}`)
        }
    }
}