import databaseManager, { getUser, addMoney, addExp, forceSave } from '../database.js'

const FOOTER = '─── ⛏️ 𝐌𝐈𝐍𝐈𝐄𝐑𝐀 𝐂𝐇𝐑𝐎𝐌𝐄 ⛏️ ───'

// peso = probabilità in % di trovare quella rarità a ogni scavo (somma = 100)
const RARITA = {
  comune:      { nome: 'Comune',      emoji: '⚪', peso: 50.0, ordine: 1 },
  raro:        { nome: 'Raro',        emoji: '🔵', peso: 28.0, ordine: 2 },
  superraro:   { nome: 'Super Raro',  emoji: '🟢', peso: 13.0, ordine: 3 },
  epico:       { nome: 'Epico',       emoji: '🟣', peso: 6.0,  ordine: 4 },
  mitico:      { nome: 'Mitico',      emoji: '🔴', peso: 2.2,  ordine: 5 },
  leggendario: { nome: 'Leggendario', emoji: '🟡', peso: 0.7,  ordine: 6 },
  platino:     { nome: 'Platino',     emoji: '💠', peso: 0.1,  ordine: 7 }
}

const M = (id, nome, emoji, rarita, valore, xp, desc) => ({ id, nome, emoji, rarita, valore, xp, desc })

