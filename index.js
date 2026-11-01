import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RESTART_DELAY = 2000      // attesa prima di rilanciare il bot
const MAX_DELAY = 60000         // tetto dell'attesa se il bot crasha di continuo
const FAST_EXIT = 10000         // sotto questa durata una chiusura conta come crash

let bot = null
let stopping = false
let fastCrashes = 0

console.log('🚀 Avvio CHROME BOT...');
console.log("TQX + FILO OWN THIS SHIT");

function start() {
    const startedAt = Date.now()

    // cwd fisso sulla cartella di index.js: la sessione (chromesession) e restart.json
    // vengono sempre cercate nello stesso posto, da qualunque cartella lanci "node index.js"
    const child = spawn(process.execPath, ['principale.js', ...process.argv.slice(2)], {
        cwd: __dirname,
        stdio: 'inherit',
        env: { ...process.env, BOT_SUPERVISED: '1' }
    })
    bot = child

    child.on('error', (err) => {
        console.log('❌ Errore:', err.message)
        if (!child.pid) process.exit(1)
    })

    child.on('close', (code) => {
        bot = null
        if (stopping) return process.exit(0)

        const uptime = Date.now() - startedAt
        fastCrashes = uptime < FAST_EXIT ? fastCrashes + 1 : 0

        const delay = Math.min(RESTART_DELAY * 2 ** Math.max(0, fastCrashes - 1), MAX_DELAY)
        console.log(`🔌 Bot terminato, codice: ${code}. Riavvio tra ${delay / 1000}s...`)

        setTimeout(() => {
            if (!stopping) start()
        }, delay)
    })
}

function stop(signal) {
    if (stopping) return
    stopping = true
    console.log('\n👋 Chiusura...')

    if (bot) bot.kill(signal)
    else process.exit(0)

    // sicurezza: se il bot non si chiude entro 5 secondi esco comunque
    setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))

start()
