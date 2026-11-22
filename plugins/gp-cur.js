import fetch from 'node-fetch'
import path from 'path'
import { fileURLToPath } from 'url'
import yts from 'yt-search'
import fs from 'fs'
import { createCanvas, loadImage, registerFont } from 'canvas'

const FONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'fonts')
for (const [file, weight] of [['font.ttf', 'normal'], ['font-bold.ttf', 'bold']]) {
    const fp = path.join(FONT_DIR, file)
    try { if (fs.existsSync(fp)) registerFont(fp, { family: 'CardFont', weight }) } catch (e) { console.error('Font non valido:', file, e.message) }
}

const W = 1000
const H = 600

function drawImageCover(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height
    const boxRatio = w / h
    let sx, sy, sw, sh
    if (imgRatio > boxRatio) {
        sh = img.height
        sw = sh * boxRatio
        sx = (img.width - sw) / 2
        sy = 0
    } else {
        sw = img.width
        sh = sw / boxRatio
        sx = 0
        sy = (img.height - sh) / 2
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function roundRect(ctx, x, y, w, h, r) {
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

function fitFont(ctx, text, weight, startSize, minSize, maxWidth, family = 'CardFont, sans-serif') {
    let size = startSize
    while (size > minSize) {
        ctx.font = `${weight} ${size}px ${family}`
        if (ctx.measureText(text).width <= maxWidth) return text
        size -= 2
    }
    ctx.font = `${weight} ${minSize}px ${family}`
    return fitText(ctx, text, maxWidth)
}

function accentFromImage(img) {
    const c = createCanvas(8, 8)
    const x = c.getContext('2d')
    x.drawImage(img, 0, 0, 8, 8)
    const d = x.getImageData(0, 0, 8, 8).data
    let r = 0, g = 0, b = 0, n = 0
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
    r /= n * 255; g /= n * 255; b /= n * 255

    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0
    if (max !== min) {
        const dl = max - min
        if (max === r) h = ((g - b) / dl) % 6
        else if (max === g) h = (b - r) / dl + 2
        else h = (r - g) / dl + 4
        h *= 60
        if (h < 0) h += 360
    }

    return `hsl(${Math.round(h)}, 75%, 62%)`
}

function drawBlurBackground(ctx, img) {
    if (!img) {
        const g = ctx.createLinearGradient(0, 0, W, H)
        g.addColorStop(0, '#1b1b22')
        g.addColorStop(1, '#0b0b0f')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
        return
    }

    const small = createCanvas(32, 20)
    small.getContext('2d').drawImage(img, 0, 0, 32, 20)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(small, -60, -40, W + 120, H + 80)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, W, H)
}

function drawPlaceholderCover(ctx, x, y, s, accent) {
    const g = ctx.createLinearGradient(x, y, x + s, y + s)
    g.addColorStop(0, '#2a2a33')
    g.addColorStop(1, '#14141a')
    ctx.fillStyle = g
    ctx.fillRect(x, y, s, s)

    const cx = x + s / 2, cy = y + s / 2, u = s / 10
    ctx.fillStyle = accent
    ctx.strokeStyle = accent
    ctx.lineWidth = u * 0.7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.ellipse(cx - u * 1.4, cy + u * 1.8, u * 1.5, u * 1.1, -0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx - u * 0.1, cy + u * 1.4)
    ctx.lineTo(cx - u * 0.1, cy - u * 2.6)
    ctx.lineTo(cx + u * 2.4, cy - u * 1.6)
    ctx.stroke()
}

function seededBars(seed, count) {
    let h = 0
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    const out = []
    for (let i = 0; i < count; i++) {
        h = (h * 1664525 + 1013904223) >>> 0
        out.push(0.25 + (h % 1000) / 1000 * 0.75)
    }
    return out
}

const fmt = (n) => Number(n || 0).toLocaleString('it-IT')

async function generateCurCard(o) {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    let cover = null
    if (o.cover) {
        try { cover = await loadImage(o.cover) } catch { cover = null }
    }
    const accent = cover ? accentFromImage(cover) : 'hsl(150, 70%, 55%)'

    drawBlurBackground(ctx, cover)
    const glow = ctx.createRadialGradient(250, 300, 20, 250, 300, 520)
    glow.addColorStop(0, accent.replace('hsl(', 'hsla(').replace(')', ', 0.22)'))
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    const cx = 50, cy = 50, cw = 900, ch = 500
    roundRect(ctx, cx, cy, cw, ch, 40)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.stroke()

    const S = 340
    const px = 95, py = 130
    ctx.save()
    ctx.shadowColor = accent.replace('hsl(', 'hsla(').replace(')', ', 0.55)')
    ctx.shadowBlur = 50
    ctx.shadowOffsetY = 14
    roundRect(ctx, px, py, S, S, 30)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()

    ctx.save()
    roundRect(ctx, px, py, S, S, 30)
    ctx.clip()
    if (cover) drawImageCover(ctx, cover, px, py, S, S)
    else drawPlaceholderCover(ctx, px, py, S, accent)
    ctx.restore()

    const tx = 475
    const tw = 430

    const label = o.nowPlaying ? 'IN RIPRODUZIONE' : 'ULTIMO BRANO'
    ctx.font = 'bold 15px CardFont, sans-serif'
    const labelW = ctx.measureText(label).width
    const badgeW = labelW + 56
    roundRect(ctx, tx, 125, badgeW, 34, 17)
    ctx.fillStyle = accent.replace('hsl(', 'hsla(').replace(')', ', 0.16)')
    ctx.fill()
    ctx.beginPath()
    ctx.arc(tx + 20, 142, 5, 0, Math.PI * 2)
    ctx.fillStyle = accent
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillText(label, tx + 36, 148)

    ctx.fillStyle = '#fff'
    const title = fitFont(ctx, o.title || 'Brano sconosciuto', 'bold', 56, 30, tw)
    ctx.fillText(title, tx, 228)

    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    const artist = fitFont(ctx, o.artist || 'Artista sconosciuto', '600', 30, 20, tw)
    ctx.fillText(artist, tx, 272)

    if (o.album) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        const album = fitFont(ctx, o.album, 'normal', 21, 15, tw)
        ctx.fillText(album, tx, 305)
    }

    const sy = 345
    roundRect(ctx, tx, sy, tw, 100, 22)
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'
    ctx.stroke()

    const stats = [
        ['TUOI ASCOLTI', fmt(o.userPlays)],
        ['GLOBALI', fmt(o.globalPlays)],
        ['TOTALI', fmt(o.totalPlays)]
    ]
    const colW = tw / stats.length
    stats.forEach(([lab, val], i) => {
        const x = tx + colW * i + colW / 2
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.font = 'bold 13px CardFont, sans-serif'
        ctx.fillText(lab, x, sy + 36)
        ctx.fillStyle = '#fff'
        fitFont(ctx, val, 'bold', 34, 20, colW - 20)
        ctx.fillText(val, x, sy + 76)
        if (i > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.12)'
            ctx.fillRect(tx + colW * i - 0.75, sy + 22, 1.5, 56)
        }
    })
    ctx.textAlign = 'left'

    const fy = 465
    ctx.font = 'bold 20px CardFont, sans-serif'
    const uname = '@' + (o.username || 'utente')
    const unameW = ctx.measureText(uname).width
    roundRect(ctx, tx, fy, unameW + 32, 40, 20)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fill()
    ctx.fillStyle = accent
    ctx.fillText(uname, tx + 16, fy + 27)

    let nextX = tx + unameW + 32 + 12
    if (typeof o.likes === 'number') {
        const likeTxt = `${fmt(o.likes)} like`
        ctx.font = 'bold 18px CardFont, sans-serif'
        const lw = ctx.measureText(likeTxt).width
        roundRect(ctx, nextX, fy, lw + 32, 40, 20)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillText(likeTxt, nextX + 16, fy + 26)
        nextX += lw + 32 + 12
    }

    const bars = seededBars(`${o.title}${o.artist}`, 7)
    const bw = 6, gap = 5
    const eqW = bars.length * bw + (bars.length - 1) * gap
    const ex = tx + tw - eqW
    ctx.fillStyle = accent
    bars.forEach((v, i) => {
        const h = o.nowPlaying ? 8 + v * 28 : 8
        roundRect(ctx, ex + i * (bw + gap), fy + 38 - h, bw, h, 3)
        ctx.fill()
    })

    return canvas.toBuffer('image/png')
}

