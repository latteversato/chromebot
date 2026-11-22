const sleep = ms => new Promise(r => setTimeout(r, ms))

const B = s => [...String(s)].map(c => {
  const k = c.codePointAt(0)
  if (k >= 65 && k <= 90) return String.fromCodePoint(0x1D400 + k - 65)
  if (k >= 97 && k <= 122) return String.fromCodePoint(0x1D41A + k - 97)
  if (k >= 48 && k <= 57) return String.fromCodePoint(0x1D7CE + k - 48)
  return c
}).join('')

function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const tree = arr => arr.map((x, i) => `${i === arr.length - 1 ? '└' : '├'} ${x}`).join('\n')
const formatNumber = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function codiceFiscale(first, last, date, female, rnd) {
  const cons = s => norm(s).toUpperCase().replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, '')
  const vow = s => norm(s).toUpperCase().replace(/[^AEIOU]/g, '')
  const sur = (cons(last) + vow(last) + 'XXX').slice(0, 3)
  const fc = cons(first)
  const nm = fc.length >= 4 ? fc[0] + fc[2] + fc[3] : (fc + vow(first) + 'XXX').slice(0, 3)
  const months = 'ABCDEHLMPRST'
  const day = date.getDate() + (female ? 40 : 0)
  const comune = 'ABCDEFGHILMNPRSTUZ'[Math.floor(rnd() * 18)] + String(Math.floor(rnd() * 1000)).padStart(3, '0')
  const check = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(rnd() * 26)]
  return `${sur}${nm}${String(date.getFullYear()).slice(2)}${months[date.getMonth()]}${String(day).padStart(2, '0')}${comune}${check}`
}

function getTarget(m, text) {
  const ctx = m.message?.extendedTextMessage?.contextInfo ||
              m.message?.imageMessage?.contextInfo ||
              m.message?.videoMessage?.contextInfo
  const raw = ctx?.mentionedJid?.[0] || ctx?.participant || m.quoted?.sender || m.mentionedJid?.[0] || null
  if (raw) return raw
  const num = (text || '').replace(/\D/g, '')
  return num.length >= 7 ? `${num}@s.whatsapp.net` : null
}

const NOMI_M = ['Marco', 'Luca', 'Alessandro', 'Matteo', 'Andrea', 'Francesco', 'Davide', 'Simone', 'Giuseppe', 'Lorenzo', 'Federico', 'Riccardo', 'Gabriele', 'Stefano', 'Antonio', 'Mattia', 'Nicola', 'Daniele', 'Emanuele', 'Filippo', 'Tommaso', 'Edoardo', 'Vincenzo', 'Giacomo']
const NOMI_F = ['Giulia', 'Sara', 'Chiara', 'Francesca', 'Martina', 'Alessia', 'Elisa', 'Valentina', 'Federica', 'Silvia', 'Laura', 'Elena', 'Giorgia', 'Arianna', 'Beatrice', 'Sofia', 'Ilaria', 'Camilla', 'Anna', 'Marta', 'Noemi', 'Claudia', 'Roberta', 'Paola']
const COGNOMI = ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone', 'Longo', 'Gentile', 'Vitale', 'Serra', 'Coppola', 'De Santis', "D'Angelo", 'Marchetti', 'Parisi', 'Villa', 'Fabbri', 'Marini', 'Grasso', 'Valentini', 'Messina', 'Sala', 'Gatti', 'Pellegrini', 'Palumbo', 'Sanna', 'Farina', 'Monti', 'Cattaneo', 'Morelli', 'Amato', 'Silvestri', 'Testa', 'Carbone', 'Benedetti', 'Caputo', 'Guerra', 'Bernardi', 'Fiore', 'Basile', 'Riva']

