import sistemaRuoliImport from '../ruoli.js'

const FOOTER = '─── 📢 𝐓𝐀𝐆𝐀𝐋𝐋 📢 ───'
const PER_MESSAGGIO = 80

// prefisso internazionale -> codice paese (ISO). Il match è sul prefisso più lungo.
const PREFISSI = {
  '7': 'RU', '76': 'KZ', '77': 'KZ',
  '20': 'EG', '27': 'ZA', '30': 'GR', '31': 'NL', '32': 'BE', '33': 'FR', '34': 'ES', '36': 'HU',
  '39': 'IT', '40': 'RO', '41': 'CH', '43': 'AT', '44': 'GB', '45': 'DK', '46': 'SE', '47': 'NO',
  '48': 'PL', '49': 'DE', '51': 'PE', '52': 'MX', '53': 'CU', '54': 'AR', '55': 'BR', '56': 'CL',
  '57': 'CO', '58': 'VE', '60': 'MY', '61': 'AU', '62': 'ID', '63': 'PH', '64': 'NZ', '65': 'SG',
  '66': 'TH', '81': 'JP', '82': 'KR', '84': 'VN', '86': 'CN', '90': 'TR', '91': 'IN', '92': 'PK',
  '93': 'AF', '94': 'LK', '95': 'MM', '98': 'IR',
  '212': 'MA', '213': 'DZ', '216': 'TN', '218': 'LY', '220': 'GM', '221': 'SN', '222': 'MR',
  '223': 'ML', '224': 'GN', '225': 'CI', '226': 'BF', '227': 'NE', '228': 'TG', '229': 'BJ',
  '230': 'MU', '231': 'LR', '232': 'SL', '233': 'GH', '234': 'NG', '235': 'TD', '236': 'CF',
  '237': 'CM', '238': 'CV', '239': 'ST', '240': 'GQ', '241': 'GA', '242': 'CG', '243': 'CD',
  '244': 'AO', '245': 'GW', '248': 'SC', '249': 'SD', '250': 'RW', '251': 'ET', '252': 'SO',
  '253': 'DJ', '254': 'KE', '255': 'TZ', '256': 'UG', '257': 'BI', '258': 'MZ', '260': 'ZM',
  '261': 'MG', '262': 'RE', '263': 'ZW', '264': 'NA', '265': 'MW', '266': 'LS', '267': 'BW',
  '268': 'SZ', '269': 'KM',
  '350': 'GI', '351': 'PT', '352': 'LU', '353': 'IE', '354': 'IS', '355': 'AL', '356': 'MT',
  '357': 'CY', '358': 'FI', '359': 'BG', '370': 'LT', '371': 'LV', '372': 'EE', '373': 'MD',
  '374': 'AM', '375': 'BY', '376': 'AD', '377': 'MC', '378': 'SM', '380': 'UA', '381': 'RS',
  '382': 'ME', '383': 'XK', '385': 'HR', '386': 'SI', '387': 'BA', '389': 'MK', '420': 'CZ',
  '421': 'SK', '423': 'LI',
  '500': 'FK', '501': 'BZ', '502': 'GT', '503': 'SV', '504': 'HN', '505': 'NI', '506': 'CR',
  '507': 'PA', '509': 'HT', '591': 'BO', '592': 'GY', '593': 'EC', '595': 'PY', '597': 'SR',
  '598': 'UY',
  '673': 'BN', '679': 'FJ', '852': 'HK', '853': 'MO', '855': 'KH', '856': 'LA', '880': 'BD',
  '886': 'TW', '960': 'MV', '961': 'LB', '962': 'JO', '963': 'SY', '964': 'IQ', '965': 'KW',
  '966': 'SA', '967': 'YE', '968': 'OM', '971': 'AE', '972': 'IL', '973': 'BH', '974': 'QA',
  '975': 'BT', '976': 'MN', '977': 'NP', '992': 'TJ', '993': 'TM', '994': 'AZ', '995': 'GE',
  '996': 'KG', '998': 'UZ'
}

const bandiera = iso =>
  [...iso].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')

