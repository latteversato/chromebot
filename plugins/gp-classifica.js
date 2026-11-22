import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas, loadImage, registerFont } from 'canvas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STATS_PATH = path.join(__dirname, '../db/messaggi.json')
const FONT_DIR = path.join(__dirname, '..', 'db', 'fonts')

for (const [file, weight] of [['font.ttf', 'normal'], ['font-bold.ttf', 'bold']]) {
  const fp = path.join(FONT_DIR, file)
  try { if (fs.existsSync(fp)) registerFont(fp, { family: 'CardFont', weight }) } catch (e) { console.error('Font non valido:', file, e.message) }
}

const TZ = 'Europe/Rome'
const BOT_NAME = '𝐂𝐇𝐑𝐎𝐌𝐄 𝐁𝐎𝐓'
const FOOTER = `─── 🔹 ${BOT_NAME} 🔹 ───`
const KEEP_DAYS = 60
const FLUSH_MS = 30000
const TICK_MS = 30000
const STATE_KEY = '__chromeClassifica'
const W = 1280
const H = 720
const AV_FULL = 384
const AV_PREVIEW = 96
const JPEG_QUALITY = 0.92
const GROUPS_TTL = 60000
const FONT = 'CardFont, sans-serif'
const DAY_LABELS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']
const NOT_MESSAGES = ['protocolMessage', 'reactionMessage', 'senderKeyDistributionMessage']
const GROUP_COMMANDS = ['gruppo', 'topgruppi', 'topgruppo', 'top10gruppi', 'top10gruppo']
const PERIOD_WORDS = { day: 'oggi', week: 'questa settimana', total: 'finora' }

const MEDALS = [
  { a: { h: 46, s: 96, l: 64 }, b: { h: 34, s: 92, l: 48 } },
  { a: { h: 214, s: 16, l: 84 }, b: { h: 218, s: 12, l: 60 } },
  { a: { h: 27, s: 72, l: 60 }, b: { h: 18, s: 68, l: 40 } }
]

const sleep = ms => new Promise(r => setTimeout(r, ms))
const fmt = n => Number(n || 0).toLocaleString('it-IT')
const hsla = (c, a = 1) => `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`

const withTimeout = (p, ms) => {
  let t
  return Promise.race([
    Promise.resolve(p),
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms) })
  ]).finally(() => clearTimeout(t))
}

const bold = s => [...String(s)].map(c => {
  const n = c.codePointAt(0)
  if (n >= 65 && n <= 90) return String.fromCodePoint(0x1D400 + n - 65)
  if (n >= 97 && n <= 122) return String.fromCodePoint(0x1D41A + n - 97)
  if (n >= 48 && n <= 57) return String.fromCodePoint(0x1D7CE + n - 48)
  return c
}).join('')