const PERIOD_LABELS = { '7day': '7 GIORNI', '1month': '1 MESE', '3month': '3 MESI', '6month': '6 MESI', '12month': '12 MESI', overall: 'OVERALL' }
const KIND_LABELS = { artists: 'TOP ARTISTI', albums: 'TOP ALBUM', tracks: 'TOP TRACCE' }

function primaryArtist(s = '') {
    return s
        .split(/\s*(?:,|&|\bx\b|\bvs\.?\b|\bfeat\.?\b|\bft\.?\b|\bwith\b)\s*/i)[0]
        .trim() || s
}

function cleanQuery(s = '') {
    return s
        .replace(/[\(\[][^\)\]]*(feat|ft\.|with|prod)[^\)\]]*[\)\]]/gi, '')
        .replace(/\s+(feat\.?|ft\.?|featuring)\s+.*$/i, '')
        .replace(/\s+-\s+.*$/, '')
        .replace(/\s+/g, ' ')
        .trim()
}

async function lfm(method, params) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=${method}&api_key=${LASTFM_API_KEY}&format=json&${params}`
    return fetchWithCache(url, 3600000)
}

const enc = encodeURIComponent

async function deezerSearch(type, query, limit = 5) {
    const url = `https://api.deezer.com/search/${type}?q=${enc(query)}&limit=${limit}`
    const data = await fetchWithCache(url, 3600000)
    return data?.data || []
}

async function artistCoverFromLastfm(artist) {
    const name = primaryArtist(artist)

    const deezerResults = await deezerSearch('artist', name, 1)
    const pic = deezerResults[0]?.picture_xl || deezerResults[0]?.picture_big
    if (pic) return pic

    return null
}

async function albumCoverFromLastfm(artist, album) {
    const query = artist ? `${primaryArtist(artist)} ${album}` : cleanQuery(album)

    const deezerResults = await deezerSearch('album', query, 5)
    const deezerHit = deezerResults.find(r => !artist || r.artist?.name?.toLowerCase().includes(primaryArtist(artist).toLowerCase())) || deezerResults[0]
    const deezerArt = deezerHit?.cover_xl || deezerHit?.cover_big
    if (deezerArt) return deezerArt

    return null
}

async function trackCoverFromLastfm(artist, track) {
    const query = artist ? `${primaryArtist(artist)} ${cleanQuery(track)}` : cleanQuery(track)

    const deezerResults = await deezerSearch('track', query, 5)
    const deezerHit = deezerResults.find(r => !artist || r.artist?.name?.toLowerCase().includes(primaryArtist(artist).toLowerCase())) || deezerResults[0]
    const deezerArt = deezerHit?.album?.cover_xl || deezerHit?.album?.cover_big
    if (deezerArt) return deezerArt

    return artist ? artistCoverFromLastfm(artist) : null
}

async function resolveImage(kind, item) {
    if (kind === 'artists') return artistCoverFromLastfm(item.name)
    if (kind === 'albums') return albumCoverFromLastfm(item.sub, item.name)
    return trackCoverFromLastfm(item.sub, item.name)
}

async function resolveTopCover(kind, items) {
    for (const item of items.slice(0, 3)) {
        const url = await resolveImage(kind, item)
        if (url) return url
    }
    return null
}

