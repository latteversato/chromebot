import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getUser, forceSave } from '../database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CLASSIFICA_PATH = path.join(__dirname, '../db/bandieraclassifica.json')
const BANDIERE_PATH = path.join(__dirname, '../db/bandiere.json')

function loadClassifica() {
  try {
    if (!fs.existsSync(CLASSIFICA_PATH)) return {}
    return JSON.parse(fs.readFileSync(CLASSIFICA_PATH, 'utf8'))
  } catch (error) {
    console.error('❌ Errore caricamento classifica:', error)
    return {}
  }
}

function saveClassifica(classifica) {
  try {
    fs.writeFileSync(CLASSIFICA_PATH, JSON.stringify(classifica, null, 2))
  } catch (error) {
    console.error('❌ Errore salvataggio classifica:', error)
  }
}

function loadBandiere() {
  try {
    if (!fs.existsSync(BANDIERE_PATH)) {
      throw new Error('File bandiere.json non trovato!')
    }
    
    const fileContent = fs.readFileSync(BANDIERE_PATH, 'utf8')
    const bandiereData = JSON.parse(fileContent)
    
    if (!Array.isArray(bandiereData)) {
      throw new Error('Formato file bandiere.json non valido! Deve essere un array.')
    }
    
    if (bandiereData.length === 0) {
      throw new Error('Nessuna bandiera trovata nel file!')
    }
    
    const bandiereValide = bandiereData.filter(b => {
      if (!b || typeof b !== 'object') return false
      if (!b.url || !b.nome) return false
      if (typeof b.url !== 'string' || typeof b.nome !== 'string') return false
      return true
    })
    
    if (bandiereValide.length === 0) {
      throw new Error('Nessuna bandiera valida trovata nel file!')
    }
    
    return bandiereValide
  } catch (error) {
    console.error('❌ Errore caricamento bandiere:', error)
    throw error
  }
}

function createExampleBandiereFile() {
  const exampleData = [
    { "url": "https://flagcdn.com/w320/it.png", "nome": "Italia" },
    { "url": "https://flagcdn.com/w320/fr.png", "nome": "Francia" },
    { "url": "https://flagcdn.com/w320/es.png", "nome": "Spagna" },
    { "url": "https://flagcdn.com/w320/de.png", "nome": "Germania" }
  ]
  
  try {
    fs.writeFileSync(BANDIERE_PATH, JSON.stringify(exampleData, null, 2))
    console.log('📁 Creato file bandiere.json di esempio')
    return exampleData
  } catch (error) {
    console.error('❌ Errore creazione file esempio:', error)
    return []
  }
}

const normalize = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()

async function handleStart(m, conn) {
  let countries
  try {
    countries = loadBandiere()
  } catch (error) {
    try {
      countries = createExampleBandiereFile()
      if (countries.length > 0) {
        return conn.sendMessage(m.chat, {
          text: `❌ File bandiere.json non valido. Ho creato un file esempio con 4 bandiere. Usa di nuovo .bandiera per giocare!`
        }, { quoted: m })
      }
    } catch (createError) {
      console.error('❌ Errore creazione file esempio:', createError)
    }
    
    return conn.sendMessage(m.chat, {
      text: `❌ Errore nel caricamento delle bandiere: ${error.message}\n\nAssicurati che il file bandiere.json contenga un array valido.`
    }, { quoted: m })
  }

  if (!global.bandieraGame) global.bandieraGame = {}

  if (global.bandieraGame[m.chat]) {
    if (m.text && m.text.toLowerCase() === '.bandiera') {
      const oldGame = global.bandieraGame[m.chat]
      if (oldGame.timeout) clearTimeout(oldGame.timeout)
      delete global.bandieraGame[m.chat]
    } else {
      return conn.sendMessage(m.chat, {
        text: '⚠️ Partita già in corso! Usa .skipbandiera per terminarla.'
      }, { quoted: m })
    }
  }

  if (!countries || countries.length === 0) {
    return conn.sendMessage(m.chat, {
      text: '❌ Nessuna bandiera disponibile per giocare!'
    }, { quoted: m })
  }

  const bandieraIndex = Math.floor(Math.random() * countries.length)
  const bandiera = countries[bandieraIndex]
  
  if (!bandiera || !bandiera.url || !bandiera.nome) {
    return conn.sendMessage(m.chat, {
      text: '❌ Errore: bandiera non valida nel database.'
    }, { quoted: m })
  }
  
  const game = {
    risposta: normalize(bandiera.nome),
    rispostaOriginale: bandiera.nome,
    startTime: Date.now(),
    bandieraUrl: bandiera.url,
    indiziUsati: 0
  }

  try {
    const buttons = [
      {
        buttonId: `${global.prefissoComandi}indizio`,
        buttonText: { displayText: '💡 Indizio' },
        type: 1
      },
      {
        buttonId: `${global.prefissoComandi}skipbandiera`,
        buttonText: { displayText: '⏹️ Skip' },
        type: 1
      }
    ]

    await conn.sendMessage(m.chat, {
      image: { url: game.bandieraUrl },
      caption: `🎌 *Indovina la nazione!*\nRispondi con il nome del paese\n🕐 Tempo: 60s\n💰 Premio: 20-40 soldi\n💡 Usa i bottoni per indizi o skip\n❌ Massimo 3 indizi`,
      footer: 'Scegli un\'opzione',
      buttons: buttons,
      headerType: 4
    }, { quoted: m })

    game.timeout = setTimeout(async () => {
      if (global.bandieraGame[m.chat] === game) {
        const buttons = [
          {
            buttonId: `${global.prefissoComandi}bandiera`,
            buttonText: { displayText: '🎮 Gioca Ancora' },
            type: 1
          },
          {
            buttonId: `${global.prefissoComandi}cbandiera`,
            buttonText: { displayText: '📊 Classifica' },
            type: 1
          }
        ]
        
        await conn.sendMessage(m.chat, {
          text: `⏰ Tempo scaduto!\nLa risposta era: *${game.rispostaOriginale}*`,
          footer: 'Scegli un\'opzione',
          buttons: buttons,
          headerType: 1
        })
        
        delete global.bandieraGame[m.chat]
      }
    }, 60000)

    global.bandieraGame[m.chat] = game
  } catch (error) {
    console.error('❌ Errore invio messaggio:', error)
    delete global.bandieraGame[m.chat]
    return conn.sendMessage(m.chat, {
      text: '❌ Errore nell\'avvio del gioco. Riprova.'
    }, { quoted: m })
  }
}