const cleanName = s => String(s || '').normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}\p{P}\p{Zs}]/gu, '').replace(/\s+/g, ' ').trim()
const mdSafe = s => String(s).replace(/[*_~`]/g, '')
const initialOf = s => (String(s).match(/[\p{L}\p{N}]/u)?.[0] || '#').toUpperCase()

function compact(n) {
  n = Number(n || 0)
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'M'
  if (n >= 1e5) return Math.round(n / 1e3) + 'K'
  return fmt(n)
}

function numOf(jid) {
  const s = String(jid || '')
  if (s.endsWith('@lid')) {
    const n = global.jidTools?.phoneOf?.(s)
    if (n) return String(n).replace(/\D/g, '')
  }
  return s.split('@')[0].split(':')[0].replace(/\D/g, '') || s.split('@')[0]
}

function canon(jid) {
  const s = String(jid)
  if (s.endsWith('@g.us')) return s
  const p = global.jidTools?.phoneOf?.(jid)
  return p ? `${p}@s.whatsapp.net` : s
}

function mergeUsers(users) {
  const out = {}
  for (const [u, n] of Object.entries(users || {})) {
    const k = canon(u)
    out[k] = (out[k] || 0) + n
  }
  return out
}

const btn = (id, label) => ({ buttonId: `${global.prefissoComandi || '.'}${id}`, buttonText: { displayText: label }, type: 1 })

function rankButtons(period) {
  if (period === 'week') return [btn('top10 oggi', '🏆 Oggi'), btn('top10 totale', '📈 Totale'), btn('info', '👤 Info')]
  if (period === 'total') return [btn('top10 oggi', '🏆 Oggi'), btn('top10 settimana', '📅 Settimana'), btn('info', '👤 Info')]
  return [btn('top10 settimana', '📅 Settimana'), btn('top10 totale', '📈 Totale'), btn('info', '👤 Info')]
}

function groupButtons() {
  return [btn('topgruppi', '🌍 Top gruppi'), btn('top10gruppi', '🔟 Top 10 gruppi'), btn('top10', '🏆 Top 10')]
}

function groupRankButtons(period, size) {
  const c = size === 10 ? 'top10gruppi' : 'topgruppi'
  if (period === 'week') return [btn(`${c} oggi`, '🏆 Oggi'), btn(`${c} totale`, '📈 Totale'), btn('gruppo', '🏘️ Gruppo')]
  if (period === 'total') return [btn(`${c} oggi`, '🏆 Oggi'), btn(`${c} settimana`, '📅 Settimana'), btn('gruppo', '🏘️ Gruppo')]
  return [btn(`${c} settimana`, '📅 Settimana'), btn(`${c} totale`, '📈 Totale'), btn('gruppo', '🏘️ Gruppo')]
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

const todayStr = (d = new Date()) => dayFormatter.format(d)

function parseDay(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function addDays(s, n) {
  const d = parseDay(s)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekStartOf(s) {
  return addDays(s, -((parseDay(s).getUTCDay() + 6) % 7))
}

function weekDates(s) {
  const start = weekStartOf(s)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

const prettyDay = s => parseDay(s).toLocaleDateString('it-IT', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const shortDay = s => parseDay(s).toLocaleDateString('it-IT', { timeZone: 'UTC', day: 'numeric', month: 'short' })
const dateLabelOf = s => parseDay(s).toLocaleDateString('it-IT', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').toUpperCase()

let data = { lastDate: todayStr(), stats: {}, totals: {}, auto: {}, names: {} }
let dirty = false

function migrateOldData(raw) {
  if (raw.userStats || raw.groupStats) {
    const migrated = {}
    Object.keys(raw.userStats || {}).forEach(date => {
      migrated[date] = migrated[date] || {}
      if (raw.userStats[date]) {
        migrated[date]['migrated@g.us'] = migrated[date]['migrated@g.us'] || { users: {}, total: 0 }
        Object.entries(raw.userStats[date]).forEach(([user, count]) => {
          migrated[date]['migrated@g.us'].users[user] = count
          migrated[date]['migrated@g.us'].total += count
        })
      }
    })
    return migrated
  }
  return raw.stats || {}
}

function deriveTotals(stats) {
  const totals = {}
  for (const chats of Object.values(stats)) {
    for (const [chat, b] of Object.entries(chats)) {
      const t = totals[chat] || (totals[chat] = { users: {}, total: 0 })
      for (const [u, n] of Object.entries(b.users || {})) t.users[u] = (t.users[u] || 0) + n
      t.total += b.total || 0
    }
  }
  return totals
}

function load() {
  try {
    if (!fs.existsSync(STATS_PATH)) return
    const raw = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'))
    data.stats = migrateOldData(raw) || {}
    data.auto = raw.auto || {}
    data.names = raw.names || {}
    data.lastDate = raw.lastDate || todayStr()
    data.totals = raw.totals || deriveTotals(data.stats)
  } catch (err) {
    console.error('❌ Errore caricamento stats:', err)
  }
}

function flush() {
  if (!dirty) return
  try {
    fs.mkdirSync(path.dirname(STATS_PATH), { recursive: true })
    const tmp = STATS_PATH + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify({ version: 3, lastDate: data.lastDate, stats: data.stats, totals: data.totals, auto: data.auto, names: data.names }))
    fs.renameSync(tmp, STATS_PATH)
    dirty = false
  } catch (err) {
    console.error('❌ Errore salvataggio stats:', err)
  }
}

function prune(today) {
  const limit = addDays(today, -KEEP_DAYS)
  for (const d of Object.keys(data.stats)) if (d < limit) delete data.stats[d]

  const keep = new Set()
  for (const t of Object.values(data.totals)) for (const u of Object.keys(t.users || {})) keep.add(canon(u))
  for (const k of Object.keys(data.names)) if (!keep.has(k)) delete data.names[k]
}

function autoCfg(chat) {
  const v = data.auto[chat]
  if (v === true) return { day: true, week: true }
  if (v && typeof v === 'object') return { day: Boolean(v.day), week: Boolean(v.week) }
  return { day: false, week: false }
}

function setAuto(chat, patch) {
  const next = { ...autoCfg(chat), ...patch }
  if (!next.day && !next.week) delete data.auto[chat]
  else data.auto[chat] = next
  dirty = true
  flush()
  return next
}

function ensureDay(date, chat) {
  const day = data.stats[date] || (data.stats[date] = {})
  return day[chat] || (day[chat] = { users: {}, total: 0 })
}

function ensureTotals(chat) {
  return data.totals[chat] || (data.totals[chat] = { users: {}, total: 0 })
}

function aggregate(chat, dates) {
  const raw = {}
  let total = 0
  for (const d of dates) {
    const b = data.stats[d]?.[chat]
    if (!b) continue
    for (const [u, n] of Object.entries(b.users || {})) raw[u] = (raw[u] || 0) + n
    total += b.total || 0
  }
  return { users: mergeUsers(raw), total }
}

function totalsOf(chat) {
  const t = data.totals[chat]
  return t ? { users: mergeUsers(t.users), total: t.total || 0 } : { users: {}, total: 0 }
}

const sortedUsers = users => Object.entries(users).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])

function rankOf(users, jid) {
  const n = users[jid] || 0
  const active = Object.values(users).filter(v => v > 0)
  if (!n) return { rank: 0, of: active.length }
  return { rank: active.filter(v => v > n).length + 1, of: active.length }
}

function resetChat(chat, scope) {
  const today = todayStr()
  const dates = scope === 'day' ? [today] : scope === 'week' ? weekDates(today) : Object.keys(data.stats)
  const tot = data.totals[chat]
  let removed = 0

  for (const d of dates) {
    const b = data.stats[d]?.[chat]
    if (!b) continue
    if (tot) for (const [u, n] of Object.entries(b.users || {})) tot.users[u] = Math.max(0, (tot.users[u] || 0) - n)
    removed += b.total || 0
    delete data.stats[d][chat]
    if (!Object.keys(data.stats[d]).length) delete data.stats[d]
  }

  if (scope === 'all') delete data.totals[chat]
  else if (tot) tot.total = Math.max(0, tot.total - removed)

  dirty = true
  flush()
  return removed
}

function resetAll() {
  const chats = new Set(Object.keys(data.totals))
  for (const day of Object.values(data.stats)) for (const c of Object.keys(day)) chats.add(c)

  let removed = 0
  for (const t of Object.values(data.totals)) removed += t.total || 0

  data.stats = {}
  data.totals = {}
  data.names = {}
  dirty = true
  flush()
  return { chats: chats.size, removed }
}

function rankingMessage({ title, subtitle, agg, size, short = false }) {
  const sorted = sortedUsers(agg.users)
  if (!sorted.length) return null

  const top = sorted.slice(0, size)

  if (short) return { text: `🏆 *${bold(`TOP ${size}`)}* · ${subtitle}`, mentions: [] }

  const medals = ['🥇', '🥈', '🥉']
  let text = `╭━━━「 ${title} 」━━━╮\n┃ 📅 ${subtitle}\n┃\n`
  top.forEach(([jid, n], i) => {
    const pct = agg.total ? Math.round((n / agg.total) * 100) : 0
    text += `┃ ${medals[i] || `*${i + 1}.*`} @${numOf(jid)} — *${fmt(n)}* msg _(${pct}%)_\n`
  })
  text += `┃\n╰━━━━━━━━━━━━━━━━━━╯\n`
  text += `💬 *${bold('Totale')}:* ${fmt(agg.total)} messaggi · 👥 *${bold('Attivi')}:* ${sorted.length}`

  return { text, mentions: top.map(([jid]) => jid) }
}

function periodInfo(period, size, noun = '') {
  const today = todayStr()
  const n = noun ? `${noun} ` : ''
  if (period === 'week') {
    const days = weekDates(today)
    return {
      dates: days.filter(d => d <= today),
      label: noun ? `${noun} · SETTIMANA` : 'CLASSIFICA SETTIMANALE',
      title: `🗓️ ${bold(`TOP ${size} ${n}SETTIMANA`)}`,
      subtitle: `${shortDay(days[0])} – ${shortDay(days[6])}`
    }
  }
  if (period === 'total') {
    return {
      dates: null,
      label: noun ? `${noun} · TOTALE` : 'CLASSIFICA TOTALE',
      title: `📈 ${bold(`TOP ${size} ${n}TOTALE`)}`,
      subtitle: 'dall\'inizio'
    }
  }
  return {
    dates: [today],
    label: noun ? `${noun} · OGGI` : 'CLASSIFICA GIORNALIERA',
    title: `🏆 ${bold(`TOP ${size} ${n}OGGI`)}`,
    subtitle: prettyDay(today)
  }
}

function aggFor(chat, info) {
  return info.dates ? aggregate(chat, info.dates) : totalsOf(chat)
}

function personalStats(chat, who) {
  const jid = canon(who)
  const today = todayStr()
  const yesterday = addDays(today, -1)
  const weekDays = weekDates(today)
  const elapsed = weekDays.filter(d => d <= today)
  const prevWeek = weekDates(addDays(today, -7)).slice(0, elapsed.length)
  const dayAgg = aggregate(chat, [today])
  const weekAgg = aggregate(chat, elapsed)
  const tot = totalsOf(chat)
  const countOn = d => aggregate(chat, [d]).users[jid] || 0
  const hasData = dates => dates.some(d => data.stats[d]?.[chat])
  const share = (n, t) => (t ? n / t : 0)

  const series = weekDays.map((d, i) => ({
    label: DAY_LABELS[i],
    count: d <= today ? countOn(d) : null,
    today: d === today
  }))

  let streak = 0
  let d = countOn(today) > 0 ? today : addDays(today, -1)
  while (countOn(d) > 0 && streak < KEEP_DAYS) {
    streak++
    d = addDays(d, -1)
  }

  const dayCount = dayAgg.users[jid] || 0
  const weekCount = weekAgg.users[jid] || 0
  const totalCount = tot.users[jid] || 0

  return {
    day: {
      count: dayCount,
      ...rankOf(dayAgg.users, jid),
      groupTotal: dayAgg.total,
      share: share(dayCount, dayAgg.total),
      delta: hasData([yesterday]) ? dayCount - countOn(yesterday) : null
    },
    week: {
      count: weekCount,
      ...rankOf(weekAgg.users, jid),
      groupTotal: weekAgg.total,
      share: share(weekCount, weekAgg.total),
      delta: hasData(prevWeek) ? weekCount - (aggregate(chat, prevWeek).users[jid] || 0) : null
    },
    total: {
      count: totalCount,
      ...rankOf(tot.users, jid),
      groupTotal: tot.total,
      share: share(totalCount, tot.total),
      delta: null
    },
    series,
    streak,
    shareWeek: share(weekCount, weekAgg.total),
    shareDay: share(dayCount, dayAgg.total),
    average: elapsed.length ? weekCount / elapsed.length : 0
  }
}

const LEVELS = [
  { at: 0, name: 'Nuovo arrivato' },
  { at: 50, name: 'Attivo' },
  { at: 250, name: 'Chiacchierone' },
  { at: 1000, name: 'Veterano' },
  { at: 3000, name: 'Leggenda' },
  { at: 10000, name: 'Mito' }
]

function levelInfo(total) {
  let i = 0
  while (i + 1 < LEVELS.length && total >= LEVELS[i + 1].at) i++
  const cur = LEVELS[i]
  const next = LEVELS[i + 1] || null
  return {
    name: cur.name,
    next: next ? next.name : null,
    nextAt: next ? next.at : null,
    progress: next ? (total - cur.at) / (next.at - cur.at) : 1
  }
}

async function nameOf(conn, jid) {
  let n = data.names[canon(jid)] || data.names[jid]
  if (!n) { try { n = await withTimeout(conn.getName(jid), 2500) } catch {} }
  n = cleanName(n)
  return n && !/^[\d\s+@.\-]+$/.test(n) ? n : `+${numOf(jid)}`
}

let groupsCache = { ts: 0, map: null }
const groupMetaCache = new Map()

async function liveGroups(conn) {
  if (groupsCache.map && Date.now() - groupsCache.ts < GROUPS_TTL) return groupsCache.map
  try {
    const all = await withTimeout(conn.groupFetchAllParticipating(), 8000)
    const map = {}
    for (const [id, g] of Object.entries(all || {})) {
      map[id] = { name: cleanName(g?.subject) || 'Gruppo', size: Number(g?.size ?? g?.participants?.length ?? 0) }
    }
    groupsCache = { ts: Date.now(), map }
    return map
  } catch {
    return groupsCache.map
  }
}

async function groupInfoOf(conn, chat) {
  const live = groupsCache.map?.[chat]
  if (live && Date.now() - groupsCache.ts < 10 * 60e3) return live

  const hit = groupMetaCache.get(chat)
  if (hit && Date.now() - hit.ts < 10 * 60e3) return hit.info

  let info = { name: 'Gruppo', size: 0 }
  let ok = false
  try {
    const md = await withTimeout(conn.groupMetadata(chat), 3000)
    info = { name: cleanName(md.subject) || 'Gruppo', size: Number(md.size ?? md.participants?.length ?? 0) }
    ok = true
  } catch {}

  groupMetaCache.set(chat, { info, ts: ok ? Date.now() : Date.now() - 9 * 60e3 })
  if (groupMetaCache.size > 200) groupMetaCache.delete(groupMetaCache.keys().next().value)
  return info
}

function chatTotals(dates) {
  const out = {}
  if (!dates) {
    for (const [c, t] of Object.entries(data.totals)) if ((t.total || 0) > 0) out[c] = t.total
    return out
  }
  for (const d of dates) {
    for (const [c, b] of Object.entries(data.stats[d] || {})) out[c] = (out[c] || 0) + (b.total || 0)
  }
  return out
}

async function rankGroups(conn, dates, keep) {
  const totals = chatTotals(dates)
  const live = await liveGroups(conn)
  const list = Object.entries(totals)
    .filter(([c, n]) => n > 0 && c.endsWith('@g.us') && c !== 'migrated@g.us' && (c === keep || !live || live[c] !== undefined))
    .map(([chat, count]) => ({ chat, count }))
    .sort((a, b) => b.count - a.count)
  return { list, sum: list.reduce((s, g) => s + g.count, 0) }
}

const rankIn = (ranking, chat) => {
  const i = ranking.list.findIndex(g => g.chat === chat)
  return { rank: i + 1, of: ranking.list.length }
}

async function groupEntries(conn, ranking, n, me) {
  return Promise.all(ranking.list.slice(0, n).map(async (g, i) => ({
    rank: i + 1,
    chat: g.chat,
    count: g.count,
    me: g.chat === me,
    pct: ranking.sum ? Math.round((g.count / ranking.sum) * 100) : 0,
    name: mdSafe((await groupInfoOf(conn, g.chat)).name)
  })))
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t.trimEnd() + '…'
}

function fitFont(ctx, text, weight, startSize, minSize, maxWidth) {
  let size = startSize
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${FONT}`
    if (ctx.measureText(text).width <= maxWidth) return text
    size -= 2
  }
  ctx.font = `${weight} ${minSize}px ${FONT}`
  return fitText(ctx, text, maxWidth)
}

