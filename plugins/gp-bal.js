import { getDevice } from '@realvare/baileys'
import { getUser } from '../database.js'
import { getUserRoles } from './gp-ruolo.js'
import { RAINBOW_PALETTE } from './gp-colore.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createCanvas, loadImage } from 'canvas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STATS_PATH = path.join(__dirname, '../db/messaggi.json')

const W = 1000, H = 560
const TZ = 'Europe/Rome'

function canon(jid) {
    const p = global.jidTools?.phoneOf?.(jid)
    return p ? `${p}@s.whatsapp.net` : String(jid)
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const todayStr = () => dayFormatter.format(new Date())

function loadMessageStats() {
    try {
        if (!fs.existsSync(STATS_PATH)) return null
        return JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'))
    } catch {
        return null
    }
}

function mergeUsers(users) {
    const out = {}
    for (const [u, n] of Object.entries(users || {})) {
        const k = canon(u)
        out[k] = (out[k] || 0) + n
    }
    return out
}

function todayStats(chat, jid) {
    const raw = loadMessageStats()
    if (!raw) return { count: 0, rank: 0, of: 0 }

    const bucket = raw.stats?.[todayStr()]?.[chat]
    const users = mergeUsers(bucket?.users)
    const me = canon(jid)
    const count = users[me] || 0

    const active = Object.values(users).filter(v => v > 0)
    const rank = count ? active.filter(v => v > count).length + 1 : 0

    return { count, rank, of: active.length }
}

function cleanName(s) {
    return String(s || '').normalize('NFKC').replace(/[^\p{L}\p{N}\p{M}\p{P}\p{Zs}]/gu, '').replace(/\s+/g, ' ').trim()
}

function loadStatsNames() {
    try {
        if (!fs.existsSync(STATS_PATH)) return {}
        const raw = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'))
        return raw.names || {}
    } catch {
        return {}
    }
}

const withTimeout = (p, ms) => {
    let t
    return Promise.race([
        Promise.resolve(p),
        new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms) })
    ]).finally(() => clearTimeout(t))
}

async function resolveName(conn, jid) {
    const names = loadStatsNames()
    let n = names[canon(jid)] || names[jid]
    if (!n) {
        try { n = await withTimeout(conn.getName(jid), 2500) } catch {}
    }
    n = cleanName(n)
    return n && !/^[\d\s+@.\-]+$/.test(n) ? n : null
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

function drawBlurBackground(ctx, baseColor) {
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#0e0e13')
    grad.addColorStop(1, '#08080b')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    const glow = ctx.createRadialGradient(W / 2, -50, 50, W / 2, -50, 600)
    glow.addColorStop(0, (baseColor || '#9C27B0') + '22')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)
}

function drawTextOutline(ctx, text, x, y, width = 5) {
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'
    ctx.lineWidth = width
    ctx.strokeText(text, x, y)
    ctx.restore()
}

function hexToRgb(hex) {
    const h = hex.replace('#', '')
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16)
    }
}

function lerpColor(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB)
    const r = Math.round(a.r + (b.r - a.r) * t)
    const g = Math.round(a.g + (b.g - a.g) * t)
    const bl = Math.round(a.b + (b.b - a.b) * t)
    return `rgb(${r}, ${g}, ${bl})`
}

function colorAt(colors, t) {
    if (colors.length === 1) return colors[0]
    const segs = colors.length - 1
    const pos = t * segs
    const i = Math.min(Math.floor(pos), segs - 1)
    const localT = pos - i
    return lerpColor(colors[i], colors[i + 1], localT)
}

function drawRainbowText(ctx, text, x, y, colors, glow = 20) {
    if (!colors.length) return
    if (colors.length === 1) {
        ctx.save()
        ctx.shadowColor = colors[0]
        ctx.shadowBlur = glow
        ctx.fillStyle = colors[0]
        ctx.fillText(text, x, y)
        ctx.fillText(text, x, y)
        ctx.restore()
        ctx.fillStyle = colors[0]
        ctx.fillText(text, x, y)
        return
    }

    const chars = [...text]
    let cx = x

    for (let i = 0; i < chars.length; i++) {
        const t = chars.length > 1 ? i / (chars.length - 1) : 0
        const color = colorAt(colors, t)

        ctx.save()
        ctx.shadowColor = color
        ctx.shadowBlur = glow
        ctx.fillStyle = color
        ctx.fillText(chars[i], cx, y)
        ctx.fillText(chars[i], cx, y)
        ctx.restore()

        ctx.fillStyle = color
        ctx.fillText(chars[i], cx, y)

        cx += ctx.measureText(chars[i]).width
    }
}

function fitText(ctx, text, maxW) {
    let t = text
    while (ctx.measureText(t).width > maxW && t.length > 1) {
        t = t.slice(0, -1)
    }
    if (t !== text) t = t.slice(0, -1) + '…'
    return t
}

