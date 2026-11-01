import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import sistemaRuoli from './ruoli.js'
// Helper LID <-> numero: definiti in principale.js (global.jidTools)
const learnParticipants = (l) => global.jidTools?.learnParticipants(l)
const participantMatches = (p, j) => global.jidTools ? global.jidTools.participantMatches(p, j) : false
import { incrementMessaggi, incrementComandi, isBanned, getChat } from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function withTimeout(promise, ms, label = 'operazione') {
    let timer
    return Promise.race([
        promise,
        new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`${label}: timeout ${ms}ms`)), ms) })
    ]).finally(() => clearTimeout(timer))
}

class GestionePlugin {
    constructor() {
        this.plugins = {}
        this.pluginFolder = path.join(__dirname, 'plugins')
        this.watcherDebounce = {}
        this.caricaTuttiPlugin()
        this.avviaWatcherPlugin()
    }

    smsg(conn, m) {
        if (!m) return m
        const newM = { ...m }
        newM.chat = m.key?.remoteJid
        newM.fromMe = m.key?.fromMe || false
        newM.sender = newM.fromMe
            ? conn.user?.id
            : (m.key?.participant || m.key?.remoteJid)
        if (m.message) {
            newM.text =
                m.message.conversation ||
                m.message.extendedTextMessage?.text ||
                m.message.imageMessage?.caption ||
                m.message.videoMessage?.caption ||
                ''
            newM.payment = this.extractPayment(m.message)
        }
        if (!m.quoted) {
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
            if (quoted) {
                newM.quoted = {
                    text:
                        quoted.conversation ||
                        quoted.extendedTextMessage?.text ||
                        quoted.imageMessage?.caption ||
                        quoted.videoMessage?.caption ||
                        ''
                }
            }
        }
        return newM
    }

    // Riconosce tutti i formati di messaggio "pagamento" che WhatsApp può inviare.
    extractPayment(message) {
        if (!message) return null

        const sendPayment = message.sendPaymentMessage
        const requestPayment = message.requestPaymentMessage
        const declinePayment = message.declinePaymentRequestMessage
        const cancelPayment = message.cancelPaymentRequestMessage
        const paymentInvite = message.paymentInviteMessage
        const interactiveWithPayment = message.interactiveMessage?.nativeFlowMessage?.buttons
            ?.find(b => b.name === 'review_and_pay' || b.name === 'payment_info')

        if (sendPayment) {
            return {
                type: 'send',
                raw: sendPayment,
                amount1000: sendPayment.amount1000 ?? null,
                currency: sendPayment.currency ?? null,
                requestMessageKey: sendPayment.requestMessageKey ?? null,
                note: sendPayment.noteMessage?.extendedTextMessage?.text
                    || sendPayment.noteMessage?.conversation
                    || null
            }
        }

        if (requestPayment) {
            const amountInfo = requestPayment.amount || requestPayment.requestPaymentMessage?.amount
            return {
                type: 'request',
                raw: requestPayment,
                amount1000: amountInfo?.value ?? null,
                currency: amountInfo?.currencyCode ?? null,
                note: requestPayment.noteMessage?.extendedTextMessage?.text
                    || requestPayment.noteMessage?.conversation
                    || null,
                expiryTimestamp: requestPayment.expiryTimestamp ?? null
            }
        }

        if (declinePayment) {
            return { type: 'decline', raw: declinePayment }
        }

        if (cancelPayment) {
            return { type: 'cancel', raw: cancelPayment }
        }

        if (paymentInvite) {
            return {
                type: 'invite',
                raw: paymentInvite,
                serviceType: paymentInvite.serviceType ?? null,
                expiryTimestamp: paymentInvite.expiryTimestamp ?? null
            }
        }

        if (interactiveWithPayment) {
            return { type: 'interactive', raw: interactiveWithPayment }
        }

        return null
    }

    async caricaTuttiPlugin() {
        if (!fs.existsSync(this.pluginFolder)) {
            fs.mkdirSync(this.pluginFolder, { recursive: true })
            return
        }
        const files = fs.readdirSync(this.pluginFolder).filter(f => f.endsWith('.js'))
        for (const file of files) {
            const name = path.basename(file, '.js')
            const filePath = path.join(this.pluginFolder, file)
            await this.caricaPlugin(name, filePath)
        }
        console.log(`✅ Plugin caricati: ${Object.keys(this.plugins).length}`)
    }

