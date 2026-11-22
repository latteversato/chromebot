import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

export default {
    command: ['system', 'sys', 'vps', 'status'],
    
    async execute(m, { conn }) {
        try {
            // RAM
            const totalRam = os.totalmem() / (1024 ** 3)
            const freeRam = os.freemem() / (1024 ** 3)
            const usedRam = totalRam - freeRam
            const ramPercent = ((usedRam / totalRam) * 100).toFixed(1)

            // CPU
            const cpus = os.cpus()
            const cpuModel = cpus[0].model
            const cpuCores = cpus.length
            const loadAvg = os.loadavg()[0].toFixed(2)

            // Uptime
            const uptimeSeconds = os.uptime()
            const days = Math.floor(uptimeSeconds / 86400)
            const hours = Math.floor((uptimeSeconds % 86400) / 3600)
            const minutes = Math.floor((uptimeSeconds % 3600) / 60)

            // Disco
            const disk = await execAsync('df -h / | tail -1')
            const diskInfo = disk.stdout.trim().split(/\s+/)
            const diskTotal = diskInfo[1]
            const diskUsed = diskInfo[2]
            const diskFree = diskInfo[3]
            const diskPercent = diskInfo[4]

            // Ping a Google
            const ping = await execAsync('ping -c 1 8.8.8.8 | grep time=')
            const pingTime = ping.stdout.match(/time=(\d+\.?\d*)/)?.[1] || 'N/A'

            // Hostname e piattaforma
            const hostname = os.hostname()
            const platform = `${os.type()} ${os.release()}`

            const testo = `╔══✿ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎 ✿══╗
║
║ 💻 *SERVER*
║ ├ Hostname: ${hostname}
║ ├ OS: ${platform}
║ └ Arch: ${os.arch()}
║
║ 🧠 *CPU*
║ ├ Modello: ${cpuModel.substring(0, 40)}...
║ ├ Core: ${cpuCores}
║ └ Carico: ${loadAvg}%
║
║ 🎮 *RAM*
║ ├ Totale: ${totalRam.toFixed(1)} GB
║ ├ Usata: ${usedRam.toFixed(1)} GB
║ ├ Libera: ${freeRam.toFixed(1)} GB
║ └ Utilizzo: ${ramPercent}%
║
║ 💾 *DISCO*
║ ├ Totale: ${diskTotal}
║ ├ Usato: ${diskUsed}
║ ├ Libero: ${diskFree}
║ └ Utilizzo: ${diskPercent}
║
║ 🌐 *RETE*
║ ├ Ping: ${pingTime} ms
║ └ Connessione: ${pingTime !== 'N/A' ? '✅ Attiva' : '❌ Problemi'}
║
║ ⏱ *UPTIME*
║ └ ${days}g ${hours}h ${minutes}m
║
║ 📊 *STATO*
║ └ ${usedRam / totalRam > 0.9 ? '⚠️ Carico alto' : '✅ Normale'}
║
╚══════════════════╝`

            await conn.sendMessage(m.chat, { text: testo }, { quoted: m })

        } catch (error) {
            console.error('Errore comando system:', error)
            await conn.sendMessage(m.chat, { 
                text: '❌ Errore nel recupero delle informazioni di sistema.' 
            }, { quoted: m })
        }
    }
}