const MINERALI = [
  // ⚪ COMUNE
  M('carbone', 'Carbone', '⚫', 'comune', 8, 5, 'Combustibile nero, il pane dei minatori.'),
  M('calcare', 'Calcare', '🪨', 'comune', 6, 5, 'Roccia fragile ma onesta.'),
  M('salgemma', 'Sale di Roccia', '🧂', 'comune', 10, 6, 'Cristalli bianchi che brillano alla luce della torcia.'),
  M('stagno', 'Stagno', '🥫', 'comune', 12, 6, 'Metallo morbido, ottimo per le leghe.'),
  M('piombo', 'Piombo', '⚙️', 'comune', 14, 7, 'Pesante e grigio, si trova ovunque.'),
  M('rame', 'Rame', '🟤', 'comune', 15, 8, 'Metallo rossastro molto usato.'),
  M('zinco', 'Zinco', '🔘', 'comune', 18, 8, 'Metallo azzurrognolo, resistente alla ruggine.'),
  M('ferro', 'Ferro', '🔩', 'comune', 20, 9, 'Il metallo che ha costruito imperi.'),
  M('quarzo', 'Quarzo', '🤍', 'comune', 25, 10, 'Cristallo trasparente e brillante.'),
  M('zolfo', 'Zolfo', '🟨', 'comune', 30, 12, 'Giallo acceso, dall\'odore pungente.'),

  // 🔵 RARO
  M('malachite', 'Malachite', '💚', 'raro', 100, 20, 'Pietra verde a bande concentriche.'),
  M('argento', 'Argento', '🥈', 'raro', 120, 22, 'Metallo prezioso dal riflesso lunare.'),
  M('turchese', 'Turchese', '🩵', 'raro', 130, 24, 'Pietra azzurra amata dai nomadi.'),
  M('granato', 'Granato', '🍷', 'raro', 140, 25, 'Rosso scuro come il vino invecchiato.'),
  M('ametista', 'Ametista', '🟪', 'raro', 150, 26, 'Quarzo viola dai poteri calmanti.'),
  M('topazio', 'Topazio', '🟧', 'raro', 160, 27, 'Gemma color miele e sole.'),
  M('giada', 'Giada', '🟩', 'raro', 170, 28, 'Pietra verde simbolo di fortuna.'),
  M('opale', 'Opale', '🌈', 'raro', 190, 30, 'Riflessi arcobaleno nascosti nella roccia.'),
  M('tormalina', 'Tormalina', '🎀', 'raro', 200, 30, 'Cristallo rosa e verde, caldo al tatto.'),

  // 🟢 SUPER RARO
  M('peridoto', 'Peridoto', '🥝', 'superraro', 300, 45, 'Gemma verde oliva nata nel mantello terrestre.'),
  M('cobalto', 'Cobalto', '🧿', 'superraro', 350, 55, 'Blu intenso, protegge dal malocchio.'),
  M('lapislazzuli', 'Lapislazzuli', '🔷', 'superraro', 380, 70, 'Pietra blu profondo usata negli incantesimi.'),
  M('acquamarina', 'Acquamarina', '🌊', 'superraro', 420, 60, 'Il colore del mare in una pietra.'),
  M('titanio', 'Titanio', '🛡️', 'superraro', 450, 60, 'Leggero e quasi indistruttibile.'),
  M('tanzanite', 'Tanzanite', '🔮', 'superraro', 520, 65, 'Viola-blu, esiste solo in un angolo del mondo.'),
  M('smeraldo', 'Smeraldo', '🍀', 'superraro', 550, 70, 'Verde puro, desiderio dei re.'),
  M('zaffiro', 'Zaffiro', '💙', 'superraro', 580, 75, 'Blu reale, duro quasi come il diamante.'),
  M('oro', 'Oro', '🥇', 'superraro', 600, 80, 'Il metallo che fa impazzire gli uomini.'),

  // 🟣 EPICO
  M('ossidiana', 'Ossidiana Vulcanica', '🌋', 'epico', 800, 90, 'Vetro nero nato dalla lava.'),
  M('spinello', 'Spinello Imperiale', '🔺', 'epico', 900, 100, 'Confuso per secoli con il rubino.'),
  M('morganite', 'Morganite', '🍑', 'epico', 950, 105, 'Rosa pesca, rara e delicata.'),
  M('kunzite', 'Kunzite', '🌸', 'epico', 1000, 110, 'Lilla luminoso che sbiadisce alla luce.'),
  M('alessandrite', 'Alessandrite', '🌗', 'epico', 1100, 120, 'Cambia colore tra giorno e notte.'),
  M('opalefuoco', 'Opale di Fuoco', '🔥', 'epico', 1300, 130, 'Brace arancione intrappolata nel cristallo.'),
  M('rubino', 'Rubino', '❤️', 'epico', 1500, 140, 'Rosso sangue di piccione, vale una fortuna.'),
  M('diamanteg', 'Diamante Grezzo', '💎', 'epico', 1800, 150, 'Non ancora tagliato, ma già splendido.'),

  // 🔴 MITICO
  M('tigre', 'Occhio di Tigre Dorato', '🐯', 'mitico', 2800, 180, 'Ti osserva mentre lo tieni in mano.'),
  M('eliodoro', 'Eliodoro', '☀️', 'mitico', 3000, 190, 'Gemma dorata che sembra contenere il sole.'),
  M('lunare', 'Pietra Lunare', '🌙', 'mitico', 3500, 210, 'Brilla solo di notte, con luce azzurra.'),
  M('giadeite', 'Giadeite Imperiale', '🐉', 'mitico', 4200, 240, "Appartenuta a un'antica dinastia di imperatori."),
  M('tempo', 'Cristallo del Tempo', '⏳', 'mitico', 4800, 260, 'Al suo interno il tempo scorre più lento.'),
  M('stella', 'Meteorite Cadente', '☄️', 'mitico', 5000, 270, 'Caduta dal cielo milioni di anni fa.'),
  M('diamanter', 'Diamante Rosa', '🌺', 'mitico', 5500, 290, 'Rarissimo, ne esistono pochissimi al mondo.'),
  M('drago', 'Sangue di Drago', '🩸', 'mitico', 6000, 300, 'Resina cristallizzata, ancora calda.'),

  // 🟡 LEGGENDARIO
  M('alchemico', 'Oro Alchemico', '⚗️', 'leggendario', 10000, 400, 'Forgiato da un alchimista che non ce l\'ha mai fatta.'),
  M('leviatano', 'Scaglia di Leviatano', '🐋', 'leggendario', 12000, 450, 'Staccata da una creatura degli abissi.'),
  M('sirena', 'Lacrima di Sirena', '🧜', 'leggendario', 15000, 520, 'Una perla di dolore e di mare.'),
  M('eternita', 'Cristallo dell\'Eternità', '♾️', 'leggendario', 16000, 560, 'Non si è mai scheggiato, mai.'),
  M('fenice', 'Cuore di Fenice', '🦅', 'leggendario', 18000, 620, 'Batte ancora, tiepido.'),
  M('frammento', 'Frammento di Stella', '⭐', 'leggendario', 20000, 660, 'Un pezzo di cielo finito sottoterra.'),
  M('filosofale', 'Pietra Filosofale', '🧪', 'leggendario', 22000, 700, 'Il sogno di ogni alchimista.'),

  // 💠 PLATINO
  M('palladio', 'Palladio Cosmico', '🛸', 'platino', 50000, 1000, 'Metallo nato dall\'esplosione di una supernova.'),
  M('iridio', 'Iridio Celeste', '🪐', 'platino', 60000, 1300, 'Più denso di qualsiasi cosa sulla Terra.'),
  M('osmio', 'Osmio Stellare', '🌌', 'platino', 80000, 1700, 'Freddo, lucido e quasi impossibile da trovare.'),
  M('adamantio', 'Adamantio', '⚔️', 'platino', 90000, 2000, 'Il metallo delle armi leggendarie.'),
  M('rodio', 'Rodio Imperiale', '👑', 'platino', 100000, 2300, 'Il metallo più prezioso del pianeta.'),
  M('primordiale', 'Platino Primordiale', '🏆', 'platino', 120000, 2500, 'Esisteva prima della miniera stessa.')
]