function drawPill(ctx, x, y, w, h, fill, stroke) {
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = 1.5
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function drawPanel(ctx, x, y, w, h, r) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, 'rgba(0,0,0,0.32)')
  g.addColorStop(1, 'rgba(0,0,0,0.18)')
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.stroke()
}

function extractPalette(img) {
  const size = 24
  const c = createCanvas(size, size)
  const x = c.getContext('2d')
  x.drawImage(img, 0, 0, size, size)
  const d = x.getImageData(0, 0, size, size).data
  const buckets = new Array(12).fill(0)
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const delta = max - min
    if (delta < 0.1 || max < 0.2) continue
    let h
    if (max === r) h = ((g - b) / delta + 6) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    buckets[Math.floor(h * 2) % 12] += delta
  }
  const order = buckets.map((w, i) => [w, i]).sort((a, b) => b[0] - a[0])
  const [bestW, bestI] = order[0]
  if (bestW < 5) return { accent: { h: 0, s: 0, l: 90 }, accent2: { h: 0, s: 0, l: 68 } }
  const dist = (a, b) => Math.min((a - b + 12) % 12, (b - a + 12) % 12)
  const second = order.find(([w, i]) => i !== bestI && dist(i, bestI) >= 2 && w >= bestW * 0.3)
  const h1 = bestI * 30 + 15
  const h2 = second ? second[1] * 30 + 15 : (h1 + 40) % 360
  return { accent: { h: h1, s: 80, l: 64 }, accent2: { h: h2, s: 82, l: 60 } }
}

const paletteCache = new WeakMap()

function paletteOf(img) {
  let p = paletteCache.get(img)
  if (!p) {
    p = extractPalette(img)
    paletteCache.set(img, p)
  }
  return p
}

function paletteFromSeed(seed) {
  let h = 0
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const hue = h % 360
  return { accent: { h: hue, s: 78, l: 64 }, accent2: { h: (hue + 50) % 360, s: 80, l: 60 } }
}

function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height
  const r = w / h
  let sw = img.width, sh = img.height, sx = 0, sy = 0
  if (ir > r) {
    sw = img.height * r
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / r
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function boxBlurPass(src, dst, w, h, radius, horizontal) {
  const outer = horizontal ? h : w
  const inner = horizontal ? w : h
  const stride = horizontal ? 4 : w * 4
  const lineStride = horizontal ? w * 4 : 4
  const div = radius * 2 + 1
  for (let l = 0; l < outer; l++) {
    const base = l * lineStride
    for (let ch = 0; ch < 4; ch++) {
      let sum = 0
      for (let i = -radius; i <= radius; i++) {
        const k = Math.min(inner - 1, Math.max(0, i))
        sum += src[base + k * stride + ch]
      }
      for (let i = 0; i < inner; i++) {
        dst[base + i * stride + ch] = sum / div
        const add = Math.min(inner - 1, i + radius + 1)
        const sub = Math.max(0, i - radius)
        sum += src[base + add * stride + ch] - src[base + sub * stride + ch]
      }
    }
  }
}

const blurCache = new WeakMap()

function blurredCanvas(img, radius = 5, passes = 3) {
  const hit = blurCache.get(img)
  if (hit) return hit
  const sw = 96
  const sh = Math.round(sw * H / W)
  const small = createCanvas(sw, sh)
  const sctx = small.getContext('2d')
  sctx.imageSmoothingEnabled = true
  drawCover(sctx, img, 0, 0, sw, sh)
  const id = sctx.getImageData(0, 0, sw, sh)
  const tmp = new Uint8ClampedArray(id.data.length)
  for (let p = 0; p < passes; p++) {
    boxBlurPass(id.data, tmp, sw, sh, radius, true)
    boxBlurPass(tmp, id.data, sw, sh, radius, false)
  }
  sctx.putImageData(id, 0, 0)
  blurCache.set(img, small)
  return small
}

function seededRand(seed) {
  let h = 2166136261
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    return h / 4294967296
  }
}

let overlayLayer = null

function getOverlay() {
  if (overlayLayer) return overlayLayer
  const c = createCanvas(W, H)
  const x = c.getContext('2d')

  const vg = x.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.6)')
  x.fillStyle = vg
  x.fillRect(0, 0, W, H)

  const tile = createCanvas(256, 256)
  const tx = tile.getContext('2d')
  const id = tx.createImageData(256, 256)
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random()
    if (v < 0.04) {
      id.data[i] = id.data[i + 1] = id.data[i + 2] = 255
      id.data[i + 3] = 9
    } else if (v < 0.08) {
      id.data[i + 3] = 13
    }
  }
  tx.putImageData(id, 0, 0)
  x.fillStyle = x.createPattern(tile, 'repeat')
  x.fillRect(0, 0, W, H)

  overlayLayer = c
  return c
}

let glassLayer = null

function getGlassLayer() {
  if (glassLayer) return glassLayer
  const c = createCanvas(W, H)
  const ctx = c.getContext('2d')
  const x = 48, y = 48, w = 1184, h = 624, r = 48

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 20
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()

  const fill = ctx.createLinearGradient(x, y, x, y + h)
  fill.addColorStop(0, 'rgba(255,255,255,0.13)')
  fill.addColorStop(0.5, 'rgba(255,255,255,0.03)')
  fill.addColorStop(1, 'rgba(255,255,255,0.07)')
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()

  const edge = ctx.createLinearGradient(x, y, x + w, y + h)
  edge.addColorStop(0, 'rgba(255,255,255,0.38)')
  edge.addColorStop(0.5, 'rgba(255,255,255,0.04)')
  edge.addColorStop(1, 'rgba(255,255,255,0.2)')
  roundRect(ctx, x, y, w, h, r)
  ctx.lineWidth = 2
  ctx.strokeStyle = edge
  ctx.stroke()

  glassLayer = c
  return c
}

function drawBackground(ctx, img, pal) {
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(blurredCanvas(img), 0, 0, W, H)
  ctx.fillStyle = 'rgba(6,6,12,0.55)'
  ctx.fillRect(0, 0, W, H)

  const g1 = ctx.createRadialGradient(W * 0.22, H * 0.4, 20, W * 0.22, H * 0.4, 760)
  g1.addColorStop(0, hsla(pal.accent, 0.38))
  g1.addColorStop(1, hsla(pal.accent, 0))
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, W, H)

  const g2 = ctx.createRadialGradient(W * 0.92, H, 20, W * 0.92, H, 700)
  g2.addColorStop(0, hsla(pal.accent2, 0.3))
  g2.addColorStop(1, hsla(pal.accent2, 0))
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, W, H)

  const rnd = seededRand(`${pal.accent.h}-${pal.accent2.h}`)
  for (let i = 0; i < 16; i++) {
    const bx = rnd() * W
    const by = rnd() * H
    const br = 40 + rnd() * 130
    const c = i % 2 ? pal.accent : pal.accent2
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br)
    bg.addColorStop(0, hsla(c, 0.16))
    bg.addColorStop(0.6, hsla(c, 0.05))
    bg.addColorStop(1, hsla(c, 0))
    ctx.fillStyle = bg
    ctx.fillRect(bx - br, by - br, br * 2, br * 2)
  }

  ctx.drawImage(getOverlay(), 0, 0)
}