async function generateTopCard(o) {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    let cover = null
    if (o.cover) { try { cover = await loadImage(o.cover) } catch { cover = null } }
    const accent = cover ? accentFromImage(cover) : 'hsl(150, 70%, 55%)'
    const alpha = (a) => accent.replace('hsl(', 'hsla(').replace(')', `, ${a})`)

    drawBlurBackground(ctx, cover)
    const glow = ctx.createRadialGradient(250, 300, 20, 250, 300, 520)
    glow.addColorStop(0, alpha(0.22))
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    roundRect(ctx, 50, 50, 900, 500, 40)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.stroke()

    const S = 300, px = 95, py = 125
    ctx.save()
    ctx.shadowColor = alpha(0.55)
    ctx.shadowBlur = 45
    ctx.shadowOffsetY = 12
    roundRect(ctx, px, py, S, S, 28)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()
    ctx.save()
    roundRect(ctx, px, py, S, S, 28)
    ctx.clip()
    if (cover) drawImageCover(ctx, cover, px, py, S, S)
    else drawPlaceholderCover(ctx, px, py, S, accent)
    ctx.restore()

    const first = o.items[0]
    ctx.fillStyle = accent
    ctx.font = 'bold 14px CardFont, sans-serif'
    ctx.fillText('N°1', px, 465)
    ctx.fillStyle = '#fff'
    fitFont(ctx, first.name, 'bold', 28, 18, S)
    ctx.fillText(fitText(ctx, first.name, S), px, 495)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '600 17px CardFont, sans-serif'
    ctx.fillText(`${fmt(first.plays)} ascolti`, px, 522)

    const tx = 455, tw = 450
    const label = `${KIND_LABELS[o.kind]} · ${PERIOD_LABELS[o.period] || o.period.toUpperCase()}`
    ctx.font = 'bold 15px CardFont, sans-serif'
    const badgeW = ctx.measureText(label).width + 56
    roundRect(ctx, tx, 100, badgeW, 34, 17)
    ctx.fillStyle = alpha(0.16)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(tx + 20, 117, 5, 0, Math.PI * 2)
    ctx.fillStyle = accent
    ctx.fill()
    ctx.fillText(label, tx + 36, 123)

    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = 'bold 16px CardFont, sans-serif'
    ctx.fillText('@' + o.username, tx + tw, 123)
    ctx.textAlign = 'left'

    const rows = o.items.slice(0, 9)
    const maxPlays = Math.max(...rows.map(r => r.plays), 1)
    const startY = 152, rh = 40

    rows.forEach((r, i) => {
        const y = startY + i * rh

        const ratio = Math.max(0.28, r.plays / maxPlays)
        roundRect(ctx, tx, y, tw * ratio, rh - 6, 13)
        ctx.fillStyle = i === 0 ? alpha(0.30) : 'rgba(255,255,255,0.07)'
        ctx.fill()

        ctx.textBaseline = 'middle'
        const cy = y + (rh - 6) / 2

        ctx.fillStyle = i === 0 ? accent : 'rgba(255,255,255,0.45)'
        ctx.font = 'bold 16px CardFont, sans-serif'
        ctx.fillText(String(i + 1), tx + 16, cy)

        ctx.textAlign = 'right'
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 16px CardFont, sans-serif'
        const playsTxt = fmt(r.plays)
        ctx.fillText(playsTxt, tx + tw - 14, cy)
        const playsW = ctx.measureText(playsTxt).width
        ctx.textAlign = 'left'

        const nameX = tx + 46
        const maxW = tw - 46 - 14 - playsW - 16
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 18px CardFont, sans-serif'
        if (r.sub) {
            const name = fitText(ctx, r.name, maxW * 0.62)
            ctx.fillText(name, nameX, cy)
            const nw = ctx.measureText(name).width
            ctx.fillStyle = 'rgba(255,255,255,0.5)'
            ctx.font = '15px CardFont, sans-serif'
            ctx.fillText(fitText(ctx, r.sub, maxW - nw - 10), nameX + nw + 10, cy)
        } else {
            ctx.fillText(fitText(ctx, r.name, maxW), nameX, cy)
        }
        ctx.textBaseline = 'alphabetic'
    })

    return canvas.toBuffer('image/png')
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']
const RANKING_LABELS = { artist: 'CLASSIFICA ARTISTA', album: 'CLASSIFICA ALBUM', track: 'CLASSIFICA CANZONE' }

async function generateRankingCard(o) {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    let cover = null
    if (o.cover) { try { cover = await loadImage(o.cover) } catch { cover = null } }
    const accent = cover ? accentFromImage(cover) : 'hsl(150, 70%, 55%)'
    const alpha = (a) => accent.replace('hsl(', 'hsla(').replace(')', `, ${a})`)

    drawBlurBackground(ctx, cover)
    const glow = ctx.createRadialGradient(250, 300, 20, 250, 300, 520)
    glow.addColorStop(0, alpha(0.22))
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    roundRect(ctx, 50, 50, 900, 500, 40)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.stroke()

    const S = 300, px = 95, py = 125
    ctx.save()
    ctx.shadowColor = alpha(0.55)
    ctx.shadowBlur = 45
    ctx.shadowOffsetY = 12
    roundRect(ctx, px, py, S, S, 28)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()
    ctx.save()
    roundRect(ctx, px, py, S, S, 28)
    ctx.clip()
    if (cover) drawImageCover(ctx, cover, px, py, S, S)
    else drawPlaceholderCover(ctx, px, py, S, accent)
    ctx.restore()

    ctx.fillStyle = accent
    ctx.font = 'bold 14px CardFont, sans-serif'
    ctx.fillText('RICERCA', px, 465)
    ctx.fillStyle = '#fff'
    fitFont(ctx, o.query, 'bold', 28, 18, S)
    ctx.fillText(fitText(ctx, o.query, S), px, 495)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '600 17px CardFont, sans-serif'
    ctx.fillText(`${o.rows.length} utenti a confronto`, px, 522)

    const tx = 455, tw = 450
    const label = RANKING_LABELS[o.kind] || 'CLASSIFICA'
    ctx.font = 'bold 15px CardFont, sans-serif'
    const badgeW = ctx.measureText(label).width + 56
    roundRect(ctx, tx, 100, badgeW, 34, 17)
    ctx.fillStyle = alpha(0.16)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(tx + 20, 117, 5, 0, Math.PI * 2)
    ctx.fillStyle = accent
    ctx.fill()
    ctx.fillText(label, tx + 36, 123)

    const rows = o.rows.slice(0, 10)
    const maxPlays = Math.max(...rows.map(r => r.plays), 1)
    const startY = 152, rh = 36

    rows.forEach((r, i) => {
        const y = startY + i * rh
        const medalColor = MEDAL_COLORS[i] || null

        const ratio = Math.max(0.28, r.plays / maxPlays)
        roundRect(ctx, tx, y, tw * ratio, rh - 6, 12)
        ctx.fillStyle = medalColor ? medalColor.replace('#', 'rgba(').concat('') : 'rgba(255,255,255,0.07)'
        if (medalColor) {
            const hex = medalColor
            const r2 = parseInt(hex.slice(1, 3), 16), g2 = parseInt(hex.slice(3, 5), 16), b2 = parseInt(hex.slice(5, 7), 16)
            ctx.fillStyle = `rgba(${r2}, ${g2}, ${b2}, 0.25)`
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.07)'
        }
        ctx.fill()

        ctx.textBaseline = 'middle'
        const cy = y + (rh - 6) / 2

        ctx.fillStyle = medalColor || 'rgba(255,255,255,0.45)'
        ctx.font = 'bold 15px CardFont, sans-serif'
        ctx.fillText(String(i + 1), tx + 16, cy)

        ctx.textAlign = 'right'
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 15px CardFont, sans-serif'
        const playsTxt = fmt(r.plays)
        ctx.fillText(playsTxt, tx + tw - 14, cy)
        const playsW = ctx.measureText(playsTxt).width
        ctx.textAlign = 'left'

        const nameX = tx + 42
        const maxW = tw - 42 - 14 - playsW - 16
        ctx.fillStyle = medalColor || '#fff'
        ctx.font = 'bold 17px CardFont, sans-serif'
        ctx.fillText(fitText(ctx, r.username, maxW), nameX, cy)
        ctx.textBaseline = 'alphabetic'
    })

    return canvas.toBuffer('image/png')
}