    async caricaPlugin(name, filePath) {
        try {
            const modulo = await import(pathToFileURL(filePath).href + `?update=${Date.now()}`)
            const plugin = modulo.default || modulo
            this.plugins[name] = { ...plugin, ...(typeof plugin === 'function' ? { run: plugin } : {}), file: filePath, name }
            console.log(`🔄 Plugin pronto: ${name}`)
        } catch (e) {
            console.error(`❌ Errore plugin ${name}:`, e.message)
        }
    }

    avviaWatcherPlugin() {
        fs.watch(this.pluginFolder, async (event, filename) => {
            if (!filename || !filename.endsWith('.js')) return

            const pluginName = path.basename(filename, '.js')
            if (this.watcherDebounce[pluginName]) clearTimeout(this.watcherDebounce[pluginName])
            this.watcherDebounce[pluginName] = setTimeout(async () => {
                delete this.watcherDebounce[pluginName]
                const pluginPath = path.join(this.pluginFolder, filename)

                if (!fs.existsSync(pluginPath)) {
                    delete this.plugins[pluginName]
                    console.log(`🗑️ Plugin rimosso: ${pluginName}`)
                    return
                }

                await this.caricaPlugin(pluginName, pluginPath)
                console.log(`✅ Plugin aggiornato: ${pluginName}`)
            }, 300)
        })
        console.log('🔥 Hot Reload plugin attivo!')
    }

    async eseguiBefore(m, conn) {
        try {
            for (const plugin of Object.values(this.plugins)) {
                if (!plugin || plugin.disabled) continue
                if (typeof plugin.before === 'function') {
                    try {
                        const result = await withTimeout(Promise.resolve(plugin.before(m, {
                            conn,
                            isAdmin: m.isAdmin,
                            isBotAdmin: m.isBotAdmin,
                            isOwner: sistemaRuoli.isOwner(m.sender),
                            isROwner: sistemaRuoli.isROwner(m.sender, conn),
                            isVip: sistemaRuoli.isVip(m.sender, m.chat),
                            isWhitelisted: sistemaRuoli.isWhitelisted(m.sender, m.chat),
                            isPremium: sistemaRuoli.isPremium(m.sender)
                        })), 15000, `before ${plugin.name}`)
                        if (result === true) return true
                    } catch (e) {
                        console.error(`❌ Errore before plugin ${plugin.name}:`, e.message)
                    }
                }
            }
        } catch (e) {
            console.error('❌ Errore eseguiBefore:', e.message)
        }
        return false
    }