function encodeImage(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBuffer((err, buf) => (err ? reject(err) : resolve(buf)), 'image/jpeg', { quality: JPEG_QUALITY })
  })
}

const avatarCache = new Map()

async function fetchAvatarImage(url, size) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 3000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    const img = await loadImage(Buffer.from(await res.arrayBuffer()))
    const c = createCanvas(size, size)
    drawCover(c.getContext('2d'), img, 0, 0, size, size)
    return c
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function getAvatar(conn, jid, kind = 'image') {
  const key = `${canon(jid)}|${kind}`
  const hit = avatarCache.get(key)
  if (hit && Date.now() - hit.ts < (hit.fail ? 10 * 60e3 : 30 * 60e3)) return hit.p

  const entry = { ts: Date.now(), fail: false, p: null }
  entry.p = (async () => {
    for (const j of new Set([canon(jid), jid])) {
      try {
        const url = await withTimeout(conn.profilePictureUrl(j, kind), 2500)
        const img = await fetchAvatarImage(url, kind === 'image' ? AV_FULL : AV_PREVIEW)
        if (img) return img
      } catch {}
    }
    entry.fail = true
    return null
  })()

  avatarCache.set(key, entry)
  if (avatarCache.size > 160) avatarCache.delete(avatarCache.keys().next().value)
  return entry.p
}

function initialAvatar(letter, pal) {
  const s = 400
  const c = createCanvas(s, s)
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, s, s)
  g.addColorStop(0, hsla(pal.accent))
  g.addColorStop(1, hsla(pal.accent2))
  x.fillStyle = g
  x.fillRect(0, 0, s, s)
  const r = x.createRadialGradient(s * 0.3, s * 0.25, 10, s * 0.3, s * 0.25, s * 0.8)
  r.addColorStop(0, 'rgba(255,255,255,0.35)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = r
  x.fillRect(0, 0, s, s)
  x.fillStyle = 'rgba(255,255,255,0.92)'
  x.font = `bold 210px ${FONT}`
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText(letter, s / 2, s / 2 + 10)
  return c
}

const artOr = (img, name, seed) => img || initialAvatar(initialOf(name), paletteFromSeed(seed))

const pctText = v => `${(Math.round(v * 1000) / 10).toString().replace('.', ',')}%`

function starPath(ctx, cx, cy, r, points = 5, inner = 0.45) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? r * inner : r
    const ang = -Math.PI / 2 + (i * Math.PI) / points
    const x = cx + Math.cos(ang) * rad
    const y = cy + Math.sin(ang) * rad
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
}

function flamePath(ctx, cx, cy, s) {
  ctx.beginPath()
  ctx.moveTo(cx + s * 0.05, cy - s)
  ctx.bezierCurveTo(cx + s * 0.1, cy - s * 0.45, cx + s * 0.78, cy - s * 0.25, cx + s * 0.74, cy + s * 0.3)
  ctx.bezierCurveTo(cx + s * 0.7, cy + s * 0.75, cx + s * 0.38, cy + s, cx, cy + s)
  ctx.bezierCurveTo(cx - s * 0.38, cy + s, cx - s * 0.74, cy + s * 0.72, cx - s * 0.72, cy + s * 0.25)
  ctx.bezierCurveTo(cx - s * 0.7, cy - s * 0.05, cx - s * 0.45, cy - s * 0.1, cx - s * 0.3, cy - s * 0.42)
  ctx.bezierCurveTo(cx - s * 0.12, cy - s * 0.3, cx - s * 0.02, cy - s * 0.62, cx + s * 0.05, cy - s)
  ctx.closePath()
}

function drawFlame(ctx, cx, cy, s, a, b) {
  ctx.save()
  ctx.shadowColor = a
  ctx.shadowBlur = 14
  flamePath(ctx, cx, cy, s)
  const g = ctx.createLinearGradient(cx, cy - s, cx, cy + s)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  flamePath(ctx, cx, cy + s * 0.34, s * 0.48)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fill()
}

function drawArrow(ctx, cx, cy, s, up, color) {
  ctx.beginPath()
  if (up) {
    ctx.moveTo(cx, cy - s)
    ctx.lineTo(cx + s, cy + s * 0.7)
    ctx.lineTo(cx - s, cy + s * 0.7)
  } else {
    ctx.moveTo(cx, cy + s)
    ctx.lineTo(cx + s, cy - s * 0.7)
    ctx.lineTo(cx - s, cy - s * 0.7)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function drawProgressRing(ctx, cx, cy, r, thick, progress, a, b) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineWidth = thick
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.stroke()

  const p = Math.max(0, Math.min(1, progress))
  if (p > 0) {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
    g.addColorStop(0, a)
    g.addColorStop(1, b)
    ctx.shadowColor = a
    ctx.shadowBlur = 16
    ctx.beginPath()
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p)
    ctx.strokeStyle = g
    ctx.stroke()
  }
  ctx.restore()
}

function drawDelta(ctx, cx, y, s, vs, fallback) {
  let text
  let color
  let kind
  if (s.delta !== null && s.delta !== undefined && vs) {
    kind = s.delta > 0 ? 'up' : s.delta < 0 ? 'down' : 'flat'
    text = `${s.delta > 0 ? '+' : ''}${fmt(s.delta)} vs ${vs}`
    color = kind === 'up' ? 'hsl(145, 72%, 62%)' : kind === 'down' ? 'hsl(352, 88%, 70%)' : 'rgba(255,255,255,0.5)'
  } else {
    kind = 'share'
    text = fallback ?? `${pctText(s.share)} del gruppo`
    color = 'rgba(255,255,255,0.5)'
  }

  ctx.font = `bold 14px ${FONT}`
  const textW = ctx.measureText(text).width
  const iconW = kind === 'share' ? 0 : 15
  const x = cx - (iconW + textW) / 2
  if (kind === 'up' || kind === 'down') drawArrow(ctx, x + 5, y - 5, 5, kind === 'up', color)
  else if (kind === 'flat') {
    ctx.fillStyle = color
    ctx.fillRect(x, y - 6, 10, 2.5)
  }
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.fillText(text, x + iconW, y)
  ctx.textAlign = 'center'
}

const metalGrad = (ctx, m, x0, y0, x1, y1, alpha = 1) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, hsla(m.a, alpha))
  g.addColorStop(1, hsla(m.b, alpha))
  return g
}

function drawCircleAvatar(ctx, art, cx, cy, r) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  drawCover(ctx, art, cx - r, cy - r, r * 2, r * 2)
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.stroke()
}

function drawHeaderAvatar(ctx, art, cx, cy, r, pal) {
  ctx.save()
  ctx.shadowColor = hsla(pal.accent, 0.6)
  ctx.shadowBlur = 26
  ctx.beginPath()
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
  ctx.fillStyle = hsla(pal.accent, 0.9)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  drawCover(ctx, art, cx - r, cy - r, r * 2, r * 2)
  const gloss = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  gloss.addColorStop(0, 'rgba(255,255,255,0.22)')
  gloss.addColorStop(0.4, 'rgba(255,255,255,0)')
  gloss.addColorStop(1, 'rgba(0,0,0,0.2)')
  ctx.fillStyle = gloss
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = 2.5
  ctx.strokeStyle = 'rgba(10,10,16,0.55)'
  ctx.stroke()
}

function drawRoundArt(ctx, img, x, y, s, pal, progress = 0) {
  const cx = x + s / 2
  const cy = y + s / 2
  const r = s / 2

  ctx.save()
  ctx.shadowColor = hsla(pal.accent, 0.65)
  ctx.shadowBlur = s * 0.16
  ctx.shadowOffsetY = s * 0.03
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#000'
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  drawCover(ctx, img, x, y, s, s)
  const gloss = ctx.createLinearGradient(x, y, x + s, y + s)
  gloss.addColorStop(0, 'rgba(255,255,255,0.22)')
  gloss.addColorStop(0.35, 'rgba(255,255,255,0)')
  gloss.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = gloss
  ctx.fillRect(x, y, s, s)
  ctx.restore()

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.stroke()

  drawProgressRing(ctx, cx, cy, r + 17, 8, progress, hsla(pal.accent), hsla(pal.accent2))
}

function drawMedalAvatar(ctx, art, cx, cy, r, metal) {
  ctx.save()
  ctx.shadowColor = hsla(metal.a, 0.55)
  ctx.shadowBlur = r * 0.4
  ctx.shadowOffsetY = 6
  ctx.beginPath()
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
  ctx.fillStyle = metalGrad(ctx, metal, cx - r, cy - r, cx + r, cy + r)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  drawCover(ctx, art, cx - r, cy - r, r * 2, r * 2)
  const gloss = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  gloss.addColorStop(0, 'rgba(255,255,255,0.2)')
  gloss.addColorStop(0.4, 'rgba(255,255,255,0)')
  gloss.addColorStop(1, 'rgba(0,0,0,0.22)')
  ctx.fillStyle = gloss
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.restore()

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(10,10,16,0.55)'
  ctx.stroke()
}