const CITTA = [
  { c: 'Roma', p: 'RM', r: 'Lazio', cap: [100, 199], lat: 41.9028, lon: 12.4964, q: ['Prati', 'Trastevere', 'San Giovanni', 'Garbatella', 'Tuscolano', 'Monteverde'] },
  { c: 'Milano', p: 'MI', r: 'Lombardia', cap: [20121, 20162], lat: 45.4642, lon: 9.19, q: ['Navigli', 'Lambrate', 'Isola', 'Porta Romana', 'Città Studi', 'Bicocca'] },
  { c: 'Napoli', p: 'NA', r: 'Campania', cap: [80121, 80147], lat: 40.8518, lon: 14.2681, q: ['Vomero', 'Fuorigrotta', 'Chiaia', 'Posillipo', 'Secondigliano'] },
  { c: 'Torino', p: 'TO', r: 'Piemonte', cap: [10121, 10156], lat: 45.0703, lon: 7.6869, q: ['San Salvario', 'Crocetta', 'Vanchiglia', 'Lingotto', 'Mirafiori'] },
  { c: 'Palermo', p: 'PA', r: 'Sicilia', cap: [90121, 90151], lat: 38.1157, lon: 13.3615, q: ['Libertà', 'Mondello', 'Zisa', 'Borgo Vecchio'] },
  { c: 'Genova', p: 'GE', r: 'Liguria', cap: [16121, 16167], lat: 44.4056, lon: 8.9463, q: ['Albaro', 'Nervi', 'Sampierdarena', 'Foce'] },
  { c: 'Bologna', p: 'BO', r: 'Emilia-Romagna', cap: [40121, 40141], lat: 44.4949, lon: 11.3426, q: ['Santo Stefano', 'Bolognina', 'San Donato', 'Saragozza'] },
  { c: 'Firenze', p: 'FI', r: 'Toscana', cap: [50121, 50145], lat: 43.7696, lon: 11.2558, q: ['Rifredi', 'Campo di Marte', 'Oltrarno', 'Novoli'] },
  { c: 'Bari', p: 'BA', r: 'Puglia', cap: [70121, 70132], lat: 41.1171, lon: 16.8719, q: ['Poggiofranco', 'Carrassi', 'Japigia', 'Murat'] },
  { c: 'Catania', p: 'CT', r: 'Sicilia', cap: [95121, 95131], lat: 37.5079, lon: 15.083, q: ['Ognina', 'Borgo', 'Librino', 'San Berillo'] },
  { c: 'Venezia', p: 'VE', r: 'Veneto', cap: [30121, 30175], lat: 45.4408, lon: 12.3155, q: ['Mestre', 'Cannaregio', 'Lido', 'Marghera'] },
  { c: 'Verona', p: 'VR', r: 'Veneto', cap: [37121, 37142], lat: 45.4384, lon: 10.9916, q: ['Borgo Trento', 'Veronetta', 'San Zeno', 'Borgo Roma'] },
  { c: 'Padova', p: 'PD', r: 'Veneto', cap: [35121, 35143], lat: 45.4064, lon: 11.8768, q: ['Arcella', 'Portello', 'Prato della Valle'] },
  { c: 'Brescia', p: 'BS', r: 'Lombardia', cap: [25121, 25136], lat: 45.5416, lon: 10.2118, q: ['Carmine', 'Mompiano', 'Chiesanuova'] },
  { c: 'Cagliari', p: 'CA', r: 'Sardegna', cap: [9121, 9134], lat: 39.2238, lon: 9.1217, q: ['Castello', 'Is Mirrionis', 'Poetto', 'Marina'] },
  { c: 'Trieste', p: 'TS', r: 'Friuli-Venezia Giulia', cap: [34121, 34151], lat: 45.6495, lon: 13.7768, q: ['San Giacomo', 'Barcola', 'Borgo Teresiano'] }
]

const VIE = ['Via Roma', 'Via Garibaldi', 'Corso Italia', 'Via Dante Alighieri', 'Via Giuseppe Mazzini', 'Viale Regina Margherita', 'Via Vittorio Veneto', 'Via XX Settembre', 'Via Cavour', 'Via Marconi', 'Corso Vittorio Emanuele II', 'Via Verdi', 'Via della Libertà', 'Via Gramsci', 'Via Matteotti', 'Via Manzoni', 'Via Leopardi', 'Viale Europa', 'Via San Francesco', 'Via Kennedy']

const LAVORI = [
  ['Studente universitario', 'studente'], ['Impiegato amministrativo', 'dip'], ['Cameriere', 'dip'], ['Sviluppatore web', 'dip'],
  ['Commesso', 'dip'], ['Grafico freelance', 'piva'], ['Magazziniere', 'dip'], ['Barista', 'dip'], ['Infermiere', 'dip'],
  ['Elettricista', 'piva'], ['Addetto call center', 'dip'], ['Rider', 'piva'], ['Social media manager', 'piva'],
  ['Geometra', 'piva'], ['Cassiere', 'dip'], ['Barbiere', 'piva'], ['Operaio metalmeccanico', 'dip'], ['Tirocinante', 'stage']
]
const STUDI = ['Licenza media', 'Diploma liceo scientifico', 'Diploma ITIS', 'Diploma alberghiero', 'Laurea triennale', 'Laurea magistrale', 'Diploma liceo linguistico']