    async gestisciMessaggio(m, conn) {
        try {
            m = this.smsg(conn, m)

            m.isGroup = m.chat?.endsWith('@g.us') || false
            m.isAdmin = false
            m.isBotAdmin = false

            if (m.isGroup) {
                try {
                    const groupMetadata = await conn.groupMetadata(m.chat).catch(() => null)
                    if (groupMetadata?.participants) {
                        const participants = groupMetadata.participants
                        learnParticipants(participants)
                        const botIds = [conn.user?.id, conn.user?.lid].filter(Boolean)

                        // confronto su tutte le forme (lid / numero), non solo su p.id
                        const user = participants.find(p => participantMatches(p, m.sender))
                        const bot = participants.find(p => botIds.some(b => participantMatches(p, b)))

                        m.isAdmin = !!(user?.admin === 'admin' || user?.admin === 'superadmin')
                        m.isBotAdmin = !!(bot?.admin === 'admin' || bot?.admin === 'superadmin')

                        m.participants = participants
                    }
                } catch (e) {
                    console.error('❌ Errore admin check:', e.message)
                }
            }

            if (m.sender && !m.key?.fromMe) {
                try {
                    if (isBanned(m.sender)) return
                    await incrementMessaggi(m.sender)
                } catch (e) {
                    console.error('❌ Errore incremento messaggi:', e.message)
                }
            }

            if (m.messageStubType || m.messageStubParameters) {
                await this.eseguiBefore(m, conn)
                return
            }

            if (m.payment) {
                await this.gestisciPayment(m, conn)
            }

            const bloccato = await this.eseguiBefore(m, conn)
            if (bloccato) return

            if (!m.text) return

            // Sicurezza: Fallback automatico se le variabili globali non sono definite
            const prefissi = global.prefissiMulti || ['.', '/', '!', '#'];
            const messaggiObj = global.messaggi || {
                soloOwner: '❌ Comando riservato agli owner!',
                soloPremium: '❌ Comando riservato agli utenti Premium!',
                soloVip: '❌ Comando riservato ai membri VIP!',
                soloAdmin: '❌ Comando riservato agli amministratori!',
                soloBotAdmin: '❌ Il bot deve essere amministratore del gruppo!',
                soloGroup: '❌ Comando eseguibile solo nei gruppi!',
                soloPrivate: '❌ Comando eseguibile solo in chat privata!'
            };

            const prefissoUsato = prefissi.find(p => m.text.startsWith(p))
            if (!prefissoUsato) return

            const body = m.text.slice(prefissoUsato.length).trim()
            if (!body) return

            const commandText = body.split(/\s+/)[0].toLowerCase()

            try {
                const chat = getChat(m.chat, false)
                if (chat?.isBanned === true) {
                    const isOwner = sistemaRuoli.isOwner(m.sender) || sistemaRuoli.isROwner(m.sender, conn)
                    if (!(isOwner && (commandText === 'on' || commandText === 'unbanchat'))) {
                        return
                    }
                }
            } catch (e) {
                console.error('❌ Errore controllo banchat:', e.message)
            }

            for (const plugin of Object.values(this.plugins)) {
                if (!plugin || plugin.disabled) continue
                if (!plugin.command) continue

                if (this.comandoCorrisponde(plugin.command, commandText)) {

                    // segna il messaggio come letto (spunte blu) a ogni comando
                    if (m.key?.id && !m.key.fromMe && typeof conn.readMessages === 'function') {
                        conn.readMessages([m.key]).catch(() => {})
                    }

                    const isWhitelisted = sistemaRuoli.isWhitelisted(m.sender, m.chat)
                    const wlBypass = !!(plugin.wl && isWhitelisted)

                    if (plugin.owner && !wlBypass && !sistemaRuoli.isOwner(m.sender) && !sistemaRuoli.isROwner(m.sender, conn)) {
                        return conn.sendMessage(m.chat, { text: messaggiObj.soloOwner }, { quoted: m })
                    }

                    if (plugin.premium && !sistemaRuoli.isPremium(m.sender)) {
                        return conn.sendMessage(m.chat, { text: messaggiObj.soloPremium }, { quoted: m })
                    }

                    const isVip = sistemaRuoli.isVip(m.sender, m.chat)
                    const isAdmin = m.isAdmin

                    if (plugin.whitelist && !isWhitelisted) {
                        return conn.sendMessage(m.chat, { text: messaggiObj.soloWhitelist || '❌ Comando riservato agli utenti in whitelist!' }, { quoted: m })
                    }

                    if (wlBypass) {
                        // whitelist del gruppo: bypass di bis/vip/admin
                    } else if (plugin.bis) {
                        if (!isVip && !isAdmin) {
                            return conn.sendMessage(m.chat, { text: '❌ Solo Vip e Admin possono usare questo comando!' }, { quoted: m })
                        }
                    } else if (plugin.vip) {
                        if (!isVip) {
                            return conn.sendMessage(m.chat, { text: messaggiObj.soloVip }, { quoted: m })
                        }
                    } else if (plugin.admin) {
                        if (!m.isGroup) {
                            return conn.sendMessage(m.chat, { text: messaggiObj.soloGroup }, { quoted: m })
                        }
                        if (!isAdmin) {
                            return conn.sendMessage(m.chat, { text: messaggiObj.soloAdmin }, { quoted: m })
                        }
                    }

                    if (plugin.botAdmin) {
                        if (!m.isGroup) {
                            return conn.sendMessage(m.chat, { text: messaggiObj.soloGroup }, { quoted: m })
                        }
                        if (!m.isBotAdmin) {
                            return conn.sendMessage(m.chat, { text: messaggiObj.soloBotAdmin }, { quoted: m })
                        }
                    }

                    if (plugin.group && !m.isGroup) {
                        return conn.sendMessage(m.chat, { text: messaggiObj.soloGroup }, { quoted: m })
                    }

                    if (plugin.private && m.isGroup) {
                        return conn.sendMessage(m.chat, { text: messaggiObj.soloPrivate }, { quoted: m })
                    }

                    if (m.sender && !m.key?.fromMe) {
                        try {
                            await incrementComandi(m.sender, commandText)
                        } catch (e) {
                            console.error('❌ Errore incremento comandi:', e.message)
                        }
                    }

                    // Marca il messaggio come letto prima di eseguire il comando
                    try {
                        if (conn.readMessages && m.key) {
                            conn.readMessages([m.key]).catch(() => {})
                        }
                    } catch (e) {
                        // Ignora eventuali errori di read receipt
                    }

                    // Non aspettiamo la fine del comando: un comando lento (download, AI...)
                    // non deve bloccare gli altri messaggi della chat. Gli errori sono gestiti in eseguiPlugin.
                    this.eseguiPlugin(plugin, m, conn, body).catch(e => console.error('❌ Errore esecuzione plugin:', e.message))
                    break
                }
            }
        } catch (error) {
            console.error('❌ Errore gestione:', error)
        }
    }