const PER_ID = Object.fromEntries(MINERALI.map(x => [x.id, x]))
const PER_RARITA = {}
for (const k of Object.keys(RARITA)) PER_RARITA[k] = MINERALI.filter(x => x.rarita === k)

const fmt = n => Number(n || 0).toLocaleString('it-IT')
const tag = jid => '@' + String(jid).split('@')[0].split(':')[0]
const getPrefix = () => global.prefissoComandi || '.'

function fmtPerc(p) {
  const v = p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p >= 0.1 ? p.toFixed(2) : p.toFixed(3)
  return v.replace('.', ',') + '%'
}

// dentro ogni rarità i minerali di minor valore escono più spesso (peso = 1 / valore)
const CHANCE = {}
for (const [k, lista] of Object.entries(PER_RARITA)) {
  const somma = lista.reduce((t, x) => t + 1 / x.valore, 0)
  for (const x of lista) CHANCE[x.id] = RARITA[k].peso * ((1 / x.valore) / somma)
}

function scegliMinerale() {
  const tot = Object.values(RARITA).reduce((t, r) => t + r.peso, 0)
  let roll = Math.random() * tot
  let scelta = 'comune'
  for (const [k, r] of Object.entries(RARITA)) {
    if (roll < r.peso) { scelta = k; break }
    roll -= r.peso
  }
  const lista = PER_RARITA[scelta]
  const somma = lista.reduce((t, x) => t + 1 / x.valore, 0)
  let r2 = Math.random() * somma
  for (const x of lista) {
    if (r2 < 1 / x.valore) return x
    r2 -= 1 / x.valore
  }
  return lista[lista.length - 1]
}

function datiMiniera(user) {
  if (!user.miniera || typeof user.miniera !== 'object') {
    user.miniera = { minerali: {}, totale: 0, venduti: 0, guadagno: 0, ultimoScavo: 0, migliore: null }
  }
  const d = user.miniera
  if (!d.minerali) d.minerali = {}
  d.totale = d.totale || 0
  d.venduti = d.venduti || 0
  d.guadagno = d.guadagno || 0
  d.ultimoScavo = d.ultimoScavo || 0
  return d
}

function valoreZaino(d) {
  let tot = 0
  let pezzi = 0
  for (const [id, n] of Object.entries(d.minerali)) {
    if (PER_ID[id] && n > 0) {
      tot += PER_ID[id].valore * n
      pezzi += n
    }
  }
  return { tot, pezzi }
}

async function sendButtons(conn, jid, { text, footer = '', buttons, quoted, mentions = [] }) {
  try {
    return await conn.sendMessage(
      jid,
      {
        text,
        footer,
        mentions,
        buttons: buttons.map(b => ({
          buttonId: b.id,
          buttonText: { displayText: b.text },
          type: 1
        })),
        headerType: 1
      },
      { quoted }
    )
  } catch (e) {
    const alt = buttons.map(b => `• ${b.id}`).join('\n')
    return conn.sendMessage(jid, { text: `${text}\n\n${footer}\n${alt}`, mentions }, { quoted })
  }
}

const bottoniScavo = prefix => [
  { text: '⛏️ Scava ancora', id: `${prefix}scava` },
  { text: '🎒 Zaino', id: `${prefix}zaino` },
  { text: '💰 Vendi Tutto', id: `${prefix}vendi` }
]