const BANCHE = ['Intesa Sanpaolo', 'UniCredit', 'BancoPosta', 'Banco BPM', 'BPER', 'Fineco', 'N26', 'Revolut', 'Hype']
const SALDI = ['(a fine mese fa male)', '(il 27 del mese)', '(dopo la tredicesima)', '(non toccare)', '(ma ha un abbonamento che non usa)']
const OPERATORI = [['320', 'WindTre'], ['327', 'WindTre'], ['329', 'WindTre'], ['333', 'TIM'], ['338', 'TIM'], ['339', 'TIM'], ['347', 'Vodafone'], ['348', 'Vodafone'], ['349', 'Vodafone'], ['351', 'Iliad'], ['366', 'TIM'], ['371', 'WindTre']]

const PHONES = ['iPhone 13', 'iPhone 14', 'iPhone 15 Pro', 'Samsung Galaxy S23', 'Samsung Galaxy A54', 'Xiaomi Redmi Note 12', 'Google Pixel 7', 'Motorola Moto G84']
const PCS = ['MacBook Air M1', 'Lenovo ThinkPad E14', 'HP Pavilion 15', 'ASUS VivoBook', 'PC fisso assemblato (RGB acceso)', 'Dell Inspiron 15']
const ROUTER = ['FRITZ!Box 7530', 'TIM Hub+', 'Vodafone Station', 'TP-Link Archer C6', 'Fastweb NeXXt']

const ARTISTI = ['Sfera Ebbasta', 'Lazza', 'Annalisa', 'Måneskin', 'Tedua', 'Geolier', 'Fabri Fibra', 'Ultimo', 'Mahmood', 'Blanco', 'Salmo', 'Marracash', 'Articolo 31', '883', 'Vasco Rossi', 'Nitro', 'Coez']
const PLAYLIST = ['sad hours 🌧️', 'gym 💪 (mai usata)', 'macchina 🚗', 'studio 📚 lofi', 'estate 2019', 'anni 2000 ❤️', 'rabbia 😤']
const FILM = ['Inception', 'Interstellar', 'Il Padrino', 'Fight Club', 'La vita è bella', 'Shutter Island', 'Il Gladiatore', 'Il Signore degli Anelli', 'Pulp Fiction', 'Quasi amici']
const SERIE = ['Breaking Bad', 'Stranger Things', 'The Office', 'Peaky Blinders', 'Friends', 'Dark', 'Black Mirror', 'La Casa di Carta', 'Squid Game', 'Gomorra']
const GIOCHI = ['Fortnite', 'Valorant', 'Minecraft', 'FIFA / EA FC', 'Call of Duty', 'League of Legends', 'Clash Royale', 'GTA V']

const RICERCHE = [
  'come capire se le piaccio', 'ricetta carbonara senza panna (si può?)', 'offerte Amazon', 'meteo weekend',
  'come si scrive qual è', 'film da vedere stasera', 'quanto costa un volo low cost', 'migliori VPN gratis',
  'come guadagnare online senza fare niente', 'il mio cane mi ignora perché', 'offerte lavoro remoto',
  'tutorial fare le uova strapazzate', 'cosa regalare a un amico che ha tutto', 'quanti passi al giorno servono',
  'perché ho sempre sonno', 'come uscire da un gruppo WhatsApp senza farsi notare', 'prezzo iPhone usato',
  'come rispondere a ci vediamo', 'oroscopo di oggi', 'palestra vicino a me prezzi'
]
const POSTI = ['Esselunga', "McDonald's", 'Palestra (iscritto, ci va a gennaio)', 'Stazione', 'Bar sotto casa', 'Università', 'Decathlon', 'Farmacia', 'Centro commerciale', 'Pizzeria da asporto', 'Parco', 'Ufficio postale (in fila)']
const PROFILO = [
  'Risponde "ok" e pensa di aver chiuso la conversazione',
  'Dice "arrivo" ed è ancora in doccia',
  'Ha 47 chat non lette e le chiama "archivio"',
  'Manda vocali da 4 minuti che iniziano con "allora, praticamente"',
  'Ha ancora la prova gratuita di Netflix del 2019',
  'Mette la sveglia e la ignora 4 volte',
  'Ha 2.300 screenshot in galleria e non ne ha mai riaperto uno',
  'Legge i messaggi, non risponde, poi si dimentica',
  'Salva i reel "per dopo" e non li guarda mai',
  'Dice "è l\'ultima puntata" alle 2 di notte',
  'Ha la batteria al 4% e il caricatore a casa',
  'Entra in un gruppo, silenzia subito, non lo riapre più',
  'Scrive "tra 5 minuti" e intende 40',
  'Controlla il telefono appena lo posa'
]
const SCUSE = ['Ho il telefono scarico', 'Non avevo campo', 'Stavo per rispondere!', 'Ero in riunione', "Pensavo l'avessi letto tu"]