    comandoCorrisponde(pluginCommand, commandText) {
        if (!pluginCommand) return false
        if (Array.isArray(pluginCommand)) {
            return pluginCommand.some(cmd =>
                cmd instanceof RegExp
                    ? cmd.test(commandText)
                    : cmd.toLowerCase() === commandText
            )
        }
        return pluginCommand instanceof RegExp
            ? pluginCommand.test(commandText)
            : pluginCommand.toLowerCase() === commandText
    }

    async eseguiPlugin(plugin, m, conn, body) {
        try {
            const commandToken = body.split(/\s+/)[0]
            const text = body.slice(commandToken.length).trim()
            const args = text ? text.split(/\s+/) : []

            let participants = m.participants || []
            if (m.isGroup && !participants.length) {
                try {
                    const groupMetadata = await conn.groupMetadata(m.chat).catch(() => null)
                    participants = groupMetadata?.participants || []
                } catch (e) {
                    console.error('❌ Errore recupero participants:', e.message)
                }
            }

            const extra = {
                conn,
                args,
                text,
                command: commandToken,
                quoted: m.quoted || null,
                chat: m.chat,
                sender: m.sender,
                participants,
                isGroup: m.isGroup,
                isAdmin: m.isAdmin,
                isBotAdmin: m.isBotAdmin,
                isOwner: sistemaRuoli.isOwner(m.sender),
                isROwner: sistemaRuoli.isROwner(m.sender, conn),
                isVip: sistemaRuoli.isVip(m.sender, m.chat),
                isWhitelisted: sistemaRuoli.isWhitelisted(m.sender, m.chat),
                isPremium: sistemaRuoli.isPremium(m.sender),
                payment: m.payment || null,
                mentionedJid: m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
            }

            const run = plugin.execute || plugin.run || (typeof plugin === 'function' ? plugin : null)
            if (run) {
                await run(m, extra)
            }
        } catch (error) {
            console.error(`❌ Errore plugin ${plugin.name}:`, error)
            await conn.sendMessage(m.chat, {
                text: '❌ Si è verificato un errore durante l\'esecuzione del comando.'
            }, { quoted: m })
        }
    }

    // Notifica tutti i plugin che dichiarano un hook onPayment() quando arriva
    // un messaggio di tipo pagamento (invio, richiesta, invito, decline, cancel).
    async gestisciPayment(m, conn) {
        try {
            for (const plugin of Object.values(this.plugins)) {
                if (!plugin || plugin.disabled) continue
                if (typeof plugin.onPayment === 'function') {
                    try {
                        await plugin.onPayment(m, { conn, payment: m.payment })
                    } catch (e) {
                        console.error(`❌ Errore onPayment plugin ${plugin.name}:`, e.message)
                    }
                }
            }
        } catch (e) {
            console.error('❌ Errore gestisciPayment:', e.message)
        }
    }

    async gestisciEventoGruppo(update, conn) {
        try {
            for (const plugin of Object.values(this.plugins)) {
                if (!plugin || plugin.disabled) continue
                if (typeof plugin.groupUpdate === 'function') {
                    try {
                        await plugin.groupUpdate(update, conn)
                    } catch (e) {
                        console.error(`❌ Errore groupUpdate plugin ${plugin.name}:`, e.message)
                    }
                }
            }
        } catch (e) {
            console.error('❌ Errore gestisciEventoGruppo:', e.message)
        }
    }
}

export default new GestionePlugin()