async function generateDisambiguateCard(o) {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')
    const accent = 'hsl(210, 80%, 60%)'
    const alpha = (a) => accent.replace('hsl(', 'hsla(').replace(')', `, ${a})`)

    drawBlurBackground(ctx, null)
    const glow = ctx.createRadialGradient(W / 2, 280, 20, W / 2, 280, 560)
    glow.addColorStop(0, alpha(0.20))
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    roundRect(ctx, 50, 50, 900, 500, 40)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.stroke()

    ctx.fillStyle = accent
    ctx.font = 'bold 15px CardFont, sans-serif'
    ctx.fillText('RISULTATI MULTIPLI', 90, 105)
    ctx.fillStyle = '#fff'
    const title = fitFont(ctx, `"${o.query}" — scegli l'artista`, 'bold', 28, 18, 820)
    ctx.fillText(fitText(ctx, `"${o.query}" — scegli l'artista`, 820), 90, 142)

    const items = o.items.slice(0, 5)
    const rowH = 76, startY = 175, rowX = 90, rowW = 820
    const covers = await Promise.all(items.map(async (it) => {
        if (!it.img) return null
        try { return await loadImage(it.img) } catch { return null }
    }))

    items.forEach((it, i) => {
        const y = startY + i * rowH
        const imgS = 60, imgY = y + 4

        roundRect(ctx, rowX, y, rowW, rowH - 10, 18)
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.fill()

        ctx.save()
        roundRect(ctx, rowX + 10, imgY, imgS, imgS, 14)
        ctx.clip()
        if (covers[i]) drawImageCover(ctx, covers[i], rowX + 10, imgY, imgS, imgS)
        else drawPlaceholderCover(ctx, rowX + 10, imgY, imgS, accent)
        ctx.restore()

        const textX = rowX + 10 + imgS + 20
        ctx.fillStyle = accent
        ctx.font = 'bold 16px CardFont, sans-serif'
        ctx.fillText(String(i + 1), textX, imgY + 24)

        ctx.fillStyle = '#fff'
        ctx.font = 'bold 22px CardFont, sans-serif'
        ctx.fillText(fitText(ctx, it.name, rowW - imgS - 80), textX + 26, imgY + 28)

        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.font = '600 15px CardFont, sans-serif'
        ctx.fillText(`${fmt(it.listeners)} ascoltatori`, textX + 26, imgY + 52)
    })

    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '600 14px CardFont, sans-serif'
    ctx.fillText('Tocca uno dei pulsanti qui sotto per scegliere', 90, startY + items.length * rowH + 20)

    return canvas.toBuffer('image/png')
}

