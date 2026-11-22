import { generateWAMessageFromContent, proto } from '@realvare/baileys'

function interactiveNodes(jid, ai = true) {
    const nodes = [{
        tag: 'biz',
        attrs: {},
        content: [{
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
        }]
    }]
    if (ai && !String(jid).endsWith('@g.us')) nodes.push({ tag: 'bot', attrs: { biz_bot: '1' } })
    return nodes
}

async function sendFooterOnly(sock, jid, { text, footer = '', title = '', quoted, ai = true } = {}) {
    if (!text) throw new Error('sendFooterOnly: text is required')

    const msg = generateWAMessageFromContent(
        jid,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        header: proto.Message.InteractiveMessage.Header.create({
                            title,
                            hasMediaAttachment: false
                        }),
                        body: proto.Message.InteractiveMessage.Body.create({ text }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons: [] })
                    })
                }
            }
        },
        { quoted, userJid: sock.user?.id }
    )

    await sock.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: interactiveNodes(jid, ai)
    })
    return msg.key
}

export default {
    command: ['t1b'],
    desc: 'Test messaggio interactive solo footer',
    category: 'Test',

    async execute(m, extra) {
        const conn = extra?.conn || global.conn
        const chat = m.chat
        const text = (extra?.text || '').trim()
        const args = extra?.args || []

        const noAi = args[0]?.toLowerCase() === 'noai'
        const raw = noAi ? args.slice(1).join(' ') : text
        const [body, footer, title] = raw.split('|').map(s => s.trim())

        try {
            await sendFooterOnly(conn, chat, {
                text: body || 'Test messaggio con solo footer',
                footer: footer || 'Footer di test',
                title: title || '',
                quoted: m,
                ai: !noAi
            })
        } catch (err) {
            console.error('Errore t1b:', err)
            await conn.sendMessage(chat, { text: `❌ Errore: ${err.message}` }, { quoted: m })
        }
    }
}