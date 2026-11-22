import { performance } from 'perf_hooks'

const clockString = (ms) => {
    const days = Math.floor(ms / 86400000)
    const hours = Math.floor((ms % 86400000) / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const parts = []
    if (days) parts.push(`${days}ɢ`)
    if (hours || days) parts.push(`${hours}ʜ`)
    parts.push(`${minutes}ᴍ ${seconds}s`)
    return parts.join(' ')
}

export default {
    command: ['ping', 'speed'],

    async execute(m, { conn }) {
        const start = performance.now()
        
        await conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } })
        
        const rtt = Math.round(performance.now() - start)
        const uptime = clockString(process.uptime() * 1000)
        const prefix = global.prefissoComandi || '.'

        const text = `╔══•ೋ°⚡°ೋ•══╗
║       *𝐂𝐇𝐑𝐎𝐌𝐄 𝐁𝐎𝐓*
╠═══════════╣
║ 🏓 *ʟᴀᴛᴇɴᴢᴀ:* ${rtt} ᴍs 
║ ⏱️ *ᴀᴄᴄᴇsᴏ:* ${uptime}
╚═══════════╝`

        const buttons = [
            { buttonId: `${prefix}menu`, buttonText: { displayText: '📋 ᴍᴇɴᴜ' }, type: 1 }
        ]

        await conn.sendMessage(m.chat, {
            text,
            footer: 'ʙᴏᴛ ᴏɴ ᴄᴏᴍᴇ ᴛᴜᴀ ᴍᴀᴍᴍᴀ ʟᴀ sᴇʀᴀ',
            buttons,
            headerType: 1
        }, { quoted: m })
    }
}