async function scava(m, conn, prefix) {
  const user = getUser(m.sender, true)
  const d = datiMiniera(user)

  const trovato = scegliMinerale()
  const r = RARITA[trovato.rarita]

  d.minerali[trovato.id] = (d.minerali[trovato.id] || 0) + 1
  d.totale += 1
  if (!d.migliore || trovato.valore > (PER_ID[d.migliore]?.valore || 0)) d.migliore = trovato.id
  addExp(m.sender, trovato.xp)
  forceSave()

  let text = `⛏️ ${tag(m.sender)} ha sferrato una picconata e... *TROVATO!*\n\n`
  text += `┃ ${trovato.emoji} *${trovato.nome}*\n`
  text += `┃ ${r.emoji} Rarità: *${r.nome}* (${fmtPerc(r.peso)})\n`
  text += `┃ 🎲 Probabilità: *${fmtPerc(CHANCE[trovato.id])}* (1 su ${fmt(Math.round(100 / CHANCE[trovato.id]))})\n`
  text += `┃ 💰 Valore Stimato: *€${fmt(trovato.valore)}*\n`
  text += `┃ ⭐ XP Ottenuti: *+${fmt(trovato.xp)}*\n`
  text += `┃ 📝 _"${trovato.desc}"_\n\n`
  text += `🎒 Minerali totali estratti: *${fmt(d.totale)}*\n`
  text += `💡 Usa *${prefix}vendi* per convertire i minerali in contanti!`

  if (trovato.rarita === 'platino') text = `💠✨ *RITROVAMENTO PLATINO!* ✨💠\n\n` + text
  else if (trovato.rarita === 'leggendario') text = `🟡✨ *RITROVAMENTO LEGGENDARIO!* ✨🟡\n\n` + text
  else if (trovato.rarita === 'mitico') text = `🔴 *Ritrovamento mitico!* 🔴\n\n` + text

  return sendButtons(conn, m.chat, {
    text,
    footer: FOOTER,
    buttons: bottoniScavo(prefix),
    quoted: m,
    mentions: [m.sender]
  })
}

async function zaino(m, conn, prefix) {
  const user = getUser(m.sender, true)
  const d = datiMiniera(user)
  const { tot, pezzi } = valoreZaino(d)

  let text = `🎒 *ZAINO DI ${tag(m.sender)}*\n\n`

  if (!pezzi) {
    text += `Il tuo zaino è vuoto.\nUsa *${prefix}scava* per trovare qualche minerale!`
  } else {
    const ordine = Object.keys(RARITA).sort((a, b) => RARITA[b].ordine - RARITA[a].ordine)
    for (const k of ordine) {
      const righe = PER_RARITA[k]
        .filter(x => (d.minerali[x.id] || 0) > 0)
        .sort((a, b) => b.valore - a.valore)
      if (!righe.length) continue
      text += `${RARITA[k].emoji} *${RARITA[k].nome.toUpperCase()}*\n`
      for (const x of righe) text += `┃ ${x.emoji} ${x.nome} ×${fmt(d.minerali[x.id])}\n`
      text += `\n`
    }
    text += `📦 Pezzi nello zaino: *${fmt(pezzi)}*\n`
    text += `💰 Valore totale: *€${fmt(tot)}*\n`
  }

  text += `⛏️ Estratti in totale: *${fmt(d.totale)}*`

  return sendButtons(conn, m.chat, {
    text,
    footer: FOOTER,
    buttons: [
      { text: '⛏️ Scava ancora', id: `${prefix}scava` },
      { text: '💰 Vendi Tutto', id: `${prefix}vendi` },
      { text: '🏆 Classifica', id: `${prefix}topminerali` }
    ],
    quoted: m,
    mentions: [m.sender]
  })
}

async function vendi(m, conn, prefix) {
  const user = getUser(m.sender, true)
  const d = datiMiniera(user)
  const { tot, pezzi } = valoreZaino(d)

  if (!pezzi) {
    return sendButtons(conn, m.chat, {
      text: `🎒 ${tag(m.sender)}, non hai minerali da vendere!\nVai a scavare con *${prefix}scava*.`,
      footer: FOOTER,
      buttons: [{ text: '⛏️ Scava ancora', id: `${prefix}scava` }],
      quoted: m,
      mentions: [m.sender]
    })
  }

  d.minerali = {}
  d.venduti += pezzi
  d.guadagno += tot
  addMoney(m.sender, tot)
  forceSave()

  const saldo = getUser(m.sender, true).money || 0

  let text = `💰 *VENDITA COMPLETATA*\n\n`
  text += `┃ 👤 Venditore: ${tag(m.sender)}\n`
  text += `┃ 📦 Minerali venduti: *${fmt(pezzi)}*\n`
  text += `┃ 💵 Guadagno: *+€${fmt(tot)}*\n`
  text += `┃ 🏦 Portafoglio: *€${fmt(saldo)}*\n\n`
  text += `📈 Guadagno totale dalla miniera: *€${fmt(d.guadagno)}*`

  return sendButtons(conn, m.chat, {
    text,
    footer: FOOTER,
    buttons: [
      { text: '⛏️ Scava ancora', id: `${prefix}scava` },
      { text: '🏆 Classifica', id: `${prefix}topminerali` }
    ],
    quoted: m,
    mentions: [m.sender]
  })
}