function drawCrown(ctx, cx, y0, w, h, metal) {
  const l = cx - w / 2
  const r = cx + w / 2
  ctx.save()
  ctx.shadowColor = hsla(metal.a, 0.7)
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.moveTo(l, y0)
  ctx.lineTo(l, y0 - h * 0.62)
  ctx.lineTo(cx - w * 0.25, y0 - h * 0.32)
  ctx.lineTo(cx, y0 - h)
  ctx.lineTo(cx + w * 0.25, y0 - h * 0.32)
  ctx.lineTo(r, y0 - h * 0.62)
  ctx.lineTo(r, y0)
  ctx.closePath()
  ctx.fillStyle = metalGrad(ctx, metal, l, y0 - h, r, y0)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  for (const [x, y] of [[l, y0 - h * 0.62], [cx, y0 - h], [r, y0 - h * 0.62]]) {
    ctx.beginPath()
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawPedestal(ctx, x, y, w, h, metal, digit) {
  roundRect(ctx, x, y, w, h, 18)
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, hsla(metal.a, 0.92))
  g.addColorStop(0.55, hsla(metal.b, 0.5))
  g.addColorStop(1, hsla(metal.b, 0.12))
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = hsla(metal.a, 0.55)
  ctx.stroke()

  ctx.save()
  roundRect(ctx, x, y, w, h, 18)
  ctx.clip()
  const sheen = ctx.createLinearGradient(x, 0, x + w, 0)
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)')
  sheen.addColorStop(0.4, 'rgba(255,255,255,0)')
  sheen.addColorStop(1, 'rgba(0,0,0,0.14)')
  ctx.fillStyle = sheen
  ctx.fillRect(x, y, w, h)
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(x + 18, y + 2, w - 36, 2)

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(10,10,16,0.62)'
  ctx.font = `bold 46px ${FONT}`
  ctx.fillText(digit, x + w / 2, y + 54)
}

function drawTopBar(ctx, pal, label, dateLabel) {
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  ctx.font = `bold 15px ${FONT}`
  ctx.fillText(dateLabel ? `CHROME BOT  ·  ${dateLabel}` : 'CHROME BOT', 1168, 114)

  ctx.textAlign = 'left'
  ctx.font = `bold 16px ${FONT}`
  const labelW = ctx.measureText(label).width
  drawPill(ctx, 96, 88, labelW + 64, 40, hsla(pal.accent, 0.16), hsla(pal.accent, 0.35))
  ctx.beginPath()
  ctx.arc(120, 108, 5.5, 0, Math.PI * 2)
  ctx.fillStyle = hsla(pal.accent)
  ctx.fill()
  ctx.fillText(label, 140, 114)
}

function chipsLeft(chips) {
  const cw = chips.length > 2 ? 138 : 150
  return 1168 - (cw * chips.length + 12 * (chips.length - 1))
}

function drawChips(ctx, chips, pal) {
  const cw = chips.length > 2 ? 138 : 150
  const x0 = chipsLeft(chips)
  chips.forEach((c, i) => {
    const bx = x0 + i * (cw + 12)
    drawPanel(ctx, bx, 132, cw, 80, 24)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = `bold 12px ${FONT}`
    ctx.fillText(c.label, bx + cw / 2, 160)
    ctx.fillStyle = c.accent ? hsla(pal.accent) : '#fff'
    ctx.fillText(fitFont(ctx, c.value, 'bold', 34, 20, cw - 20), bx + cw / 2, 198)
  })
}