async function handleSkip(m, conn) {
  const game = global.bandieraGame?.[m.chat]
  if (!game) {
    return conn.sendMessage(m.chat, {
      text: '⚠️ Nessuna partita in corso.'
    }, { quoted: m })
  }
  
  if (game.timeout) clearTimeout(game.timeout)
  
  const buttons = [
    {
      buttonId: `${global.prefissoComandi}bandiera`,
      buttonText: { displayText: '🎮 Gioca Ancora' },
      type: 1
    },
    {
      buttonId: `${global.prefissoComandi}cbandiera`,
      buttonText: { displayText: '📊 Classifica' },
      type: 1
    }
  ]
  
  await conn.sendMessage(m.chat, {
    text: `⏹️ Partita terminata!\nLa risposta era: *${game.rispostaOriginale}*`,
    footer: 'Scegli un\'opzione',
    buttons: buttons,
    headerType: 1
  }, { quoted: m })
  
  delete global.bandieraGame[m.chat]
}

async function handleHint(m, conn) {
  const game = global.bandieraGame?.[m.chat]
  if (!game) {
    return conn.sendMessage(m.chat, {
      text: '⚠️ Nessuna partita in corso. Usa .bandiera per iniziarne una!'
    }, { quoted: m })
  }

  if (game.indiziUsati >= 3) {
    const buttons = [
      {
        buttonId: `${global.prefissoComandi}bandiera`,
        buttonText: { displayText: '🎮 Nuova Partita' },
        type: 1
      }
    ]
    
    return conn.sendMessage(m.chat, {
      text: `⚠️ Hai già usato tutti e 3 gli indizi disponibili!\nLa risposta era: *${game.rispostaOriginale}*`,
      footer: 'Inizia una nuova partita',
      buttons: buttons,
      headerType: 1
    }, { quoted: m })
  }

  game.indiziUsati = (game.indiziUsati || 0) + 1

  const rispostaOriginale = game.rispostaOriginale
  const primaLettera = rispostaOriginale[0].toUpperCase()
  const numeroLettere = rispostaOriginale.length
  
  let messaggioIndizio = ''
  let indiziRimanenti = 3 - game.indiziUsati
  
  if (game.indiziUsati === 1) {
    const parolaNascosta = primaLettera + ' ' + '_ '.repeat(numeroLettere - 1).trim()
    messaggioIndizio = `💡 *Primo indizio* (${indiziRimanenti} rimanenti)\nInizia con: *${primaLettera}*\nLunghezza: *${numeroLettere}* lettere\n\nParola: ${parolaNascosta}`
  } else if (game.indiziUsati === 2) {
    const ultimaLettera = rispostaOriginale[rispostaOriginale.length - 1].toUpperCase()
    const parolaConFine = primaLettera + ' ' + '_ '.repeat(numeroLettere - 2) + ultimaLettera
    messaggioIndizio = `💡 *Secondo indizio* (${indiziRimanenti} rimanenti)\nInizia con: *${primaLettera}*\nFinisce con: *${ultimaLettera}*\nLunghezza: *${numeroLettere}* lettere\n\nParola: ${parolaConFine}`
  } else {
    const vocali = ['a', 'e', 'i', 'o', 'u']
    const vocaliPresenti = vocali.filter(v => rispostaOriginale.toLowerCase().includes(v))
    
    let suggerimento = ''
    if (vocaliPresenti.length > 0) {
      suggerimento = `Contiene le vocali: ${vocaliPresenti.join(', ')}`
    } else {
      suggerimento = `Non contiene vocali!`
    }
    
    messaggioIndizio = `💡 *Terzo indizio* (Ultimo indizio!)\n${suggerimento}\nLunghezza: *${numeroLettere}* lettere`
  }

  const buttons = [
    {
      buttonId: `${global.prefissoComandi}indizio`,
      buttonText: { displayText: `💡 Indizio (${indiziRimanenti})` },
      type: 1
    },
    {
      buttonId: `${global.prefissoComandi}skipbandiera`,
      buttonText: { displayText: '⏹️ Skip' },
      type: 1
    }
  ]

  if (game.indiziUsati >= 3) {
    buttons.pop()
  }

  await conn.sendMessage(m.chat, {
    text: messaggioIndizio,
    footer: 'Usa i bottoni per continuare',
    buttons: buttons,
    headerType: 1
  }, { quoted: m })
}