async function probabilita(m, conn, prefix) {
  let text = `📊 *𝐏𝐑𝐎𝐁𝐀𝐁𝐈𝐋𝐈𝐓À 𝐃𝐈 𝐑𝐈𝐓𝐑𝐎𝐕𝐀𝐌𝐄𝐍𝐓𝐎*\n_Per ogni picconata_\n\n`
  for (const [k, r] of Object.entries(RARITA)) {
    text += `${r.emoji} *${r.nome}* — ${fmtPerc(r.peso)} (1 su ${fmt(Math.round(100 / r.peso))})\n`
    text += `     ${PER_RARITA[k].length} minerali · da €${fmt(Math.min(...PER_RARITA[k].map(x => x.valore)))} a €${fmt(Math.max(...PER_RARITA[k].map(x => x.valore)))}\n`
  }
  text += `\n💡 Dentro ogni rarità, i minerali di minor valore escono più spesso.`

  return sendButtons(conn, m.chat, {
    text,
    footer: FOOTER,
    buttons: [
      { text: '⛏️ Scava ancora', id: `${prefix}scava` },
      { text: '🎒 Zaino', id: `${prefix}zaino` },
      { text: '🏆 Classifica', id: `${prefix}topminerali` }
    ],
    quoted: m
  })
}

async function topMinerali(m, conn, prefix) {
  const utenti = databaseManager.data?.users || {}

  const classifica = Object.entries(utenti)
    .filter(([, u]) => u?.miniera?.totale > 0)
    .map(([jid, u]) => ({ jid, totale: u.miniera.totale, migliore: u.miniera.migliore }))
    .sort((a, b) => b.totale - a.totale)

  if (!classifica.length) {
    return sendButtons(conn, m.chat, {
      text: `🏆 *CLASSIFICA MINATORI*\n\nNessuno ha ancora scavato!\nSii il primo con *${prefix}scava*.`,
      footer: FOOTER,
      buttons: [{ text: '⛏️ Scava ancora', id: `${prefix}scava` }],
      quoted: m
    })
  }

  const medaglie = ['🥇', '🥈', '🥉']
  const top = classifica.slice(0, 10)

  let text = `🏆 *𝐓𝐎𝐏 𝐌𝐈𝐍𝐀𝐓𝐎𝐑𝐈* 🏆\n_Chi ha estratto più minerali_\n\n`
  top.forEach((u, i) => {
    const b = u.migliore && PER_ID[u.migliore]
    text += `${medaglie[i] || `*${i + 1}.*`} ${tag(u.jid)} — *${fmt(u.totale)}* minerali\n`
    if (b) text += `     ${b.emoji} Miglior colpo: ${b.nome} (${RARITA[b.rarita].emoji} ${RARITA[b.rarita].nome})\n`
  })

  const pos = classifica.findIndex(u => u.jid === m.sender)
  if (pos >= 10) {
    text += `\n📍 La tua posizione: *#${pos + 1}* con *${fmt(classifica[pos].totale)}* minerali`
  } else if (pos === -1) {
    text += `\n📍 Non sei ancora in classifica, inizia a scavare!`
  }

  return sendButtons(conn, m.chat, {
    text,
    footer: FOOTER,
    buttons: [
      { text: '⛏️ Scava ancora', id: `${prefix}scava` },
      { text: '🎒 Zaino', id: `${prefix}zaino` },
      { text: '📊 Probabilità', id: `${prefix}probabilita` }
    ],
    quoted: m,
    mentions: top.map(u => u.jid)
  })
}

const miniera = {
  command: ['miniera', 'scava', 'zaino', 'vendi', 'topminerali', 'probabilita'],

  async execute(m, { conn, args, command }) {
    const prefix = getPrefix()
    const cmd = String(command || '').toLowerCase()

    if (cmd === 'zaino') return zaino(m, conn, prefix)
    if (cmd === 'vendi') return vendi(m, conn, prefix)
    if (cmd === 'topminerali') return topMinerali(m, conn, prefix)
    if (cmd === 'probabilita') return probabilita(m, conn, prefix)

    if (cmd === 'miniera') {
      const sub = (args[0] || '').toLowerCase()
      if (sub === 'vendi') return vendi(m, conn, prefix)
      if (sub === 'zaino') return zaino(m, conn, prefix)
      if (sub === 'top' || sub === 'classifica') return topMinerali(m, conn, prefix)
      if (sub === 'probabilita') return probabilita(m, conn, prefix)
    }

    return scava(m, conn, prefix)
  }
}

export default miniera