import fetch from 'node-fetch'
import FormData from 'form-data'
import { downloadContentFromMessage } from '@realvare/baileys'
import { getChat } from '../database.js'

const mediaCache = new Map()
const qrCache = new Map()

const LINK_REGEX = /\bchat[\s.\u200B-\u200D\uFEFF]*whatsapp[\s.\u200B-\u200D\uFEFF]*com\/(?!invite\/)([\dA-Za-z]{20,24})/gi
const CHANNEL_REGEX = /\bwhatsapp[\s.\u200B-\u200D\uFEFF]*com\/channel\/([\dA-Za-z]{20,24})/gi
const URL_REGEX = /(?:https?:\/\/)?(?:chat|www)?[.\s]*whatsapp[.\s]*(?:com|me)[\/.\s]+(?:channel\/)?([\dA-Za-z]{20,24})/gi

async function getMediaBuffer(message) {
    const cacheKey = message.key.id
    const cached = mediaCache.get(cacheKey)
    if (cached) return cached

    try {
        const msg = message.message
        if (!msg) return null

        let mediaMsg = null
        let type = null

        if (msg.imageMessage) {
            mediaMsg = msg.imageMessage
            type = 'image'
        } else if (msg.videoMessage) {
            mediaMsg = msg.videoMessage
            type = 'video'
        } else if (msg.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = msg.extendedTextMessage.contextInfo.quotedMessage
            if (quoted.imageMessage) {
                mediaMsg = quoted.imageMessage
                type = 'image'
            } else if (quoted.videoMessage) {
                mediaMsg = quoted.videoMessage
                type = 'video'
            }
        }

        if (!mediaMsg || !type) return null

        const stream = await downloadContentFromMessage(mediaMsg, type)
        const chunks = []
        for await (const chunk of stream) chunks.push(chunk)
        const buffer = Buffer.concat(chunks)

        mediaCache.set(cacheKey, buffer)
        setTimeout(() => mediaCache.delete(cacheKey), 30000)
        return buffer
    } catch (e) {
        return null
    }
}

async function readQRCode(imageBuffer) {
    const bufferHash = imageBuffer.toString('base64').slice(0, 50)
    if (qrCache.has(bufferHash)) return qrCache.get(bufferHash)

    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 1500)

        const formData = new FormData()
        formData.append('file', imageBuffer, 'qrcode.jpg')

        const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            headers: formData.getHeaders()
        })

        clearTimeout(timeout)
        if (!response.ok) return null

        const data = await response.json()
        const result = data?.[0]?.symbol?.[0]?.data || null

        qrCache.set(bufferHash, result)
        setTimeout(() => qrCache.delete(bufferHash), 30000)
        return result
    } catch (e) {
        return null
    }
}

function extractTextFast(m) {
    if (m.text) return m.text

    const msg = m.message
    if (!msg) return ''

    if (msg.conversation) return msg.conversation
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
    if (msg.imageMessage?.caption) return msg.imageMessage.caption
    if (msg.videoMessage?.caption) return msg.videoMessage.caption

    return ''
}

function extractPollText(m) {
    const msg = m.message
    if (!msg) return ''

    const poll =
        msg.pollCreationMessage ||
        msg.pollCreationMessageV2 ||
        msg.pollCreationMessageV3

    if (!poll) return ''

    const parts = []
    if (poll.name) parts.push(poll.name)
    if (Array.isArray(poll.options)) {
        for (const opt of poll.options) {
            if (opt?.optionName) parts.push(opt.optionName)
        }
    }
    return parts.join(' ')
}

function extractPaymentText(m) {
    const msg = m.message
    if (!msg) return ''

    const parts = []

    const req =
        msg.requestPaymentMessage ||
        msg.sendPaymentMessage ||
        msg.paymentInviteMessage ||
        msg.declinePaymentRequestMessage ||
        msg.cancelPaymentRequestMessage ||
        msg.requestPaymentMessageV2

    if (req) {
        if (req.note) parts.push(req.note)
        if (req.currency) parts.push(req.currency)
        if (req.amount) parts.push(String(req.amount))
        if (req.background?.text) parts.push(req.background.text)
        if (req.requestMessage) parts.push(req.requestMessage)
        if (req.message) parts.push(req.message)
        if (req.description) parts.push(req.description)

        const nativeFlow = msg.interactiveMessage?.nativeFlowMessage
        if (nativeFlow?.buttons) {
            for (const btn of nativeFlow.buttons) {
                if (btn?.name) parts.push(btn.name)
                if (btn?.buttonParamsJson) parts.push(btn.buttonParamsJson)
            }
        }
    }

    return parts.join(' ')
}

