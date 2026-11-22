import yts from 'yt-search'

const API = 'https://api.chatunity.it/download/play'
const MAX_SECONDS = 20 * 60
const MAX_BYTES = 90 * 1024 * 1024
const API_TIMEOUT_MS = 2 * 60 * 1000
const CACHE_TTL = 5 * 60 * 1000

const ID_RE = /^[\w-]{11}$/
const YT_URL_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/i
const busy = new Set()
const videoCache = new Map()
const fileCache = new Map()

const prefix = () => global.prefissoComandi || '.'

function cached(map, key, make) {
    const hit = map.get(key)
    if (hit && Date.now() - hit.t < CACHE_TTL) return hit.p
    const p = make()
    const entry = { p, t: Date.now() }
    map.set(key, entry)
    const drop = () => { if (map.get(key) === entry) map.delete(key) }
    p.then(v => { if (!v) drop() }, drop)
    if (map.size > 100) map.delete(map.keys().next().value)
    return p
}

function fmtDuration(sec = 0) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
    const pad = (n) => String(n).padStart(2, '0')
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

const safeName = (s = 'file') => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file'

async function getVideo(input) {
    const id = input.match(YT_URL_RE)?.[1] || (ID_RE.test(input) ? input : null)
    if (id) return cached(videoCache, id, () => yts({ videoId: id }).catch(() => null))
    const res = await yts(input)
    const video = res.videos?.[0] || null
    if (video) videoCache.set(video.videoId, { p: Promise.resolve(video), t: Date.now() })
    return video
}

async function fetchFromApi(id, kind) {
    const query = encodeURIComponent(`https://youtube.com/watch?v=${id}`)
    const format = kind === 'audio' ? 'mp3' : 'mp4'
    const res = await fetch(`${API}?query=${query}&format=${format}`, {
        signal: AbortSignal.timeout(API_TIMEOUT_MS)
    })
    const data = await res.json().catch(() => null)
    if (!data?.success || !data.downloadUrl) {
        throw new Error(data?.error || data?.message || `API HTTP ${res.status}`)
    }
    if (Number(data.fileSize || 0) > MAX_BYTES) {
        throw Object.assign(new Error('Troppo grande'), { tooBig: true })
    }
    return data
}

const getFile = (id, kind) => cached(fileCache, `${id}:${kind}`, () => fetchFromApi(id, kind))

export default {
    command: ['play', 'playaudio', 'playvideo'],
    desc: 'Cerca una canzone su YouTube e scaricala in audio o video',
    category: 'Music',

    async execute(m, extra) {
        const conn = extra?.conn || global.conn
        const chat = m.chat
        const text = (extra.text || '').trim()
        const command = extra.command || ''
        const reply = (t) => conn.sendMessage(chat, { text: t }, { quoted: m })

        if (command === 'play') {
            if (!text) return reply(`❌ Usa: ${prefix()}play <titolo o link YouTube>\nEsempio: ${prefix()}play Lazza Cenere`)

            const video = await getVideo(text)
            if (!video) return reply('❌ Nessun risultato trovato.')

            const id = video.videoId
            const seconds = video.seconds ?? video.duration?.seconds ?? 0
            if (seconds && seconds <= MAX_SECONDS) getFile(id, 'audio').catch(() => {})

            const caption =
                `🎵 *${video.title}*\n\n` +
                `🎤 ${video.author?.name || 'Sconosciuto'}\n` +
                `⏱️ ${fmtDuration(seconds)}\n` +
                `👁️ ${Number(video.views || 0).toLocaleString('it-IT')} visualizzazioni\n\n` +
                `Scegli il formato:`

            const buttons = [
                { buttonId: `${prefix()}playaudio ${id}`, buttonText: { displayText: '🎧 Audio' }, type: 1 },
                { buttonId: `${prefix()}playvideo ${id}`, buttonText: { displayText: '🎬 Video' }, type: 1 }
            ]

            const thumb = video.image || video.thumbnail
            try {
                await conn.sendMessage(chat, {
                    image: { url: thumb },
                    caption,
                    footer: 'chrome bot',
                    buttons,
                    headerType: 4
                }, { quoted: m })
            } catch {
                await conn.sendMessage(chat, { text: caption, footer: 'YouTube', buttons, headerType: 1 }, { quoted: m })
            }
            return
        }

        const kind = command === 'playaudio' ? 'audio' : 'video'
        const id = text.match(YT_URL_RE)?.[1] || (ID_RE.test(text) ? text : null)
        if (!id) return reply(`❌ Usa prima ${prefix()}play <canzone> e poi scegli Audio o Video.`)

        const lockKey = `${chat}:${id}:${kind}`
        if (busy.has(lockKey)) return reply('⏳ Download già in corso, attendi...')
        busy.add(lockKey)

        try {
            const ready = fileCache.has(`${id}:${kind}`)
            const filePromise = getFile(id, kind)
            filePromise.catch(() => {})

            if (!ready) reply(`⏳ Scarico ${kind === 'audio' ? 'l\'audio' : 'il video'}...`).catch(() => {})

            const [video, data] = await Promise.all([getVideo(id), filePromise])

            const seconds = video?.seconds ?? video?.duration?.seconds ?? 0
            if (seconds > MAX_SECONDS) {
                return reply(`❌ Il video dura troppo (${fmtDuration(seconds)}). Massimo ${fmtDuration(MAX_SECONDS)}.`)
            }

            const title = video?.title || 'file'
            const fileName = `${safeName(title)}.${kind === 'audio' ? 'mp3' : 'mp4'}`

            if (kind === 'audio') {
                await conn.sendMessage(chat, {
                    audio: { url: data.downloadUrl },
                    mimetype: 'audio/mpeg',
                    fileName
                }, { quoted: m })
            } else {
                await conn.sendMessage(chat, {
                    video: { url: data.downloadUrl },
                    mimetype: 'video/mp4',
                    fileName,
                    caption: `🎬 ${title}`
                }, { quoted: m })
            }
        } catch (err) {
            console.error('Errore play:', err.message)
            let msg = '❌ Errore durante il download, riprova tra poco.'
            if (err.tooBig) msg = '❌ File troppo grande per essere inviato.'
            else if (err.name === 'TimeoutError') msg = '❌ L\'API ha impiegato troppo, riprova.'
            await reply(msg)
        } finally {
            busy.delete(lockKey)
        }
    }
}