async function generateCompareCard(o) {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    let picA = null, picB = null, artCover = null
    if (o.picA) { try { picA = await loadImage(o.picA) } catch { picA = null } }
    if (o.picB) { try { picB = await loadImage(o.picB) } catch { picB = null } }
    if (o.artistCover) { try { artCover = await loadImage(o.artistCover) } catch { artCover = null } }

    const accent = artCover ? accentFromImage(artCover) : 'hsl(280, 70%, 62%)'
    const alpha = (a) => accent.replace('hsl(', 'hsla(').replace(')', `, ${a})`)

    drawBlurBackground(ctx, artCover)
    const glow = ctx.createRadialGradient(W / 2, 260, 20, W / 2, 260, 560)
    glow.addColorStop(0, alpha(0.24))
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    roundRect(ctx, 50, 50, 900, 500, 40)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.stroke()

    const avatarS = 150
    const leftCx = 180, rightCx = 360
    const avatarY = 90

    function drawAvatar(cxPos, img, label) {
        const x = cxPos - avatarS / 2
        ctx.save()
        ctx.shadowColor = alpha(0.5)
        ctx.shadowBlur = 30
        ctx.beginPath()
        ctx.arc(cxPos, avatarY + avatarS / 2, avatarS / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#000'
        ctx.fill()
        ctx.restore()
        ctx.save()
        ctx.beginPath()
        ctx.arc(cxPos, avatarY + avatarS / 2, avatarS / 2, 0, Math.PI * 2)
        ctx.clip()
        if (img) drawImageCover(ctx, img, x, avatarY, avatarS, avatarS)
        else drawPlaceholderCover(ctx, x, avatarY, avatarS, accent)
        ctx.restore()
        ctx.beginPath()
        ctx.arc(cxPos, avatarY + avatarS / 2, avatarS / 2, 0, Math.PI * 2)
        ctx.lineWidth = 4
        ctx.strokeStyle = accent
        ctx.stroke()

        ctx.textAlign = 'center'
        ctx.fillStyle = '#fff'
        const name = fitFont(ctx, label, 'bold', 20, 14, avatarS + 30)
        ctx.font = 'bold 20px CardFont, sans-serif'
        ctx.fillText(fitText(ctx, label, avatarS + 30), cxPos, avatarY + avatarS + 34)
        ctx.textAlign = 'left'
    }

    drawAvatar(leftCx, picA, o.userA)
    drawAvatar(rightCx, picB, o.userB)

    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = 'bold 28px CardFont, sans-serif'
    ctx.fillText('VS', (leftCx + rightCx) / 2, avatarY + avatarS / 2 + 10)
    ctx.restore()

    const pctY = 300
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = 'bold 15px CardFont, sans-serif'
    ctx.fillText('AFFINITÀ MUSICALE', (leftCx + rightCx) / 2, pctY)
    ctx.fillStyle = accent
    ctx.font = 'bold 64px CardFont, sans-serif'
    ctx.fillText(`${o.affinity}%`, (leftCx + rightCx) / 2, pctY + 70)
    ctx.textAlign = 'left'

    const tx = 475, tw = 430
    const label = 'TOP 5 ARTISTI IN COMUNE'
    ctx.font = 'bold 15px CardFont, sans-serif'
    const badgeW = ctx.measureText(label).width + 56
    roundRect(ctx, tx, 100, badgeW, 34, 17)
    ctx.fillStyle = alpha(0.16)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(tx + 20, 117, 5, 0, Math.PI * 2)
    ctx.fillStyle = accent
    ctx.fill()
    ctx.fillText(label, tx + 36, 123)

    const S = 130, px = tx, py = 150
    ctx.save()
    ctx.shadowColor = alpha(0.5)
    ctx.shadowBlur = 35
    ctx.shadowOffsetY = 10
    roundRect(ctx, px, py, S, S, 22)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()
    ctx.save()
    roundRect(ctx, px, py, S, S, 22)
    ctx.clip()
    if (artCover) ctx.drawImage(artCover, px, py, S, S)
    else drawPlaceholderCover(ctx, px, py, S, accent)
    ctx.restore()

    const listX = px + S + 20
    const listW = tw - S - 20
    const rows = o.common.slice(0, 5)
    const rh = 26
    const listStartY = py + 4

    rows.forEach((r, i) => {
        const cy = listStartY + i * rh
        ctx.fillStyle = i === 0 ? accent : 'rgba(255,255,255,0.4)'
        ctx.font = 'bold 13px CardFont, sans-serif'
        ctx.fillText(String(i + 1), listX, cy)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 15px CardFont, sans-serif'
        ctx.fillText(fitText(ctx, r.name, listW - 20), listX + 18, cy)
    })

    return canvas.toBuffer('image/png')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const USERS_FILE = path.join(__dirname, '..', 'db/lastfm_users.json')
const LIKES_FILE = path.join(__dirname, '..', 'db/song_likes.json')

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}', 'utf8')
if (!fs.existsSync(LIKES_FILE)) fs.writeFileSync(LIKES_FILE, '{}', 'utf8')

const cache = new Map()
const CACHE_DURATION = 300000
const RECENT_TRACK_CACHE_DURATION = 30000
const LASTFM_API_KEY = '36f859a1fc4121e7f0e931806507d5f9'

function loadUsers() { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')) }
function saveUsers(users) { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8') }
function loadLikes() { return JSON.parse(fs.readFileSync(LIKES_FILE, 'utf8')) }
function saveLikes(likes) { fs.writeFileSync(LIKES_FILE, JSON.stringify(likes, null, 2), 'utf8') }

function getLastfmUsername(userId) { return loadUsers()[userId] || null }
function setLastfmUsername(userId, username) {
    const users = loadUsers();
    users[userId] = username;
    saveUsers(users)
}

function getSongLikes(songId) {
    const likes = loadLikes()
    const songData = likes[songId]
    return songData?.likes || 0
}

function addSongLike(songId, userId) {
    const likes = loadLikes()
    if (!likes[songId]) likes[songId] = { likes: 0, likedBy: [] }

    const songData = likes[songId]
    if (!songData.likedBy) songData.likedBy = []

    if (songData.likedBy.includes(userId)) {
        return { success: false, alreadyLiked: true, total: songData.likes }
    }

    songData.likes = (songData.likes || 0) + 1
    songData.likedBy.push(userId)
    saveLikes(likes)

    return { success: true, alreadyLiked: false, total: songData.likes }
}

function getUserLikesReceived(userId) {
    const users = loadUsers()
    const userLastfm = users[userId]
    if (!userLastfm) return 0

    const likes = loadLikes()
    let totalLikesReceived = 0

    for (const songId in likes) {
        const parts = songId.split('_')
        if (parts.length > 0 && parts[0].toLowerCase() === userLastfm.toLowerCase()) {
            totalLikesReceived += likes[songId].likes || 0
        }
    }

    return totalLikesReceived
}

function getUsernameFromId(userId) {
    const users = loadUsers()
    return users[userId] || null
}

function getIdFromUsername(username) {
    const users = loadUsers()
    for (const [id, user] of Object.entries(users)) {
        if (user.toLowerCase() === username.toLowerCase()) return id
    }
    return null
}

function generateSongId(username, artist, track) {
    return `${username}_${artist}_${track}`.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase()
}

function invalidateRecentCache(username) {
    const recentUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=1`
    cache.delete(recentUrl)

    const historyUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=10`
    cache.delete(historyUrl)
}

async function fetchWithCache(url, cacheDuration = CACHE_DURATION) {
    const now = Date.now()
    const cached = cache.get(url)
    if (cached && now - cached.timestamp < cacheDuration) return cached.data

    try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        cache.set(url, { data: json, timestamp: now })
        return json
    } catch (error) {
        console.error('Fetch error:', error)
        return null
    }
}

async function getUserInfo(username) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${LASTFM_API_KEY}&format=json`
    const data = await fetchWithCache(url)
    return data?.user
}

async function getTrackInfo(username, artist, track) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&username=${username}&format=json`
    const data = await fetchWithCache(url)
    return data?.track
}

async function getRecentTrack(username) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=1`
    const data = await fetchWithCache(url, RECENT_TRACK_CACHE_DURATION)
    return data?.recenttracks?.track?.[0]
}

async function getRecentTracks(username, limit = 10) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`
    const data = await fetchWithCache(url, RECENT_TRACK_CACHE_DURATION)
    return data?.recenttracks?.track || []
}

async function getTopArtists(username, period = '7day', limit = 9) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${username}&api_key=${LASTFM_API_KEY}&format=json&period=${period}&limit=${limit}`
    const data = await fetchWithCache(url)
    return data?.topartists?.artist
}

async function getTopAlbums(username, period = '7day', limit = 9) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&api_key=${LASTFM_API_KEY}&format=json&period=${period}&limit=${limit}`
    const data = await fetchWithCache(url)
    return data?.topalbums?.album
}

async function getTopTracks(username, period = '7day', limit = 9) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${username}&api_key=${LASTFM_API_KEY}&format=json&period=${period}&limit=${limit}`
    const data = await fetchWithCache(url)
    return data?.toptracks?.track
}

async function searchYoutube(query) {
    const search = await yts(query)
    if (!search.all.length) return null
    return search.all[0]
}

async function getArtistInfo(username, artist, autocorrect = true) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&username=${encodeURIComponent(username)}&autocorrect=${autocorrect ? 1 : 0}&format=json`
    const data = await fetchWithCache(url)
    return data?.artist
}

async function searchArtists(query, limit = 5) {
    const data = await lfm('artist.search', `artist=${enc(query)}&limit=${limit}`)
    return data?.results?.artistmatches?.artist || []
}