export default {
  command: ['dox', 'doxx', 'doxxing', 'dossier'],
  group: true,

  async execute(m, { conn, text }) {
    const raw = getTarget(m, text)

    if (!raw) {
      return conn.sendMessage(m.chat, {
        text: `⚠️ *${B('Errore')}*\nDevi taggare, rispondere a un utente o scrivere un numero.\n\n📌 *${B('Esempio')}:* .dox @utente`
      }, { quoted: m })
    }

    try {
      const rawUser = String(raw).split('@')[0].split(':')[0]
      const normalized = global.normalizeJid ? global.normalizeJid(raw) : raw
      const seedKey = String(normalized || raw).split('@')[0].split(':')[0].replace(/\D/g, '') || rawUser

      const R = mulberry32(hashStr('dox-v3-' + seedKey))
      const rand = (a, b) => Math.floor(R() * (b - a + 1)) + a
      const pick = arr => arr[Math.floor(R() * arr.length)]
      const pickN = (arr, n) => {
        const a = [...arr]
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
        return a.slice(0, n)
      }

      let alias = null
      try {
        const n = await conn.getName?.(raw)
        if (n && !/^\+?[\d\s-]{6,}$/.test(String(n))) alias = String(n)
      } catch {}

      const mentions = [raw]
      const sent = await conn.sendMessage(m.chat, { text: `🔎 Avvio ricerca su @${rawUser}...`, mentions }, { quoted: m })
      const edit = async t => {
        if (!sent?.key) return
        try { await conn.sendMessage(m.chat, { text: t, edit: sent.key, mentions }) } catch {}
      }
      await sleep(1100); await edit(`📡 Accesso ai database... ▰▰▱▱▱ 40%`)
      await sleep(1100); await edit(`🗂️ Incrocio i dati di @${rawUser}... ▰▰▰▰▱ 80%`)
      await sleep(1000); await edit(`✅ Dossier pronto ▰▰▰▰▰ 100%`)

      const female = R() < 0.5
      const first = pick(female ? NOMI_F : NOMI_M)
      const last = pick(COGNOMI)
      const age = rand(18, 44)
      const now = new Date()
      const birth = new Date(now.getFullYear() - age, rand(0, 11), rand(1, 28))
      const citta = pick(CITTA)
      const nascita = pick(CITTA)
      const quartiere = pick(citta.q)
      const via = pick(VIE)
      const civico = rand(1, 120)
      const cap = String(rand(citta.cap[0], citta.cap[1])).padStart(5, '0')
      const lat = (citta.lat + (R() - 0.5) * 0.05).toFixed(5)
      const lon = (citta.lon + (R() - 0.5) * 0.05).toFixed(5)
      const [lavoro, contratto] = pick(LAVORI)
      const studio = lavoro === 'Studente universitario' ? 'Iscritto all\'università' : pick(STUDI)
      const cf = codiceFiscale(first, last, birth, female, R)
      const doc = `CA${rand(10000, 99999)}${pick(['AA', 'AB', 'AC', 'AD', 'AE', 'BA', 'BB'])}`
      const scadenza = `${String(rand(1, 12)).padStart(2, '0')}/${now.getFullYear() + rand(1, 9)}`
      const stato = age < 24 ? 'Single' : pick(['Single', 'Single', 'Fidanzato/a', 'Fidanzato/a', 'Convivente', 'Sposato/a'])

      const madre = `${pick(NOMI_F)} ${last}`
      const padre = `${pick(NOMI_M)} ${last}`
      const fratelli = rand(0, 2)
      const animale = pick(['Gatto "Micio"', 'Gatto "Fuffy"', 'Cane "Rocky"', 'Cane "Luna"', 'Cane "Bobby"', 'Nessuno (lo vorrebbe)'])

      const [pre, operatore] = pick(OPERATORI)
      const telefono = `+39 ${pre} ••• ••${rand(10, 99)}`
      const handle = norm(`${first}.${last}`).toLowerCase().replace(/[^a-z.]/g, '')
      const username = `${handle.replace('.', '_')}${rand(1, 99)}`
      const mail = (l => l.replace(/[a-z]{2,}/g, w => w[0] + '*'.repeat(Math.min(w.length - 1, 4))))(`${handle}${String(birth.getFullYear()).slice(2)}`)
      const dominio = pick(['gmail.com', 'gmail.com', 'hotmail.it', 'libero.it', 'outlook.it', 'icloud.com'])
      const ip = `${rand(79, 95)}.${rand(0, 255)}.${rand(0, 255)}.••`
      const wifiSSID = `${pick(['TIM', 'Vodafone', 'FASTWEB', 'WINDTRE'])}-${rand(10000000, 99999999).toString(16).toUpperCase()}`

      const banca = pick(BANCHE)
      const iban = `IT${rand(10, 99)} ${pick('ABCDEFGHKLMNPQRSTUVWXYZ'.split(''))}${String(rand(0, 99999)).padStart(5, '0')} ${String(rand(0, 99999)).padStart(5, '0')} •••• •••• ${String(rand(0, 9999)).padStart(4, '0')}`
      const carta = `${pick(['Visa', 'Mastercard', 'PostePay Evolution'])} •••• ${String(rand(0, 9999)).padStart(4, '0')} (scad. ${String(rand(1, 12)).padStart(2, '0')}/${String(now.getFullYear() + rand(1, 4)).slice(2)})`
      const saldo = `€${rand(40, 6800).toLocaleString('it-IT')},${String(rand(0, 99)).padStart(2, '0')}`
      const reddito = contratto === 'studente' ? 'Paghetta dai genitori' :
        contratto === 'stage' ? `Rimborso stage ~€${rand(4, 8) * 100}/mese` :
        contratto === 'piva' ? `Partita IVA, fatturato ~€${rand(12, 38)}k/anno` :
        `${pick(['Tempo indeterminato', 'Tempo determinato'])}, RAL ~€${rand(15, 32)}k`

      const social = [
        ['Instagram', `@${username}`, `${formatNumber(rand(180, 4800))} follower · ${rand(20, 340)} post · ultima storia ${rand(1, 18)}h fa`],
        ['TikTok', `@${username}`, `${formatNumber(rand(60, 9000))} follower · guarda ~${rand(1, 6)}h al giorno`],
        ['Telegram', `@${username.slice(0, 12)}`, `${rand(6, 60)} gruppi · ${rand(2, 14)} silenziati e mai letti`],
        ['Discord', `${username}`, `${rand(3, 28)} server · online ${rand(2, 7)}h al giorno`],
        ['Steam', username, `${rand(15, 380)} giochi · ${pick(GIOCHI)} è il più giocato (${rand(80, 2400)}h)`]
      ]
      const artista = pick(ARTISTI)

      const ricerche = pickN(RICERCHE, 6).map(s => `"${s}" · ${rand(2, 55)} min fa`)
      const posti = pickN(POSTI, 4).map(p => `${p} · ${rand(1, 5)}g fa`)
      const profilo = pickN(PROFILO, 4)
      const msgGiorno = rand(40, 380)
      const nonLetti = rand(8, 190)
      const risposta = rand(4, 380)

      const telefonoModello = pick(PHONES)
      const batteria = rand(3, 94)
      const schermo = `${rand(3, 9)}h ${String(rand(0, 59)).padStart(2, '0')}m`
      const pc = pick(PCS)
      const router = pick(ROUTER)

      const rischioN = rand(1, 10)
      const barra = '▰'.repeat(rischioN) + '▱'.repeat(10 - rischioN)
      const rischioTxt = rischioN <= 3 ? 'basso — si arrabbia solo col traffico' :
        rischioN <= 6 ? 'medio — risponde ai messaggi dopo 3 giorni' :
        'alto — ha mandato un vocale di 9 minuti senza preavviso'

      const caso = `${now.getFullYear()}/${rand(1000, 9999)}`

      const msg = `
🔐 *${B('DOSSIER RISERVATO')}* 🔐
📂 ${B('Pratica')} n. ${caso}
🎯 ${B('Soggetto')}: @${rawUser}${alias ? ` (${alias})` : ''}
🕒 ${B('Generato')}: ${now.toLocaleString('it-IT')}
━━━━━━━━━━━━━━━━━━━━

🪪 *${B('ANAGRAFICA')}*
├ ${B('Nome')}: ${first} ${last}
├ ${B('Nato/a')}: ${birth.toLocaleDateString('it-IT')} a ${nascita.c} (${nascita.p}) · ${age} anni
├ ${B('Residenza')}: ${via} ${civico}, ${cap} ${citta.c} (${citta.p}) — ${quartiere}
├ ${B('Cod. Fiscale')}: ${cf}
├ ${B('Documento')}: CIE n. ${doc} · scade ${scadenza}
├ ${B('Stato civile')}: ${stato}
├ ${B('Studi')}: ${studio}
├ ${B('Lavoro')}: ${lavoro}
└ ${B('Reddito')}: ${reddito}

👨‍👩‍👧 *${B('FAMIGLIA')}*
├ ${B('Madre')}: ${madre}
├ ${B('Padre')}: ${padre}
├ ${B('Fratelli/sorelle')}: ${fratelli === 0 ? 'figlio/a unico/a (si vede)' : fratelli}
└ ${B('Animale')}: ${animale}

📞 *${B('CONTATTI')}*
├ ${B('Cellulare')}: ${telefono} (${operatore})
├ ${B('Email')}: ${mail}@${dominio}
├ ${B('Posizione')}: ${lat}, ${lon}
├ ${B('IP')}: ${ip}
└ ${B('Wi-Fi')}: ${wifiSSID} · ${router}

💳 *${B('FINANZE')}*
├ ${B('Banca')}: ${banca}
├ ${B('IBAN')}: ${iban}
├ ${B('Carta')}: ${carta}
└ ${B('Saldo')}: ${saldo} ${pick(SALDI)}

📱 *${B('SOCIAL')}*
${social.map(([p, h, d]) => `├ ${B(p)}: ${h} —${d}`).join('\n')}
└ ${B('Spotify')}: ascolta soprattutto ${artista} · playlist "${pick(PLAYLIST)}"

🔍 *${B('CRONOLOGIA RECENTE')}*
${tree(ricerche.map((s, i) => `${i + 1}.${s}`))}

📍 *${B('ULTIMI SPOSTAMENTI')}*
${tree(posti)}

📲 *${B('DISPOSITIVI')}*
├ ${B('Telefono')}: ${telefonoModello} · batteria ${batteria}% · schermo ${schermo}/giorno
├ ${B('Computer')}: ${pc}
└ ${B('WhatsApp')}: ~${msgGiorno} messaggi/giorno · ${nonLetti} chat non lette · risponde in media dopo ${risposta} min

🎬 *${B('GUSTI')}*
├ ${B('Film')}: ${pick(FILM)}
├ ${B('Serie')}: ${pick(SERIE)}
└ ${B('Scusa preferita')}: "${pick(SCUSE)}"

🧠 *${B('PROFILO')}*
${profilo.map(p => `├ ${p}`).join('\n')}
└ ${B('Livello di rischio')}: ${barra} ${rischioN}/10 — ${rischioTxt}

━━━━━━━━━━━━━━━━━━━━
`.trim()

      await conn.sendMessage(m.chat, { text: msg, mentions }, { quoted: m })

      setTimeout(async () => {
        try {
          const img = `https://randomuser.me/api/portraits/${female ? 'women' : 'men'}/${rand(0, 99)}.jpg`
          await conn.sendMessage(m.chat, {
            image: { url: img },
            caption: `🖼️ *${B('Foto associata al profilo')}*\n📸 Scattata ${rand(1, 12)} mesi fa · ${citta.c}, ${citta.r}`
          }, { quoted: m })
        } catch {}
      }, 1500)
    } catch (e) {
      await conn.sendMessage(m.chat, { text: `❌ *${B('Errore')}*: ${e.message || e}` }, { quoted: m })
    }
  }
}