async function renderRanking({ label, title, subtitle, dateLabel, bg, headArt, entries, chips }) {
  const pal = paletteOf(bg)
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')
  const ac = (a = 1) => hsla(pal.accent, a)
  const ac2 = (a = 1) => hsla(pal.accent2, a)

  drawBackground(ctx, bg, pal)
  ctx.drawImage(getGlassLayer(), 0, 0)
  drawTopBar(ctx, pal, label, dateLabel)

  const tx = headArt ? 196 : 96
  const maxW = chipsLeft(chips) - 24 - tx
  if (headArt) drawHeaderAvatar(ctx, headArt, 136, 188, 40, pal)

  ctx.textAlign = 'left'
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 4
  ctx.fillStyle = '#fff'
  ctx.fillText(fitFont(ctx, title, 'bold', 48, 26, maxW), tx, 186)
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(fitFont(ctx, subtitle, '600', 22, 14, Math.min(maxW, 400)), tx, 222)

  drawChips(ctx, chips, pal)

  const wide = entries.length <= 3
  const slotW = wide ? 300 : 200
  const areaX = wide ? 96 + (1088 - slotW * 3) / 2 : 96
  const SPEC = {
    1: { r: 72, cy: 356, top: 524 },
    2: { r: 58, cy: 398, top: 552 },
    3: { r: 54, cy: 424, top: 574 }
  }
  const midX = areaX + slotW * 1.5

  ctx.save()
  roundRect(ctx, 48, 48, 1184, 624, 48)
  ctx.clip()

  const glow = ctx.createRadialGradient(midX, 400, 10, midX, 400, 330)
  glow.addColorStop(0, hsla(MEDALS[0].a, 0.26))
  glow.addColorStop(0.5, hsla(MEDALS[0].a, 0.08))
  glow.addColorStop(1, hsla(MEDALS[0].a, 0))
  ctx.fillStyle = glow
  ctx.fillRect(midX - 340, 60, 680, 680)

  const rnd = seededRand(`${entries[0]?.name || 'x'}-spark`)
  for (let i = 0; i < 30; i++) {
    const sx = areaX - 6 + rnd() * (slotW * 3 + 12)
    const sy = 244 + rnd() * 260
    const sr = 2 + rnd() * 5
    ctx.globalAlpha = 0.25 + rnd() * 0.6
    ctx.fillStyle = hsla(MEDALS[i % 3].a)
    if (i % 3 === 0) {
      starPath(ctx, sx, sy, sr * 2, 4, 0.22)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(sx, sy, sr * 0.55, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()

  ;[2, 1, 3].forEach((rank, slot) => {
    const e = entries[rank - 1]
    if (!e) return
    const sp = SPEC[rank]
    const metal = MEDALS[rank - 1]
    const cx = areaX + slotW * slot + slotW / 2

    drawPedestal(ctx, cx - (slotW - 18) / 2, sp.top, slotW - 18, 640 - sp.top, metal, String(rank))
    drawMedalAvatar(ctx, e.art, cx, sp.cy, sp.r, metal)
    if (rank === 1) drawCrown(ctx, cx, sp.cy - sp.r - 12, 64, 38, metal)

    const ny = sp.cy + sp.r + 34
    ctx.textAlign = 'center'
    ctx.fillStyle = e.me ? ac() : '#fff'
    ctx.fillText(fitFont(ctx, e.name, 'bold', rank === 1 ? 28 : 24, 14, slotW - 24), cx, ny)

    const t = `${compact(e.count)} msg · ${e.pct}%`
    ctx.font = `bold ${rank === 1 ? 20 : 18}px ${FONT}`
    const pw = Math.min(slotW - 12, ctx.measureText(t).width + 36)
    drawPill(ctx, cx - pw / 2, ny + 12, pw, 34, hsla(metal.a, 0.16), hsla(metal.a, 0.45))
    ctx.fillStyle = hsla(metal.a)
    ctx.fillText(t, cx, ny + 35)
  })

  if (!wide) {
    const lx = 728, ly = 240, lw = 456, lh = 402
    drawPanel(ctx, lx, ly, lw, lh, 28)
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = `bold 13px ${FONT}`
    ctx.fillText(entries.length === 4 ? 'POSIZIONE 4' : `POSIZIONI 4 – ${entries.length}`, lx + 26, ly + 36)

    const top = entries[0].count || 1
    entries.slice(3).forEach((e, i) => {
      const y0 = ly + 52 + i * 47

      if (e.me) {
        roundRect(ctx, lx + 14, y0 - 3, lw - 28, 44, 14)
        ctx.fillStyle = ac(0.16)
        ctx.fill()
      } else if (i % 2 === 0) {
        roundRect(ctx, lx + 14, y0 - 3, lw - 28, 44, 14)
        ctx.fillStyle = 'rgba(255,255,255,0.045)'
        ctx.fill()
      }

      roundRect(ctx, lx + 24, y0 + 3, 30, 30, 10)
      ctx.fillStyle = 'rgba(255,255,255,0.09)'
      ctx.fill()
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = `bold 16px ${FONT}`
      ctx.fillText(String(e.rank), lx + 39, y0 + 24)

      drawCircleAvatar(ctx, e.art, lx + 82, y0 + 18, 17)

      ctx.textAlign = 'left'
      ctx.fillStyle = e.me ? ac() : '#fff'
      ctx.fillText(fitFont(ctx, e.name, 'bold', 19, 13, 200), lx + 112, y0 + 17)

      ctx.textAlign = 'right'
      ctx.fillStyle = ac()
      ctx.font = `bold 18px ${FONT}`
      ctx.fillText(compact(e.count), lx + lw - 28, y0 + 17)

      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.font = `bold 12px ${FONT}`
      ctx.fillText(`${e.pct}%`, lx + lw - 28, y0 + 35)

      const barW = 250
      roundRect(ctx, lx + 112, y0 + 26, barW, 7, 3.5)
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.fill()
      const bw = Math.max(7, (barW * e.count) / top)
      const bg2 = ctx.createLinearGradient(lx + 112, 0, lx + 112 + bw, 0)
      bg2.addColorStop(0, ac())
      bg2.addColorStop(1, ac2())
      roundRect(ctx, lx + 112, y0 + 26, bw, 7, 3.5)
      ctx.fillStyle = bg2
      ctx.fill()
    })
  }

  ctx.textAlign = 'left'
  return encodeImage(canvas)
}

async function memberRankingCard({ conn, chat, label, subtitle, agg, size }) {
  const shown = sortedUsers(agg.users).slice(0, size)

  const [group, pic, entries] = await Promise.all([
    groupInfoOf(conn, chat),
    getAvatar(conn, chat),
    Promise.all(shown.map(async ([jid, n], i) => {
      const [name, avatar] = await Promise.all([nameOf(conn, jid), getAvatar(conn, jid, 'preview')])
      return {
        rank: i + 1,
        name,
        count: n,
        pct: agg.total ? Math.round((n / agg.total) * 100) : 0,
        art: artOr(avatar, name, numOf(jid))
      }
    }))
  ])

  const headArt = artOr(pic, group.name, chat)
  const active = Object.values(agg.users).filter(v => v > 0).length

  return renderRanking({
    label,
    title: group.name,
    subtitle,
    dateLabel: dateLabelOf(todayStr()),
    bg: pic || entries[0].art,
    headArt,
    entries,
    chips: [
      { label: 'MESSAGGI', value: compact(agg.total) },
      { label: 'ATTIVI', value: String(active) }
    ]
  })
}

async function groupsRankingCard({ conn, label, subtitle, ranking, entries }) {
  const arts = await Promise.all(entries.map((e, i) => getAvatar(conn, e.chat, i < 3 ? 'image' : 'preview')))
  const full = entries.map((e, i) => ({ ...e, art: artOr(arts[i], e.name, e.chat) }))

  return renderRanking({
    label,
    title: 'Top gruppi',
    subtitle,
    dateLabel: dateLabelOf(todayStr()),
    bg: full[0].art,
    headArt: null,
    entries: full,
    chips: [
      { label: 'MESSAGGI', value: compact(ranking.sum) },
      { label: 'GRUPPI', value: String(ranking.list.length) }
    ]
  })
}

function drawTile(ctx, x, y, w, h, label, value, accent, pal) {
  drawPanel(ctx, x, y, w, h, 26)
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `bold 12px ${FONT}`
  ctx.fillText(label, x + w / 2, y + 32)
  ctx.fillStyle = accent ? hsla(pal.accent) : '#fff'
  ctx.fillText(fitFont(ctx, value, 'bold', 46, 22, w - 24), x + w / 2, y + 80)
}

async function renderGroupCard(o) {
  const pal = paletteOf(o.art)
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')
  const ac = (a = 1) => hsla(pal.accent, a)
  const ac2 = (a = 1) => hsla(pal.accent2, a)

  drawBackground(ctx, o.art, pal)
  ctx.drawImage(getGlassLayer(), 0, 0)
  drawTopBar(ctx, pal, 'STATISTICHE GRUPPO', o.dateLabel)

  const lcx = 246
  const ring = o.size > 0 ? o.active / o.size : 0
  drawRoundArt(ctx, o.art, lcx - 116, 176, 232, pal, Math.max(ring, o.active > 0 ? 0.03 : 0))

  ctx.textAlign = 'center'
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 3
  ctx.fillStyle = '#fff'
  ctx.fillText(fitFont(ctx, o.name, 'bold', 32, 18, 300), lcx, 470)
  ctx.restore()

  if (o.size > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = `600 18px ${FONT}`
    ctx.fillText(`${fmt(o.size)} membri`, lcx, 502)
  }

  const pillText = `${fmt(o.active)}${o.size > 0 ? `/${fmt(o.size)}` : ''} ATTIVI OGGI`
  ctx.font = `bold 16px ${FONT}`
  const pw = ctx.measureText(pillText).width + 56
  drawPill(ctx, lcx - pw / 2, 524, pw, 44, ac(0.16), ac(0.4))
  ctx.fillStyle = ac()
  ctx.fillText(pillText, lcx, 553)

  if (o.avg > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.font = `600 15px ${FONT}`
    ctx.fillText(fitText(ctx, `MEDIA ${fmt(Math.round(o.avg))} MSG AL GIORNO`, 300), lcx, 610)
  }

  const mx = 424, mw = 364, tw = 174
  drawTile(ctx, mx, 152, tw, 120, 'MESSAGGI OGGI', compact(o.today.total), true, pal)
  drawDelta(ctx, mx + tw / 2, 258, { delta: o.today.delta }, 'ieri', 'nessun dato di ieri')

  drawTile(ctx, mx + tw + 16, 152, tw, 120, 'MESSAGGI TOTALI', compact(o.total.total), false, pal)
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = `bold 14px ${FONT}`
  ctx.fillText(`${fmt(o.total.users)} utenti`, mx + tw + 16 + tw / 2, 258)

  const rankTiles = [
    { x: mx, label: 'RANK OGGI', r: o.rankDay },
    { x: mx + tw + 16, label: 'RANK TOTALE', r: o.rankTot }
  ]
  rankTiles.forEach(({ x, label, r }) => {
    drawTile(ctx, x, 288, tw, 120, label, r.rank ? `#${r.rank}` : '—', r.rank > 0 && r.rank <= 3, pal)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = `bold 14px ${FONT}`
    ctx.fillText(r.rank ? `tra ${fmt(r.of)} gruppi` : 'nessun messaggio', x + tw / 2, 394)
  })

  const gy = 428, gh = 212
  drawPanel(ctx, mx, gy, mw, gh, 28)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `bold 13px ${FONT}`
  ctx.fillText('TOP GRUPPI · OGGI', mx + 26, gy + 34)

  if (!o.topGroups.length) {
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = `600 16px ${FONT}`
    ctx.fillText('Nessun messaggio oggi', mx + mw / 2, gy + 120)
  }

  o.topGroups.forEach((g, i) => {
    const y0 = gy + 52 + i * 52
    if (g.me) {
      roundRect(ctx, mx + 12, y0 - 3, mw - 24, 46, 14)
      ctx.fillStyle = ac(0.16)
      ctx.fill()
    }
    roundRect(ctx, mx + 24, y0 + 6, 28, 28, 9)
    ctx.fillStyle = 'rgba(255,255,255,0.09)'
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.fillStyle = g.rank <= 3 ? hsla(MEDALS[g.rank - 1].a) : 'rgba(255,255,255,0.75)'
    ctx.font = `bold 15px ${FONT}`
    ctx.fillText(String(g.rank), mx + 38, y0 + 26)

    drawCircleAvatar(ctx, g.art, mx + 76, y0 + 20, 15)

    ctx.textAlign = 'left'
    ctx.fillStyle = g.me ? ac() : '#fff'
    ctx.fillText(fitFont(ctx, g.name, 'bold', 18, 12, 170), mx + 102, y0 + 26)

    ctx.textAlign = 'right'
    ctx.fillStyle = g.me ? ac() : 'rgba(255,255,255,0.75)'
    ctx.font = `bold 17px ${FONT}`
    ctx.fillText(compact(g.count), mx + mw - 24, y0 + 26)
  })

  const rx = 816, rw = 368, ry = 152, rh = 488
  drawPanel(ctx, rx, ry, rw, rh, 30)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = `bold 13px ${FONT}`
  ctx.fillText(`TOP 3 DEL GRUPPO · ${o.topLabel}`, rx + 26, ry + 36)

  if (!o.topUsers.length) {
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = `600 17px ${FONT}`
    ctx.fillText(`Nessun messaggio ${o.topWord}`, rx + rw / 2, ry + rh / 2)
  }

  const topCount = o.topUsers[0]?.count || 1
  o.topUsers.forEach((u, i) => {
    const y0 = ry + 56 + i * 142
    const metal = MEDALS[i]
    roundRect(ctx, rx + 14, y0, rw - 28, 130, 22)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = i === 0 ? hsla(metal.a, 0.5) : 'rgba(255,255,255,0.1)'
    ctx.stroke()

    const acx = rx + 74, acy = y0 + 65
    drawMedalAvatar(ctx, u.art, acx, acy, 38, metal)

    const bx = acx + 28, by = acy + 28
    ctx.beginPath()
    ctx.arc(bx, by, 14, 0, Math.PI * 2)
    ctx.fillStyle = metalGrad(ctx, metal, bx - 14, by - 14, bx + 14, by + 14)
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(10,10,16,0.8)'
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = '#0b0b10'
    ctx.font = `bold 16px ${FONT}`
    ctx.fillText(String(i + 1), bx, by + 6)

    const nx = rx + 130
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fff'
    ctx.fillText(fitFont(ctx, u.name, 'bold', 24, 14, rw - 130 - 26), nx, y0 + 52)

    ctx.fillStyle = hsla(metal.a)
    ctx.font = `bold 20px ${FONT}`
    ctx.fillText(`${compact(u.count)} msg`, nx, y0 + 84)
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = `bold 16px ${FONT}`
    ctx.fillText(`${u.pct}%`, rx + rw - 28, y0 + 84)

    const barW = rw - 130 - 28
    roundRect(ctx, nx, y0 + 98, barW, 8, 4)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fill()
    const bw = Math.max(8, (barW * u.count) / topCount)
    roundRect(ctx, nx, y0 + 98, bw, 8, 4)
    ctx.fillStyle = metalGrad(ctx, metal, nx, 0, nx + bw, 0)
    ctx.fill()
  })

  ctx.textAlign = 'left'
  return encodeImage(canvas)
}

async function groupOverview(conn, chat, period) {
  const today = todayStr()
  const yesterday = addDays(today, -1)
  const dayAgg = aggregate(chat, [today])
  const totAgg = totalsOf(chat)
  const topInfo = periodInfo(period, 3)
  const topAgg = aggFor(chat, topInfo)
  const topSorted = sortedUsers(topAgg.users).slice(0, 3)

  const [rankDayList, rankTotList, info, pic] = await Promise.all([
    rankGroups(conn, [today], chat),
    rankGroups(conn, null, chat),
    groupInfoOf(conn, chat),
    getAvatar(conn, chat)
  ])

  const rankDay = rankIn(rankDayList, chat)
  const rankTot = rankIn(rankTotList, chat)

  let topList = rankDayList.list.slice(0, 3).map((g, i) => ({ ...g, rank: i + 1 }))
  if (rankDay.rank > 3) topList = [...topList.slice(0, 2), { chat, count: dayAgg.total, rank: rankDay.rank }]

  const [groups, users] = await Promise.all([
    Promise.all(topList.map(async g => {
      const [gi, art] = await Promise.all([groupInfoOf(conn, g.chat), getAvatar(conn, g.chat, 'preview')])
      const name = mdSafe(gi.name)
      return { rank: g.rank, count: g.count, me: g.chat === chat, name, art: artOr(art, name, g.chat) }
    })),
    Promise.all(topSorted.map(async ([jid, n], i) => {
      const [name, avatar] = await Promise.all([nameOf(conn, jid), getAvatar(conn, jid)])
      return {
        jid,
        rank: i + 1,
        name,
        count: n,
        pct: topAgg.total ? Math.round((n / topAgg.total) * 100) : 0,
        art: artOr(avatar, name, numOf(jid))
      }
    }))
  ])

  let sum = 0
  let days = 0
  for (const day of Object.values(data.stats)) {
    const t = day[chat]?.total || 0
    if (t > 0) {
      sum += t
      days++
    }
  }

  const hasYesterday = Boolean(data.stats[yesterday]?.[chat])
  const dayActive = Object.values(dayAgg.users).filter(v => v > 0).length

  return {
    name: info.name,
    size: info.size,
    pic,
    active: dayActive,
    avg: days ? sum / days : 0,
    today: { total: dayAgg.total, delta: hasYesterday ? dayAgg.total - aggregate(chat, [yesterday]).total : null },
    total: { total: totAgg.total, users: Object.values(totAgg.users).filter(v => v > 0).length },
    rankDay,
    rankTot,
    ofDay: rankDayList.list.length,
    topGroups: groups,
    topUsers: users,
    topLabel: period === 'week' ? 'SETTIMANA' : period === 'total' ? 'TOTALE' : 'OGGI',
    topWord: PERIOD_WORDS[period]
  }
}

async function groupCardFrom(ov) {
  return renderGroupCard({
    art: artOr(ov.pic, ov.name, ov.name),
    name: ov.name,
    size: ov.size,
    active: ov.active,
    avg: ov.avg,
    today: ov.today,
    total: ov.total,
    rankDay: ov.rankDay,
    rankTot: ov.rankTot,
    topGroups: ov.topGroups,
    topUsers: ov.topUsers,
    topLabel: ov.topLabel,
    topWord: ov.topWord,
    dateLabel: dateLabelOf(todayStr())
  })
}

function groupOverviewText(ov) {
  const medals = ['🥇', '🥈', '🥉']
  const d = ov.today.delta
  const delta = d === null ? '' : ` _(${d > 0 ? '+' : ''}${fmt(d)} vs ieri)_`
  let text = `╭━━━「 🏘️ ${bold('STATISTICHE GRUPPO')} 」━━━╮\n┃ 🏷️ *${mdSafe(ov.name)}*\n┃ 📅 ${prettyDay(todayStr())}\n┃\n`
  text += `┃ 💬 *${bold('Oggi')}:* ${fmt(ov.today.total)} msg${delta}\n`
  text += `┃ 📈 *${bold('Totali')}:* ${fmt(ov.total.total)} msg\n`
  text += `┃ 👥 *${bold('Attivi oggi')}:* ${fmt(ov.active)}${ov.size ? `/${fmt(ov.size)}` : ''}\n`
  text += `┃ 🌍 *${bold('Rank oggi')}:* ${ov.rankDay.rank ? `#${ov.rankDay.rank} di ${ov.rankDay.of}` : '—'}\n`
  text += `┃ 🏅 *${bold('Rank totale')}:* ${ov.rankTot.rank ? `#${ov.rankTot.rank} di ${ov.rankTot.of}` : '—'}\n┃\n`
  if (ov.topUsers.length) {
    text += `┃ 🔝 *${bold(`Top 3 ${ov.topLabel}`)}*\n`
    ov.topUsers.forEach((u, i) => {
      text += `┃ ${medals[i]} @${numOf(u.jid)} — *${fmt(u.count)}* msg\n`
    })
    text += `┃\n`
  }
  text += `╰━━━━━━━━━━━━━━━━━━╯`
  return text
}


async function deliver(conn, chat, { card, text, mentions = [], buttons, quoted }) {
  const opts = quoted ? { quoted } : undefined

  if (card) {
    try {
      const image = await card()
      return await conn.sendMessage(chat, { image, caption: text, footer: FOOTER, buttons, mentions, headerType: 4 }, opts)
    } catch (err) {
      console.error('[CLASSIFICA] errore card:', err?.message || err)
    }
  }

  return conn.sendMessage(chat, { text, footer: FOOTER, buttons, mentions, headerType: 1 }, opts)
}

async function deliverRanking(conn, chat, o) {
  const { agg, size = 10, buttons, quoted, extra = '', short = false } = o

  const fullMessage = rankingMessage({ title: o.title, subtitle: o.subtitle, agg, size, short })
  if (!fullMessage) return false

  await deliver(conn, chat, {
    card: () => memberRankingCard({ conn, chat, label: o.label, subtitle: o.subtitle, agg, size }),
    text: fullMessage.text + extra,
    mentions: fullMessage.mentions,
    buttons,
    quoted
  })
  return true
}

async function announce(conn, chat, finishedDay, weekEnded, cfg) {
  if (cfg.day) {
    await deliverRanking(conn, chat, {
      label: 'FINE GIORNATA',
      title: `🌙 ${bold('CLASSIFICA FINALE')}`,
      subtitle: prettyDay(finishedDay),
      agg: aggregate(chat, [finishedDay]),
      size: 10,
      extra: `\n\n📅 ${bold('Nuova giornata, si riparte da zero!')}`,
      buttons: rankButtons('day'),
      short: true
    })
    await sleep(1500)
  }

  if (!weekEnded || !cfg.week) return
  const days = weekDates(finishedDay)
  await deliverRanking(conn, chat, {
    label: 'FINE SETTIMANA',
    title: `👑 ${bold('CLASSIFICA SETTIMANALE')}`,
    subtitle: `${shortDay(days[0])} – ${shortDay(days[6])}`,
    agg: aggregate(chat, days),
    size: 10,
    extra: `\n\n🗓️ ${bold('Nuova settimana, si riparte da zero!')}`,
    buttons: rankButtons('week'),
    short: true
  })
}

let ticking = false

async function tick() {
  if (ticking) return
  ticking = true
  try {
    const today = todayStr()
    if (today === data.lastDate) return

    const autoChats = Object.keys(data.auto).filter(c => {
      const cfg = autoCfg(c)
      return cfg.day || cfg.week
    })
    const conn = global.conn
    if (autoChats.length && (!conn?.sendMessage || !conn?.user)) return

    const finished = data.lastDate
    const weekEnded = weekStartOf(finished) !== weekStartOf(today)
    for (const chat of autoChats) {
      try {
        await announce(conn, chat, finished, weekEnded, autoCfg(chat))
      } catch (err) {
        console.error('[CLASSIFICA] annuncio fallito:', chat, err?.message || err)
      }
      await sleep(1500)
    }

    data.lastDate = today
    prune(today)
    dirty = true
    flush()
  } finally {
    ticking = false
  }
}

function boot() {
  global[STATE_KEY]?.stop?.()
  load()
  prune(todayStr())

  const state = {}
  state.flushTimer = setInterval(flush, FLUSH_MS)
  state.tickTimer = setInterval(() => tick().catch(err => console.error('[CLASSIFICA] tick fallito:', err?.message || err)), TICK_MS)
  state.first = setTimeout(() => tick().catch(() => {}), 15000)
  state.exit = () => flush()
  process.on('exit', state.exit)
  state.stop = () => {
    clearInterval(state.flushTimer)
    clearInterval(state.tickTimer)
    clearTimeout(state.first)
    process.off('exit', state.exit)
    flush()
  }
  state.flushTimer.unref?.()
  state.tickTimer.unref?.()
  state.first.unref?.()
  global[STATE_KEY] = state
}

boot()

function parseArgs(command, args) {
  const toks = args.map(a => String(a).toLowerCase())
  let period = command === 'classificasettimanale' ? 'week' : command === 'classificatotale' ? 'total' : 'day'
  let size = null

  for (const t of toks) {
    if (['oggi', 'giorno', 'giornaliera', 'today'].includes(t)) period = 'day'
    else if (['settimana', 'settimanale', 'week', 'sett'].includes(t)) period = 'week'
    else if (['totale', 'tot', 'all', 'sempre'].includes(t)) period = 'total'
    else if (['top10', '10', 'dieci'].includes(t)) size = 10
    else if (['top3', '3', 'top'].includes(t)) size = size || 3
  }

  if (!size) size = command === 'top' ? 3 : 10
  return { period, size, any: toks.length > 0 }
}

function parsePeriod(args, fallback) {
  for (const t of args.map(a => String(a).toLowerCase())) {
    if (['oggi', 'giorno', 'giornaliera', 'today'].includes(t)) return 'day'
    if (['settimana', 'settimanale', 'week', 'sett'].includes(t)) return 'week'
    if (['totale', 'tot', 'all', 'sempre'].includes(t)) return 'total'
  }
  return fallback
}

const onOff = v => (['on', 'attiva', 'attivo'].includes(v) ? true : ['off', 'disattiva', 'disattivo'].includes(v) ? false : null)

export default {
  command: ['top10', 'top', 'classifica', 'classificagiornaliera', 'classificasettimanale', 'classificatotale', 'resetclassifica', 'classificaauto', ...GROUP_COMMANDS],
  category: 'Group',

  async execute(m, { conn, command, args = [], mentionedJid = [], isAdmin, isWhitelisted, isOwner, isROwner }) {
    const P = global.prefissoComandi || '.'
    const reply = text => conn.sendMessage(m.chat, { text }, { quoted: m })
    const cmd = String(command || '').toLowerCase()
    const isBotOwner = Boolean(isOwner || isROwner)
    const scope = String(args[0] || '').toLowerCase()
    const globalReset = cmd === 'resetclassifica' && ['globale', 'global'].includes(scope)
    const groupsOnly = ['topgruppi', 'topgruppo', 'top10gruppi', 'top10gruppo'].includes(cmd)

    if (!m.isGroup && !globalReset && !groupsOnly) return reply('❌ Questo comando funziona solo nei gruppi!')

    if (groupsOnly) {
      const size = cmd.startsWith('top10') ? 10 : 3
      const period = parsePeriod(args, 'day')
      const info = periodInfo(period, size, 'GRUPPI')
      const ranking = await rankGroups(conn, info.dates, m.isGroup ? m.chat : null)

      if (!ranking.list.length) return reply(`📊 *${bold('Nessun messaggio')}* ${PERIOD_WORDS[period]} nei gruppi.`)

      const entries = await groupEntries(conn, ranking, size, m.chat)
      const text = `🏘️ *${bold(`TOP ${size} GRUPPI`)}* · ${info.subtitle}`

      return deliver(conn, m.chat, {
        card: () => groupsRankingCard({ conn, label: info.label, subtitle: info.subtitle, ranking, entries }),
        text,
        buttons: groupRankButtons(period, size),
        quoted: m
      })
    }

    if (cmd === 'gruppo') {
      const period = parsePeriod(args, 'day')
      if (!totalsOf(m.chat).total) return reply(`📊 *${bold('Nessun messaggio')}* registrato in questo gruppo.`)

      const ov = await groupOverview(conn, m.chat, period)

      return deliver(conn, m.chat, {
        card: () => groupCardFrom(ov),
        text: groupOverviewText(ov),
        mentions: ov.topUsers.map(u => u.jid),
        buttons: groupButtons(),
        quoted: m
      })
    }

    if (cmd === 'resetclassifica') {
      if (globalReset) {
        if (!isBotOwner) return reply('⛔ *Il reset globale è riservato agli owner del bot.*')
        if (String(args[1] || '').toLowerCase() !== 'conferma') {
          return reply(`⚠️ *Stai per cancellare i messaggi di TUTTI i gruppi.*\nPer confermare: ${P}resetclassifica globale conferma`)
        }
        const { chats, removed } = resetAll()
        return reply(`🧹 *Reset globale completato*\n👥 Gruppi: ${fmt(chats)}\n💬 Messaggi azzerati: ${fmt(removed)}`)
      }

      if (!isWhitelisted) return reply('⛔ *Comando riservato agli utenti in whitelist e agli owner del bot.*')

      if (['oggi', 'giorno'].includes(scope)) {
        return reply(`🧹 *Statistiche di oggi azzerate* (${fmt(resetChat(m.chat, 'day'))} messaggi)`)
      }
      if (['settimana', 'week'].includes(scope)) {
        return reply(`🧹 *Statistiche della settimana azzerate* (${fmt(resetChat(m.chat, 'week'))} messaggi)`)
      }
      if (['tutto', 'all'].includes(scope)) {
        if (String(args[1] || '').toLowerCase() !== 'conferma') {
          return reply(`⚠️ *Stai per cancellare tutte le statistiche del gruppo.*\nPer confermare: ${P}resetclassifica tutto conferma`)
        }
        return reply(`🧹 *Tutte le statistiche del gruppo azzerate* (${fmt(resetChat(m.chat, 'all'))} messaggi)`)
      }
      return reply(`❌ *Uso:* ${P}resetclassifica oggi|settimana|tutto${isBotOwner ? '|globale' : ''}`)
    }

    if (cmd === 'classificaauto') {
      const periodArg = ['giorno', 'giornaliero', 'day'].includes(scope) ? 'day'
        : ['settimana', 'settimanale', 'week'].includes(scope) ? 'week' : null
      const value = onOff(String(periodArg ? args[1] : args[0] || '').toLowerCase())

      if (value === null) {
        const cfg = autoCfg(m.chat)
        const st = v => (v ? '🟢 attivo' : '🔴 disattivo')
        return reply(
          `⚙️ *${bold('Annuncio automatico')}*\n\n` +
          `📅 Fine giornata: ${st(cfg.day)}\n` +
          `🗓️ Fine settimana: ${st(cfg.week)}\n\n` +
          `A mezzanotte il bot pubblica la classifica finale e il conteggio riparte da zero ` +
          `(il totale non si azzera mai da solo).\n\n` +
          `${P}classificaauto on|off\n` +
          `${P}classificaauto giorno on|off\n` +
          `${P}classificaauto settimana on|off`
        )
      }

      if (!isAdmin && !isWhitelisted) return reply('⛔ *Comando riservato agli admin del gruppo.*')

      const patch = periodArg ? { [periodArg]: value } : { day: value, week: value }
      const cfg = setAuto(m.chat, patch)
      const what = periodArg === 'day' ? 'fine giornata' : periodArg === 'week' ? 'fine settimana' : 'giornaliero e settimanale'
      return reply(
        `${value ? '🟢' : '🔴'} *Annuncio ${what} ${value ? 'attivato' : 'disattivato'}*\n\n` +
        `📅 Fine giornata: ${cfg.day ? '🟢' : '🔴'}\n🗓️ Fine settimana: ${cfg.week ? '🟢' : '🔴'}`
      )
    }

    const parsed = parseArgs(cmd, args)
    const info = periodInfo(parsed.period, parsed.size)
    const agg = aggFor(m.chat, info)

    if (!sortedUsers(agg.users).length) {
      return reply(`📊 *${bold('Nessun messaggio')}* ${PERIOD_WORDS[parsed.period]} in questo gruppo.`)
    }

    return deliverRanking(conn, m.chat, {
      label: info.label,
      title: info.title,
      subtitle: info.subtitle,
      agg,
      size: parsed.size,
      buttons: rankButtons(parsed.period),
      quoted: m,
      short: true
    })
  },

  async before(m) {
    const isGroup = m.isGroup ?? String(m.chat || '').endsWith('@g.us')
    if (!isGroup || !m.sender || m.fromMe) return false

    if (m.messageStubType) return false
    if (Object.keys(m.message || {}).some(k => NOT_MESSAGES.includes(k))) return false

    const key = canon(m.sender)

    const b = ensureDay(todayStr(), m.chat)
    b.users[key] = (b.users[key] || 0) + 1
    b.total += 1

    const t = ensureTotals(m.chat)
    t.users[key] = (t.users[key] || 0) + 1
    t.total += 1

    const pn = typeof m.pushName === 'string' ? m.pushName.trim().slice(0, 40) : ''
    if (pn && data.names[key] !== pn) data.names[key] = pn

    dirty = true
    return false
  }
}