async function getAlbumInfo(username, artist, album) {
    const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&username=${encodeURIComponent(username)}&autocorrect=1&format=json`
    const data = await fetchWithCache(url)
    return data?.album
}

function getAllRegisteredUsers() {
    const users = loadUsers()
    const seen = new Map()
    for (const [id, username] of Object.entries(users)) {
        const key = username.toLowerCase()
        if (!seen.has(key)) seen.set(key, { id, username })
    }
    return [...seen.values()]
}

async function buildRanking(fetchUserCount) {
    const registered = getAllRegisteredUsers()
    const counts = await Promise.all(registered.map(u => fetchUserCount(u.username)))
    const results = registered
        .map((u, i) => ({ username: u.username, plays: counts[i] }))
        .filter(r => r.plays > 0)
    results.sort((a, b) => b.plays - a.plays)
    return results.slice(0, 10)
}

function formatRankingText(title, subtitle, rows) {
    if (!rows.length) return `❌ Nessuno scrobble trovato per *${subtitle}* tra gli utenti registrati.`
    const list = rows.map((r, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
        return `${medal} ${r.username} — ${fmt(r.plays)} ascolti`
    }).join('\n')
    return `${title}\n*${subtitle}*\n\n${list}`
}

async function computeAffinity(userA, userB) {
    const [topA, topB] = await Promise.all([
        getTopArtists(userA, 'overall', 200),
        getTopArtists(userB, 'overall', 200)
    ])

    const mapA = new Map((topA || []).map(a => [a.name.toLowerCase(), { name: a.name, plays: Number(a.playcount || 0) }]))
    const mapB = new Map((topB || []).map(a => [a.name.toLowerCase(), { name: a.name, plays: Number(a.playcount || 0) }]))

    const common = []
    for (const [key, valA] of mapA) {
        if (mapB.has(key)) {
            const valB = mapB.get(key)
            common.push({ name: valA.name, playsA: valA.plays, playsB: valB.plays, combined: valA.plays + valB.plays })
        }
    }
    common.sort((a, b) => b.combined - a.combined)

    const unionSize = new Set([...mapA.keys(), ...mapB.keys()]).size
    const affinity = unionSize > 0 ? Math.round((common.length / unionSize) * 100) : 0

    return { common: common.slice(0, 5), affinity, totalCommon: common.length }
}

export default {
    command: ['setuser', 'cur', 'like', 'topartists', 'topalbums', 'toptracks', 'cronologia', 'mylikes', 'refresh', 'compare', 'w', 'wal', 'ws'],
    desc: 'Last.fm - Traccia la tua musica',
    category: 'Music',

    async execute(m, extra) {
        const conn = extra?.conn || global.conn
        const chat = m.chat
        const args = extra.args || []
        const text = extra.text || ''
        const command = extra.command || ''

        if (command === 'setuser') {
            const username = text.trim()
            if (!username) return conn.sendMessage(chat, {
                text: `❌ Usa: ${global.prefissoComandi}setuser <username>`
            }, { quoted: m })

            setLastfmUsername(m.sender, username)
            return conn.sendMessage(chat, {
                text: `✅ Username *${username}* salvato!`
            }, { quoted: m })
        }

        if (command === 'like') {
            const targetUser = m.mentionedJid?.[0] || text.trim()

            if (!targetUser && !text) {
                return conn.sendMessage(chat, {
                    text: `❌ Specifica l'utente!\nEsempio:\n• ${global.prefissoComandi}like @utente\n• ${global.prefissoComandi}like username`
                }, { quoted: m })
            }

            let targetUsername
            let targetUserId

            if (targetUser.includes('@')) {
                targetUserId = targetUser
                targetUsername = getUsernameFromId(targetUserId)
                if (!targetUsername) {
                    return conn.sendMessage(chat, {
                        text: `❌ L'utente menzionato non ha registrato un username Last.fm!\nDigli di usare ${global.prefissoComandi}setuser`
                    }, { quoted: m })
                }
            } else {
                targetUsername = targetUser
                targetUserId = getIdFromUsername(targetUsername)
                if (!targetUserId) {
                    return conn.sendMessage(chat, {
                        text: `❌ Nessun utente trovato con username *${targetUsername}*`
                    }, { quoted: m })
                }
            }

            invalidateRecentCache(targetUsername)
            const track = await getRecentTrack(targetUsername)
            if (!track) return conn.sendMessage(chat, {
                text: '❌ Nessuna traccia trovata.'
            }, { quoted: m })

            const artist = track.artist?.['#text'] || 'unknown'
            const songName = track.name || 'unknown'

            const songId = generateSongId(targetUsername, artist, songName)
            const result = addSongLike(songId, m.sender)

            if (result.alreadyLiked) {
                return conn.sendMessage(chat, {
                    text: `❌ Hai già messo like a "${songName}" di ${targetUsername}!`
                }, { quoted: m })
            }

            const targetName = getUsernameFromId(targetUserId) || targetUsername

            return conn.sendMessage(chat, {
                text: `🔥 Hai messo fuoco a *${songName}* di ${targetName}!`
            }, { quoted: m })
        }

        if (command === 'mylikes') {
            const user = getLastfmUsername(m.sender)
            if (!user) return conn.sendMessage(chat, {
                text: `❌ Registrati con ${global.prefissoComandi}setuser <username>`
            }, { quoted: m })

            const likesReceived = getUserLikesReceived(m.sender)
            return conn.sendMessage(chat, {
                text: `📊 *Statistiche Like* di *${user}*\n\n` +
                      `❤️ Likes ricevuti totali: ${likesReceived}\n\n` +
                      `Usa ${global.prefissoComandi}like @utente per mettere like alla canzone di qualcuno!`
            }, { quoted: m })
        }

        if (['w', 'wal', 'ws'].includes(command)) {
            const query = text.trim()
            if (!query) {
                const usage = { w: `${global.prefissoComandi}w <artista>`, wal: `${global.prefissoComandi}wal <album>`, ws: `${global.prefissoComandi}ws <canzone>` }[command]
                return conn.sendMessage(chat, {
                    text: `❌ Usa: ${usage}`
                }, { quoted: m })
            }

            const registered = getAllRegisteredUsers()
            if (!registered.length) {
                return conn.sendMessage(chat, {
                    text: `❌ Nessun utente registrato ancora. Usa ${global.prefissoComandi}setuser <username>`
                }, { quoted: m })
            }

            let kind, rankQuery, rows, cover

            if (command === 'w') {
                kind = 'artist'
                const matches = await searchArtists(query, 5)

                if (!matches.length) {
                    return conn.sendMessage(chat, {
                        text: `❌ Nessun artista trovato per *${query}*.`
                    }, { quoted: m })
                }

                const exactMatch = matches.find(a => a.name.toLowerCase() === query.toLowerCase())

                if (!exactMatch && matches.length > 1) {
                    const items = matches.map(a => ({ name: a.name, listeners: Number(a.listeners || 0), img: null }))
                    const coversResolved = await Promise.all(items.map(it => artistCoverFromLastfm(it.name)))
                    items.forEach((it, i) => { it.img = coversResolved[i] })

                    const card = await generateDisambiguateCard({ query, items })
                    const buttons = items.map(it => ({
                        buttonId: `${global.prefissoComandi}w ${it.name}`,
                        buttonText: { displayText: it.name },
                        type: 1
                    }))

                    await conn.sendMessage(chat, {
                        image: card,
                        caption: `🔎 Ho trovato più artisti per "${query}", scegli quello giusto:`,
                        buttons,
                        headerType: 4
                    }, { quoted: m })
                    return
                }

                const canonicalArtist = exactMatch ? exactMatch.name : matches[0].name
                rankQuery = canonicalArtist
                rows = await buildRanking(async (username) => {
                    const info = await getArtistInfo(username, canonicalArtist, false)
                    return Number(info?.stats?.userplaycount || 0)
                })
                cover = await artistCoverFromLastfm(canonicalArtist)
            }

            if (command === 'wal') {
                kind = 'album'
                const [artistPart, ...albumRest] = query.split(' - ')
                const albumQuery = albumRest.length ? albumRest.join(' - ').trim() : query
                const artistQuery = albumRest.length ? artistPart.trim() : ''
                rankQuery = albumQuery

                let resolvedArtist = artistQuery
                if (!resolvedArtist) {
                    const search = await lfm('album.search', `album=${enc(cleanQuery(albumQuery))}&limit=1`)
                    resolvedArtist = search?.results?.albummatches?.album?.[0]?.artist || ''
                }

                rows = await buildRanking(async (username) => {
                    if (resolvedArtist) {
                        const info = await getAlbumInfo(username, resolvedArtist, albumQuery)
                        return Number(info?.userplaycount || 0)
                    }
                    return 0
                })
                cover = resolvedArtist ? await albumCoverFromLastfm(resolvedArtist, albumQuery) : null
            }

            if (command === 'ws') {
                kind = 'track'
                const [artistPart, ...songRest] = query.split(' - ')
                const songQuery = songRest.length ? songRest.join(' - ').trim() : query
                const artistQuery = songRest.length ? artistPart.trim() : ''
                rankQuery = songQuery

                let resolvedArtist = artistQuery
                if (!resolvedArtist) {
                    const search = await lfm('track.search', `track=${enc(cleanQuery(songQuery))}&limit=1`)
                    resolvedArtist = search?.results?.trackmatches?.track?.[0]?.artist || ''
                }

                rows = await buildRanking(async (username) => {
                    if (resolvedArtist) {
                        const info = await getTrackInfo(username, resolvedArtist, songQuery)
                        return Number(info?.userplaycount || 0)
                    }
                    return 0
                })
                cover = resolvedArtist ? await trackCoverFromLastfm(resolvedArtist, songQuery) : null
            }

            if (!rows.length) {
                return conn.sendMessage(chat, {
                    text: `❌ Nessuno scrobble trovato per *${rankQuery}* tra gli utenti registrati.`
                }, { quoted: m })
            }

            try {
                const card = await generateRankingCard({ kind, query: rankQuery, rows, cover })
                await conn.sendMessage(chat, {
                    image: card,
                    caption: `${RANKING_LABELS[kind]} • ${rankQuery}`
                }, { quoted: m })
            } catch (err) {
                console.error('Errore generazione card ranking:', err)
                const text_ = formatRankingText(`*${RANKING_LABELS[kind]}*`, rankQuery, rows)
                await conn.sendMessage(chat, { text: text_ }, { quoted: m })
            }
            return
        }

        const user = getLastfmUsername(m.sender)
        if (!user) return conn.sendMessage(chat, {
            text: `❌ Registrati con ${global.prefissoComandi}setuser <username>`
        }, { quoted: m })

        if (command === 'compare') {
            const targetJid = m.mentionedJid?.[0]
                || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                || m.message?.contextInfo?.mentionedJid?.[0]
            if (!targetJid) {
                return conn.sendMessage(chat, {
                    text: `❌ Menziona un utente!\nEsempio: ${global.prefissoComandi}compare @utente`
                }, { quoted: m })
            }

            if (targetJid === m.sender) {
                return conn.sendMessage(chat, {
                    text: '❌ Non puoi confrontarti con te stesso!'
                }, { quoted: m })
            }

            const targetUser = getUsernameFromId(targetJid)
            if (!targetUser) {
                return conn.sendMessage(chat, {
                    text: `❌ L'utente menzionato non ha registrato un username Last.fm!\nDigli di usare ${global.prefissoComandi}setuser`
                }, { quoted: m })
            }

            const { common, affinity } = await computeAffinity(user, targetUser)

            let picA = null, picB = null
            try { picA = await conn.profilePictureUrl(m.sender, 'image') } catch { picA = null }
            try { picB = await conn.profilePictureUrl(targetJid, 'image') } catch { picB = null }

            const artistCover = common.length ? await artistCoverFromLastfm(common[0].name) : null

            try {
                const card = await generateCompareCard({
                    userA: user,
                    userB: targetUser,
                    picA,
                    picB,
                    affinity,
                    common,
                    artistCover
                })
                await conn.sendMessage(chat, {
                    image: card,
                    caption: `🤝 ${user} ↔️ ${targetUser} • ${affinity}% affinità`
                }, { quoted: m })
            } catch (err) {
                console.error('Errore generazione card compare:', err)
                let textOut = `🤝 *AFFINITÀ MUSICALE*\n\n${user} ↔️ ${targetUser}\n\n📊 Affinità: *${affinity}%*\n\n`
                textOut += common.length
                    ? `🎤 *Artisti in comune:*\n` + common.map((c, i) => `${i + 1}. ${c.name} — ${fmt(c.playsA)} / ${fmt(c.playsB)} ascolti`).join('\n')
                    : `❌ Nessun artista in comune trovato.`
                await conn.sendMessage(chat, { text: textOut }, { quoted: m })
            }
            return
        }

        if (command === 'cur') {
            invalidateRecentCache(user)
            const track = await getRecentTrack(user)
            if (!track) return conn.sendMessage(chat, {
                text: '❌ Nessuna traccia trovata.'
            }, { quoted: m })

            const nowPlaying = track['@attr']?.nowplaying === 'true'
            const artist = track.artist?.['#text'] || 'Artista sconosciuto'
            const title = track.name || 'Brano sconosciuto'
            const album = track.album?.['#text'] || 'Album sconosciuto'

            const info = await getTrackInfo(user, artist, title)
            const userInfo = await getUserInfo(user)
            const likesReceived = getUserLikesReceived(m.sender)

            const caption = `🎧 *${nowPlaying ? 'In riproduzione' : 'Ultimo brano'}* di ${user}\n\n🎵 ${title}\n🎤 ${artist}\n💿 ${album}\n\n▶️ Ascolti Personali: ${info?.userplaycount || 0}\n🌍 Ascolti Globali: ${info?.playcount || 0}\n📊 Ascolti Totali: ${userInfo?.playcount || 0}\n🔥 Likes ricevuti totali: ${likesReceived}`

            const buttons = [
                { buttonId: `${global.prefissoComandi}like ${user}`, buttonText: { displayText: '🔥 Like' }, type: 1 },
                { buttonId: `${global.prefissoComandi}topartists`, buttonText: { displayText: '🎤 Artisti' }, type: 1 },
                { buttonId: `${global.prefissoComandi}topalbums`, buttonText: { displayText: '💿 Album' }, type: 1 },
                { buttonId: `${global.prefissoComandi}toptracks`, buttonText: { displayText: '🎵 Tracce' }, type: 1 },
                { buttonId: `${global.prefissoComandi}cronologia`, buttonText: { displayText: '📜 Cronologia' }, type: 1 }
            ]

            const cover = await resolveImage('tracks', { name: title, sub: artist })

            try {
                const card = await generateCurCard({
                    title,
                    artist,
                    album: album !== 'Album sconosciuto' ? album : '',
                    cover,
                    nowPlaying,
                    username: user,
                    userPlays: Number(info?.userplaycount || 0),
                    globalPlays: Number(info?.playcount || 0),
                    totalPlays: Number(userInfo?.playcount || 0),
                    likes: likesReceived
                })

                await conn.sendMessage(chat, {
                    image: card,
                    caption: `🎧 ${title} — ${artist}`,
                    footer: `Last.fm • ${user}`,
                    buttons: buttons,
                    headerType: 4
                }, { quoted: m })
            } catch (err) {
                console.error('Errore generazione card cur:', err)

                await conn.sendMessage(chat, {
                    text: caption,
                    footer: `Last.fm • ${user}`,
                    buttons: buttons,
                    headerType: 1
                }, { quoted: m })
            }
            return
        }

        if (['topartists', 'topalbums', 'toptracks'].includes(command)) {
            const kind = command.replace('top', '')
            const period = text.toLowerCase().match(/(7day|1month|3month|6month|12month|overall)/)?.[0] || '7day'
            const fetcher = { artists: getTopArtists, albums: getTopAlbums, tracks: getTopTracks }[kind]
            const data = await fetcher(user, period, 9)
            if (!data || data.length === 0) return conn.sendMessage(chat, {
                text: '❌ Nessun dato trovato.'
            }, { quoted: m })

            const items = data.map(x => ({
                name: x.name,
                sub: kind === 'artists' ? '' : (x.artist?.name || ''),
                plays: Number(x.playcount || 0)
            }))

            const buttons = [
                { buttonId: `${global.prefissoComandi}${command} 7day`, buttonText: { displayText: '📅 7 giorni' }, type: 1 },
                { buttonId: `${global.prefissoComandi}${command} 1month`, buttonText: { displayText: '📅 1 mese' }, type: 1 },
                { buttonId: `${global.prefissoComandi}${command} 6month`, buttonText: { displayText: '📅 6 mesi' }, type: 1 },
                { buttonId: `${global.prefissoComandi}${command} overall`, buttonText: { displayText: '📊 Overall' }, type: 1 }
            ]

            try {
                const cover = await resolveTopCover(kind, items)
                const card = await generateTopCard({ kind, period, username: user, items, cover })
                await conn.sendMessage(chat, {
                    image: card,
                    caption: `${KIND_LABELS[kind]} di ${user} (${period})`,
                    footer: `Last.fm • ${user}`,
                    buttons: buttons,
                    headerType: 4
                }, { quoted: m })
            } catch (err) {
                console.error('Errore generazione card top:', err)
                const icon = { artists: '🎤', albums: '💿', tracks: '🎵' }[kind]
                const list = items.map((it, i) => `${i + 1}. ${it.name}${it.sub ? ' - ' + it.sub : ''} (${it.plays})`).join('\n')
                await conn.sendMessage(chat, {
                    text: `${icon} ${KIND_LABELS[kind]} di ${user} (${period}):\n\n${list}`,
                    buttons: buttons,
                    headerType: 1
                }, { quoted: m })
            }
            return
        }

        if (command === 'cronologia') {
            invalidateRecentCache(user)
            const tracks = await getRecentTracks(user, 10)
            if (!tracks.length) return conn.sendMessage(chat, {
                text: '❌ Nessuna cronologia trovata.'
            }, { quoted: m })

            const trackList = tracks.map((track, i) => {
                const nowPlaying = track['@attr']?.nowplaying === 'true'
                const icon = nowPlaying ? '▶️' : `${i + 1}.`
                const time = track.date ? new Date(track.date['#text']).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''
                return `${icon} ${track.name}\n   🖌️ ${track.artist['#text']}${time ? `\n   🕐 ${time}` : ''}`
            }).join('\n\n')

            const cron = `📜 Cronologia di ${user}\n\n${trackList}`

            const buttons = [
                { buttonId: `${global.prefissoComandi}cur`, buttonText: { displayText: '🎧 Ora in riproduzione' }, type: 1 },
                { buttonId: `${global.prefissoComandi}topartists`, buttonText: { displayText: '🎤 Top Artisti' }, type: 1 },
                { buttonId: `${global.prefissoComandi}topalbums`, buttonText: { displayText: '💿 Top Album' }, type: 1 },
                { buttonId: `${global.prefissoComandi}toptracks`, buttonText: { displayText: '🎵 Top Tracce' }, type: 1 }
            ]

            await conn.sendMessage(chat, {
                text: cron,
                footer: 'Ultime 10 tracce ascoltate',
                buttons: buttons,
                headerType: 1
            }, { quoted: m })
            return
        }

        if (command === 'refresh') {
            invalidateRecentCache(user)
            return conn.sendMessage(chat, {
                text: `🔄 Cache per ${user} aggiornata! Ora vedrai i dati più recenti.`
            }, { quoted: m })
        }
    }
}