async function generateProfileCard(o) {
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    const mainColor = o.nameColors?.[0] || '#FFFFFF'
    drawBlurBackground(ctx, mainColor)

    roundRect(ctx, 40, 40, W - 80, H - 80, 36)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.stroke()

    const avatarS = 180
    const avatarX = 100, avatarY = 90

    ctx.save()
    ctx.shadowColor = mainColor + '88'
    ctx.shadowBlur = 40
    ctx.beginPath()
    ctx.arc(avatarX + avatarS / 2, avatarY + avatarS / 2, avatarS / 2 + 6, 0, Math.PI * 2)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX + avatarS / 2, avatarY + avatarS / 2, avatarS / 2, 0, Math.PI * 2)
    ctx.clip()
    if (o.avatar) drawImageCover(ctx, o.avatar, avatarX, avatarY, avatarS, avatarS)
    else {
        ctx.fillStyle = '#2a2a33'
        ctx.fillRect(avatarX, avatarY, avatarS, avatarS)
    }
    ctx.restore()

    ctx.beginPath()
    ctx.arc(avatarX + avatarS / 2, avatarY + avatarS / 2, avatarS / 2, 0, Math.PI * 2)
    ctx.lineWidth = 5
    ctx.strokeStyle = mainColor
    ctx.stroke()

    const infoX = avatarX + avatarS + 50
    let cursorY = avatarY + 50

    ctx.font = 'bold 44px CardFont, sans-serif'
    const displayName = fitText(ctx, o.name, 440)

    drawTextOutline(ctx, displayName, infoX, cursorY, 6)
    drawRainbowText(ctx, displayName, infoX, cursorY, o.nameColors, 22)
    cursorY += 36

    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '600 20px CardFont, sans-serif'
    ctx.fillText(`@${o.number}`, infoX, cursorY)
    cursorY += 38

    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = '600 18px CardFont, sans-serif'
    ctx.fillText(`📱 ${o.device}`, infoX, cursorY)
    cursorY += 36

    const rankText = o.stats?.rank ? `#${o.stats.rank}` : '—'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = '600 18px CardFont, sans-serif'
    ctx.fillText(`📊 Oggi: ${rankText} · ${o.stats?.count ?? 0} msg`, infoX, cursorY)

    const badgeStartY = avatarY + avatarS + 50
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = 'bold 15px CardFont, sans-serif'
    ctx.fillText('RUOLI', 100, badgeStartY)

    let bx = 100, by = badgeStartY + 24
    const badgeH = 46, gap = 14, maxX = W - 100

    for (const role of o.roles) {
        const roleColor = role.colori?.[0] || '#FFFFFF'
        ctx.font = 'bold 18px CardFont, sans-serif'
        const textW = ctx.measureText(role.nome).width
        const iconSpace = 36
        const badgeW = iconSpace + textW + 36

        if (bx + badgeW > maxX) {
            bx = 100
            by += badgeH + gap
        }

        roundRect(ctx, bx, by, badgeW, badgeH, badgeH / 2)
        ctx.fillStyle = 'rgba(20,20,26,0.75)'
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = roleColor + 'AA'
        ctx.stroke()

        const iconCx = bx + 26, iconCy = by + badgeH / 2
        if (role.stickerImg) {
            ctx.save()
            ctx.beginPath()
            ctx.arc(iconCx, iconCy, 16, 0, Math.PI * 2)
            ctx.clip()
            drawImageCover(ctx, role.stickerImg, iconCx - 16, iconCy - 16, 32, 32)
            ctx.restore()
        } else {
            ctx.beginPath()
            ctx.arc(iconCx, iconCy, 10, 0, Math.PI * 2)
            ctx.fillStyle = roleColor
            ctx.fill()
        }

        ctx.font = 'bold 18px CardFont, sans-serif'
        ctx.textBaseline = 'middle'
        drawRainbowText(ctx, role.nome, bx + iconSpace + 8, by + badgeH / 2, role.colori?.length ? role.colori : [roleColor], 10)
        ctx.textBaseline = 'alphabetic'

        bx += badgeW + gap
    }

    if (!o.roles.length) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.font = '600 16px CardFont, sans-serif'
        ctx.fillText('Nessun ruolo', 100, by + badgeH / 2 + 6)
    }

    return canvas.toBuffer('image/png')
}

export default {
    command: ['info', 'profilo'],

    async execute(m, extra) {
        const { conn, mentionedJid } = extra
        const who = mentionedJid?.[0] || m.quoted?.sender || m.sender

        const user = getUser(who, true)
        if (!user) return conn.sendMessage(m.chat, { text: '❌ Utente non trovato' }, { quoted: m })

        let name = user.name
        if (!name || name === 'Utente' || name === who.split('@')[0]) {
            let resolved = null

            if (who === m.sender && m.pushName) {
                resolved = cleanName(m.pushName)
                if (resolved && /^[\d\s+@.\-]+$/.test(resolved)) resolved = null
            }

            if (!resolved) resolved = await resolveName(conn, who)

            if (!resolved && m.isGroup) {
                try {
                    const groupMetadata = await conn.groupMetadata(m.chat)
                    const participant = groupMetadata?.participants?.find(p => p.id === who)
                    resolved = cleanName(participant?.notify)
                    if (resolved && /^[\d\s+@.\-]+$/.test(resolved)) resolved = null
                } catch {}
            }

            name = resolved || who.split('@')[0]
            user.name = name
        }

        let dispositivo = 'WhatsApp'
        try {
            dispositivo = await getDevice(m.key.id) || 'WhatsApp'
        } catch {}

        let avatar = null
        try {
            const url = await conn.profilePictureUrl(who, 'image')
            if (url) avatar = await loadImage(url)
        } catch {}

        const nameColors = user.colore === 'rainbow' ? RAINBOW_PALETTE
            : user.colore ? [user.colore]
            : ['#FFFFFF']

        const rawRoles = getUserRoles(who)
        const roles = []
        for (const r of rawRoles) {
            let stickerImg = null
            if (r.sticker && fs.existsSync(r.sticker)) {
                try { stickerImg = await loadImage(r.sticker) } catch { stickerImg = null }
            }
            roles.push({ ...r, stickerImg })
        }

        const stats = todayStats(m.chat, who)

        const card = await generateProfileCard({
            name,
            number: who.split('@')[0],
            device: dispositivo,
            avatar,
            nameColors,
            roles,
            stats
        })

        return conn.sendMessage(m.chat, {
            image: card
        }, { quoted: m })
    }
}