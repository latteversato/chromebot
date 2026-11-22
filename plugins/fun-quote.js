import { createCanvas, loadImage } from 'canvas'
import sharp from 'sharp'
import fetch from 'node-fetch'

export default {
  command: ['quote'],

  async execute(m, { conn, text }) {
    try {
      const quoteText = text || m.quoted?.text || "scrivi qualcosa"
      let who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
      let number = who.split("@")[0]

      let imgBuffer

      if (m.quoted && /image/.test(m.quoted.mtype)) {
        const stream = await m.quoted.download()
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)
        imgBuffer = Buffer.concat(chunks)
      } else {
        let ppUrl
        try {
          ppUrl = await conn.profilePictureUrl(who, 'image')
        } catch {
          ppUrl = 'https://i.imgur.com/8Km9tLL.png'
        }
        imgBuffer = await (await fetch(ppUrl)).buffer()
      }

      const width = 1200
      const height = 675
      const canvas = createCanvas(width, height)
      const ctx = canvas.getContext('2d')

      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, width, height)

      const processed = await sharp(imgBuffer)
        .resize(width / 3, height, { fit: "cover" })
        .toBuffer()

      const leftImg = await loadImage(processed)
      ctx.drawImage(leftImg, 0, 0, width / 3, height)

      const gradient = ctx.createLinearGradient(width / 3 - 120, 0, width / 3 + 180, 0)
      gradient.addColorStop(0, "rgba(0,0,0,0)")
      gradient.addColorStop(1, "rgba(0,0,0,1)")
      ctx.fillStyle = gradient
      ctx.fillRect(width / 3 - 120, 0, 300, height)

      const centerX = width / 2 + 120
      const centerY = height / 2

      ctx.fillStyle = "#fff"
      ctx.font = "italic 58px Times New Roman"
      ctx.textAlign = "center"

      const maxWidth = width / 2 - 120
      const lineHeight = 72

      const words = quoteText.split(" ")
      let line = ""
      let lines = []

      for (let word of words) {
        const testLine = line + word + " "
        if (ctx.measureText(testLine).width > maxWidth && line !== "") {
          lines.push(line.trim())
          line = word + " "
        } else {
          line = testLine
        }
      }
      lines.push(line.trim())
      lines = lines.slice(0, 2)

      let textY = centerY - (lines.length - 1) * lineHeight / 2

      lines.forEach((l, i) => {
        ctx.fillText(l, centerX, textY + i * lineHeight)
      })

      const contact = await conn.getName(who)

      ctx.fillStyle = "#9a9a9a"
      ctx.font = "bold 30px Arial"
      ctx.fillText(contact, centerX, textY + lines.length * lineHeight + 50)

      ctx.font = "26px Arial"
      ctx.fillText(`@${number}`, centerX, textY + lines.length * lineHeight + 90)

      ctx.fillStyle = "rgba(255,255,255,0.025)"
      for (let i = 0; i < 900; i++) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5)
      }

      const buffer = canvas.toBuffer("image/png")
      const finalBuffer = await sharp(buffer).png({ quality: 100 }).toBuffer()

      await conn.sendMessage(m.chat, { image: finalBuffer }, { quoted: m })

    } catch (err) {
      console.error(err)
      await conn.sendMessage(m.chat, { text: "❌ Errore nella creazione della quote." }, { quoted: m })
    }
  }
}