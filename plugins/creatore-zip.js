import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// la cartella del bot è quella sopra a plugins/
const ROOT = path.resolve(__dirname, '..')

// cartelle/file esclusi (confronto sul nome, ovunque si trovino)
const ESCLUSI = ['node_modules', 'chromesession', 'package-lock.json']

const fmtSize = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

// ---------- CRC32 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf, prev = 0) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf, prev) >>> 0
  let c = (prev ^ 0xffffffff) >>> 0
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---------- ZIP writer (senza dipendenze, in streaming) ----------
function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const date = (Math.max(d.getFullYear() - 1980, 0) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

function scrivi(stream, buf) {
  return new Promise((resolve, reject) => {
    stream.once('error', reject)
    if (stream.write(buf)) {
      stream.removeListener('error', reject)
      resolve()
    } else {
      stream.once('drain', () => {
        stream.removeListener('error', reject)
        resolve()
      })
    }
  })
}

async function creaZip(outPath, files) {
  const out = fs.createWriteStream(outPath)
  const central = []
  let offset = 0
  let aggiunti = 0
  let saltati = 0

  const w = async buf => {
    await scrivi(out, buf)
    offset += buf.length
  }

  for (const { abs, rel } of files) {
    let st
    try {
      st = await fs.promises.stat(abs)
    } catch {
      saltati++
      continue
    }

    const name = Buffer.from(rel.split(path.sep).join('/'), 'utf8')
    const { time, date } = dosDateTime(st.mtime)
    const headerOffset = offset

    // local file header (flag 0x0808 = UTF-8 + data descriptor)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)
    lh.writeUInt16LE(0x0808, 6)
    lh.writeUInt16LE(8, 8)
    lh.writeUInt16LE(time, 10)
    lh.writeUInt16LE(date, 12)
    lh.writeUInt32LE(0, 14)
    lh.writeUInt32LE(0, 18)
    lh.writeUInt32LE(0, 22)
    lh.writeUInt16LE(name.length, 26)
    lh.writeUInt16LE(0, 28)
    await w(Buffer.concat([lh, name]))

    let crc = 0
    let usize = 0
    let csize = 0

    try {
      const rs = fs.createReadStream(abs)
      const def = zlib.createDeflateRaw({ level: 6 })
      rs.on('data', chunk => {
        crc = crc32(chunk, crc)
        usize += chunk.length
      })
      rs.on('error', e => def.destroy(e))
      rs.pipe(def)
      for await (const chunk of def) {
        csize += chunk.length
        await w(chunk)
      }
    } catch {
      // file illeggibile a metà: lo registro comunque vuoto così lo zip resta valido
      crc = 0
      usize = 0
      csize = 0
      saltati++
    }

    // data descriptor
    const dd = Buffer.alloc(16)
    dd.writeUInt32LE(0x08074b50, 0)
    dd.writeUInt32LE(crc >>> 0, 4)
    dd.writeUInt32LE(csize, 8)
    dd.writeUInt32LE(usize, 12)
    await w(dd)

    central.push({ name, time, date, crc: crc >>> 0, csize, usize, mode: st.mode, headerOffset })
    aggiunti++
  }

  // central directory
  const cdStart = offset
  for (const e of central) {
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(0x031e, 4) // creato su unix, v3.0
    ch.writeUInt16LE(20, 6)
    ch.writeUInt16LE(0x0808, 8)
    ch.writeUInt16LE(8, 10)
    ch.writeUInt16LE(e.time, 12)
    ch.writeUInt16LE(e.date, 14)
    ch.writeUInt32LE(e.crc, 16)
    ch.writeUInt32LE(e.csize, 20)
    ch.writeUInt32LE(e.usize, 24)
    ch.writeUInt16LE(e.name.length, 28)
    ch.writeUInt16LE(0, 30)
    ch.writeUInt16LE(0, 32)
    ch.writeUInt16LE(0, 34)
    ch.writeUInt16LE(0, 36)
    ch.writeUInt32LE(((e.mode & 0xffff) << 16) >>> 0, 38)
    ch.writeUInt32LE(e.headerOffset, 42)
    await w(Buffer.concat([ch, e.name]))
  }
  const cdSize = offset - cdStart

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(central.length, 8)
  eocd.writeUInt16LE(central.length, 10)
  eocd.writeUInt32LE(cdSize, 12)
  eocd.writeUInt32LE(cdStart, 16)
  eocd.writeUInt16LE(0, 20)
  await w(eocd)

  await new Promise((resolve, reject) => {
    out.once('error', reject)
    out.end(resolve)
  })

  return { aggiunti, saltati }
}

// ---------- scansione cartella ----------
async function raccogliFile(dir, base, outPath, risultato = [], stats = { esclusi: 0 }) {
  let voci
  try {
    voci = await fs.promises.readdir(dir, { withFileTypes: true })
  } catch {
    return { risultato, stats }
  }

  for (const v of voci) {
    const abs = path.join(dir, v.name)
    if (ESCLUSI.includes(v.name.toLowerCase())) {
      stats.esclusi++
      continue
    }
    if (abs === outPath) continue
    if (v.isSymbolicLink()) continue

    if (v.isDirectory()) {
      await raccogliFile(abs, base, outPath, risultato, stats)
    } else if (v.isFile()) {
      risultato.push({ abs, rel: path.relative(base, abs) })
    }
  }
  return { risultato, stats }
}

const creatoreZip = {
  command: ['zip'],
  owner: true,

  async execute(m, { conn, isOwner, isROwner }) {
    if (!isOwner && !isROwner) {
      return conn.sendMessage(m.chat, { text: '👑 Solo l\'owner può usare questo comando!' }, { quoted: m })
    }

    const nomeBot = path.basename(ROOT) || 'bot'
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    const fileName = `${nomeBot}-${stamp}.zip`
    const outPath = path.join(os.tmpdir(), fileName)

    await conn.sendMessage(m.chat, { text: '📦 Sto creando lo zip del bot, un attimo...' }, { quoted: m })

    try {
      const { risultato: files, stats } = await raccogliFile(ROOT, ROOT, outPath)

      if (!files.length) {
        return conn.sendMessage(m.chat, { text: '❌ Non ho trovato nessun file da comprimere.' }, { quoted: m })
      }

      const { aggiunti, saltati } = await creaZip(outPath, files)
      const size = (await fs.promises.stat(outPath)).size

      let caption = `📦 *BACKUP DEL BOT*\n\n`
      caption += `┃ 📁 File: *${aggiunti}*\n`
      caption += `┃ 💾 Peso: *${fmtSize(size)}*\n`
      caption += `┃ 🚫 Esclusi: ${ESCLUSI.join(', ')}\n`
      if (saltati) caption += `┃ ⚠️ File non leggibili: *${saltati}*\n`

      await conn.sendMessage(
        m.chat,
        {
          document: { url: outPath },
          mimetype: 'application/zip',
          fileName,
          caption
        },
        { quoted: m }
      )
    } catch (e) {
      console.error('❌ Errore zip:', e)
      await conn.sendMessage(m.chat, { text: `❌ Errore durante la creazione dello zip:\n${e.message}` }, { quoted: m })
    } finally {
      fs.promises.unlink(outPath).catch(() => {})
    }
  }
}

export default creatoreZip