function prefissoDi(numero) {
  const n = String(numero).replace(/\D/g, '')
  // +1 è condiviso tra USA, Canada e Caraibi: non si può dire il paese dal solo prefisso
  if (n.startsWith('1') && n.length === 11) return { codice: '1', flag: '🌎' }
  for (let len = 3; len >= 1; len--) {
    const cod = n.slice(0, len)
    // 76 e 77 (Kazakistan) fanno parte del prefisso +7
    if (PREFISSI[cod]) return { codice: cod.startsWith('7') ? '7' : cod, flag: bandiera(PREFISSI[cod]) }
  }
  return { codice: n.slice(0, 2) || '?', flag: '🏳️' }
}

function numeroDa(p, conn) {
  const raw = p.phoneNumber || p.jid || p.id || ''
  let num = ''
  try {
    num = typeof global.jidPhone === 'function' ? global.jidPhone(raw) : ''
  } catch {}
  if (!num) num = String(raw).split('@')[0].split(':')[0]
  return num.replace(/\D/g, '')
}

const tag = jid => '@' + String(jid).split('@')[0].split(':')[0]

const gpTagall = {
  command: ['tagall'],
  group: true,

  async execute(m, { conn, args, participants, isGroup, isAdmin, isOwner, isROwner }) {
    const ruoli = global.sistemaRuoli || sistemaRuoliImport

    if (!isGroup) {
      return conn.sendMessage(m.chat, { text: '❌ Questo comando funziona solo nei gruppi!' }, { quoted: m })
    }
    if (!isAdmin && !isOwner && !isROwner) {
      return conn.sendMessage(m.chat, { text: '👑 Solo admin e owner possono usare .tagall!' }, { quoted: m })
    }

    let lista = participants || []
    if (!lista.length) {
      const meta = await conn.groupMetadata(m.chat).catch(() => null)
      lista = meta?.participants || []
    }
    if (!lista.length) {
      return conn.sendMessage(m.chat, { text: '❌ Non riesco a leggere i membri del gruppo.' }, { quoted: m })
    }

    const botNum = String(conn.decodeJid ? conn.decodeJid(conn.user?.id) : conn.user?.id || '')
      .split('@')[0].split(':')[0]

    const utenti = lista
      .map(p => {
        const jid = p.id || p.jid
        const numero = numeroDa(p, conn)
        const owner = !!(numero && ruoli.isOwner(numero + '@s.whatsapp.net'))
        const admin = p.admin === 'admin' || p.admin === 'superadmin'
        return { jid, numero: numero || String(jid).split('@')[0], owner, admin, ...prefissoDi(numero) }
      })
      .filter(u => u.jid && u.numero !== botNum)
      .sort((a, b) => (b.owner - a.owner) || (b.admin - a.admin) || a.codice.localeCompare(b.codice) || a.numero.localeCompare(b.numero))

    const nOwner = utenti.filter(u => u.owner).length
    const nAdmin = utenti.filter(u => u.admin).length

    const conteggio = {}
    for (const u of utenti) conteggio[u.codice] = (conteggio[u.codice] || 0) + 1
    const riepilogoPrefissi = Object.entries(conteggio)
      .sort((a, b) => b[1] - a[1])
      .map(([cod, n]) => `+${cod} (${n})`)
      .join(' · ')

    const messaggio = args.join(' ').trim()

    let intestazione = `📢 *𝐓𝐀𝐆𝐀𝐋𝐋*\n`
    if (messaggio) intestazione += `\n💬 ${messaggio}\n`
    intestazione += `\n👥 Membri: *${utenti.length}*\n`
    intestazione += `👑 Owner: *${nOwner}*  •  🛡️ Admin: *${nAdmin}*\n`
    intestazione += `🌍 Prefissi: ${riepilogoPrefissi}\n\n`

    const riga = u => {
      const ruolo = u.owner && u.admin ? '👑 Owner • 🛡️ Admin'
        : u.owner ? '👑 Owner'
        : u.admin ? '🛡️ Admin'
        : '👤 Membro'
      return `┃ ${u.flag} +${u.codice} • ${tag(u.jid)} • ${ruolo}`
    }

    for (let i = 0; i < utenti.length; i += PER_MESSAGGIO) {
      const blocco = utenti.slice(i, i + PER_MESSAGGIO)
      let text = i === 0 ? intestazione : `📢 *TAGALL* (continua)\n\n`
      text += blocco.map(riga).join('\n')
      if (i + PER_MESSAGGIO >= utenti.length) text += `\n\n${FOOTER}`

      await conn.sendMessage(
        m.chat,
        { text, mentions: blocco.map(u => u.jid) },
        i === 0 ? { quoted: m } : {}
      )
    }
  }
}

export default gpTagall