async function handleClassifica(m, conn) {
  try {
    const classifica = loadClassifica()
    const entries = Object.entries(classifica)
    
    if (entries.length === 0) {
      return conn.sendMessage(m.chat, {
        text: '📊 *Classifica Bandiera*\n\nNessun punteggio ancora registrato!'
      }, { quoted: m })
    }
    
    const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 10)
    
    let classificaText = '📊 *CLASSIFICA BANDIERA*\n\n'
    const mentions = []
    
    for (let i = 0; i < sorted.length; i++) {
      const [userId, points] = sorted[i]
      mentions.push(userId)
      
      let name = ''
      try {
        const user = getUser(userId)
        if (user && user.name) {
          name = user.name
        } else {
          name = userId.split('@')[0]
        }
      } catch (e) {
        name = userId.split('@')[0]
      }
      
      classificaText += `${i + 1}. @${userId.split('@')[0]} - ${points} vittorie\n`
    }
    
    await conn.sendMessage(m.chat, {
      text: classificaText,
      mentions: mentions
    }, { quoted: m })
    
  } catch (error) {
    console.error('❌ Errore classifica:', error)
    return conn.sendMessage(m.chat, {
      text: '❌ Errore nel caricamento della classifica.'
    }, { quoted: m })
  }
}

export default {
  command: ['bandiera', 'skipbandiera', 'indizio', 'cbandiera'],
  
  async execute(m, { conn, command }) {
    if (!m.isGroup) {
      return conn.sendMessage(m.chat, { 
        text: '❌ Questo gioco può essere giocato solo nei gruppi.' 
      }, { quoted: m })
    }
    
    if (command === 'cbandiera') {
      return await handleClassifica(m, conn)
    }
    
    if (command === 'skipbandiera') {
      return await handleSkip(m, conn)
    }
    
    if (command === 'indizio') {
      return await handleHint(m, conn)
    }
    
    if (command === 'bandiera') {
      return await handleStart(m, conn)
    }
  },
  
  async before(m, { conn }) {
    if (!m.isGroup) return false
    if (m.fromMe) return false
    
    const game = global.bandieraGame?.[m.chat]
    if (!game) return false
    
    if (!m.text) return false
    
    const text = normalize(m.text)
    const sender = m.sender
    
    if (text === game.risposta) {
      if (game.timeout) clearTimeout(game.timeout)
      
      const seconds = Math.floor((Date.now() - game.startTime) / 1000)
      const reward = 20 + Math.floor(Math.random() * 21)
      
      const user = getUser(sender, true)
      user.money = (parseInt(user.money) || 0) + reward
      forceSave()
      
      const buttons = [
        {
          buttonId: `${global.prefissoComandi}bandiera`,
          buttonText: { displayText: '🎮 Gioca Ancora' },
          type: 1
        },
        {
          buttonId: `${global.prefissoComandi}cbandiera`,
          buttonText: { displayText: '📊 Classifica' },
          type: 1
        }
      ]

      const message = `🎉 *CORRETTO!*\n🌍 Era: *${game.rispostaOriginale}*\n⏱ Tempo: ${seconds}s\n💰 +${reward} soldi`

      try {
        const classifica = loadClassifica()
        classifica[sender] = (classifica[sender] || 0) + 1
        saveClassifica(classifica)
      } catch (error) {
        console.error('❌ Errore salvataggio classifica:', error)
      }

      delete global.bandieraGame[m.chat]
      
      await conn.sendMessage(m.chat, {
        text: message,
        footer: 'Scegli un\'opzione',
        buttons: buttons,
        headerType: 1
      }, { quoted: m })
      
      return true
    }
  }
}