function hasWhatsAppLink(text) {
    if (!text) return false

    LINK_REGEX.lastIndex = 0
    CHANNEL_REGEX.lastIndex = 0
    URL_REGEX.lastIndex = 0

    return LINK_REGEX.test(text) || CHANNEL_REGEX.test(text) || URL_REGEX.test(text)
}

export default {
    async before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
        if (!m.isGroup) return false
        if (m.fromMe || isOwner || isROwner) return false

        const chat = getChat(m.chat, false)
        if (!chat) return false

       
        const antilinkGP = chat.antilinkgp === true
        const antilinkHARD = chat.antilinkhard === true

        if (!antilinkGP && !antilinkHARD) return false

        if (isAdmin) return false
        if (!isBotAdmin) return false

        const textParts = []

        const normalText = extractTextFast(m)
        if (normalText) textParts.push(normalText)

        const pollText = extractPollText(m)
        if (pollText) textParts.push(pollText)

        const paymentText = extractPaymentText(m)
        if (paymentText) textParts.push(paymentText)

        const fullText = textParts.join(' ')
        if (!fullText) return false

        const cleanText = fullText.replace(/[\s\u200b-\u200d\uFEFF]+/g, '')

        if (hasWhatsAppLink(cleanText)) {
            try {
                const groupCode = await conn.groupInviteCode(m.chat).catch(() => null)

                if (groupCode && cleanText.includes(groupCode)) return false

                const isGroupInvite = /\bchat[\s.\u200B-\u200D\uFEFF]*whatsapp[\s.\u200B-\u200D\uFEFF]*com\/(?!invite\/)/i.test(cleanText)
                const isChannel = /\bwhatsapp[\s.\u200B-\u200D\uFEFF]*com\/channel\//i.test(cleanText)

                
                let shouldAct = false

                if (antilinkHARD) {
                    shouldAct = true
                } else if (antilinkGP && isGroupInvite) {
                    shouldAct = true
                }

                if (!shouldAct) return false

                await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')

                await conn.sendMessage(m.chat, {
                    delete: {
                        remoteJid: m.chat,
                        fromMe: false,
                        id: m.key.id,
                        participant: m.key.participant
                    }
                }).catch(() => {})

                await conn.sendMessage(m.chat, {
                    text: `🚫 *LINK WHATSAPP RILEVATO*\nUtente rimosso: @${m.sender.split('@')[0]}`,
                    mentions: [m.sender]
                }).catch(() => {})

                return true
            } catch (e) {
                return false
            }
        }

       
        try {
            const mediaBuffer = await getMediaBuffer(m)
            if (mediaBuffer) {
                const qrData = await readQRCode(mediaBuffer)
                if (qrData && hasWhatsAppLink(qrData.replace(/[\s\u200b-\u200d\uFEFF]+/g, ''))) {
                    const groupCode = await conn.groupInviteCode(m.chat).catch(() => null)
                    if (groupCode && qrData.includes(groupCode)) return false

                    const isGroupInvite = /\bchat[\s.\u200B-\u200D\uFEFF]*whatsapp[\s.\u200B-\u200D\uFEFF]*com\/(?!invite\/)/i.test(qrData)
                    const isChannel = /\bwhatsapp[\s.\u200B-\u200D\uFEFF]*com\/channel\//i.test(qrData)

                    let shouldAct = false
                    if (antilinkHARD) shouldAct = true
                    else if (antilinkGP && isGroupInvite) shouldAct = true

                    if (!shouldAct) return false

                    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
                    await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {})
                    await conn.sendMessage(m.chat, {
                        text: `⚠️ *QR CODE CON LINK*\nUtente rimosso: @${m.sender.split('@')[0]}`,
                        mentions: [m.sender]
                    }).catch(() => {})

                    return true
                }
            }
        } catch (e) {}

        return false
    }
}