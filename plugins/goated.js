import fs from 'fs'
import path from 'path'

const AUDIO_PATH = path.join(process.cwd(), 'media/Oltre.mp3')

export default {
  command: ['goated', 'promoteadmin', 'tonygoat'],
  category: 'Group',
  group: true,
  owner: true,
  botAdmin: true,

  async execute(m, { conn }) {
    try {
      let target =
        m.mentionedJid?.[0] ||
        m.quoted?.sender ||
        m.sender

      await conn.groupParticipantsUpdate(m.chat, [target], 'promote')

      await conn.sendMessage(
        m.chat,
        {
          text: `👑 *ＴＯＮＹ ＢＯＹ ＲＥＡＬ ＧＯＡＴ* 👑\n\n❤️ 𝘊𝘪 𝘮𝘦𝘵𝘵𝘪𝘢𝘮𝘰 𝘤𝘦𝘳𝘰𝘵𝘵𝘪 𝘢 𝘷𝘪𝘤𝘦𝘯𝘥𝘢 𝘴𝘦 𝘩𝘢𝘪 𝘪𝘭 𝘤𝘶𝘰𝘳𝘦 𝘵𝘢𝘨𝘭𝘪𝘢𝘵𝘰?`
        },
        { quoted: m }
      )

      if (fs.existsSync(AUDIO_PATH)) {
        await conn.sendMessage(
          m.chat,
          {
            audio: fs.readFileSync(AUDIO_PATH),
            mimetype: 'audio/mpeg',
            ptt: true
          },
          { quoted: m }
        )
      }

    } catch (err) {
      console.error('Promotion error:', err)

      await conn.sendMessage(
        m.chat,
        {
          text: `⚠️ 𝙴𝚛𝚛𝚘𝚛𝚎 𝚗𝚎𝚕𝚕𝚊 𝚙𝚛𝚘𝚖𝚘𝚣𝚒𝚘𝚗𝚎, 𝚛𝚒𝚙𝚛𝚘𝚟𝚊 𝚍𝚘𝚙𝚘.`
        },
        { quoted: m }
      )
    }
  }
}