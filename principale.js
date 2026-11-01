process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
import sistemaRuoli from './ruoli.js';
import gestore from './gestione.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import fs, { existsSync, mkdirSync, watch, readdirSync, rmSync } from 'fs';
import yargs from 'yargs';
import pino from 'pino';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import readline from 'readline';
import NodeCache from 'node-cache';
import databaseManager from './database.js';

// ===== JID START: gestione centralizzata LID <-> numero di telefono =====
// Impara la corrispondenza dai metadata dei gruppi, dai messaggi e dagli eventi,
// poi la applica in sendMessage (menzioni) e groupParticipantsUpdate.
const lidToPn = new Map(); // "123456" (lid) -> "39333..." (numero)
const pnToLid = new Map();

const userOf = (j) => (typeof j === 'string' ? j.split('@')[0].split(':')[0] : '');
const isLid = (j) => typeof j === 'string' && j.endsWith('@lid');
const isPn = (j) => typeof j === 'string' && (j.endsWith('@s.whatsapp.net') || j.endsWith('@c.us'));
const formsOf = (p) =>
    [p?.id, p?.lid, p?.jid, p?.phoneNumber, p?.pn].filter((x) => typeof x === 'string' && x);

function learnPair(a, b) {
    const lid = [a, b].find(isLid);
    const pn = [a, b].find(isPn);
    if (!lid || !pn) return;
    const l = userOf(lid), p = userOf(pn);
    if (l && p && l !== p) {
        lidToPn.set(l, p);
        pnToLid.set(p, l);
    }
}

function learnParticipants(list) {
    for (const p of list || []) {
        if (!p || typeof p !== 'object') continue;
        const f = formsOf(p);
        const lid = f.find(isLid), pn = f.find(isPn);
        if (lid && pn) learnPair(lid, pn);
    }
}

// numero di telefono reale (solo cifre) se noto, altrimenti null
function phoneOf(jid) {
    const u = userOf(jid);
    if (!u) return null;
    if (lidToPn.has(u)) return lidToPn.get(u);
    if (isPn(jid)) return u;
    return null;
}

// tutte le cifre con cui puo' presentarsi la stessa persona (lid e/o numero)
function candidates(jid) {
    const u = userOf(jid).replace(/\D/g, '');
    if (!u) return [];
    const out = new Set([u]);
    if (lidToPn.has(u)) out.add(lidToPn.get(u));
    if (pnToLid.has(u)) out.add(pnToLid.get(u));
    return [...out];
}

function sameUser(a, b) {
    const cb = candidates(b);
    return candidates(a).some((x) => cb.includes(x));
}

function participantMatches(p, jid) {
    const cj = candidates(jid);
    if (!cj.length || !p) return false;
    return formsOf(p).some((f) => candidates(f).some((x) => cj.includes(x)));
}

// ID "nativo" del partecipante nel gruppo (quello che WhatsApp si aspetta)
function nativeParticipantId(participants, jid) {
    for (const p of participants || []) {
        if (participantMatches(p, jid)) return p.id || p.jid || null;
    }
    return null;
}

async function resolveViaRepo(conn, jid) {
    try {
        const repo = conn?.signalRepository?.lidMapping;
        if (!repo?.getPNForLID) return null;
        const lid = `${userOf(jid)}@lid`;
        const pn = await repo.getPNForLID(lid);
        if (pn) {
            learnPair(lid, pn);
            return phoneOf(lid);
        }
    } catch {}
    return null;
}

// Sostituisce, nei messaggi con menzioni, @LID con @numero e mette il JID col numero.
// Tocca SOLO le menzioni visibili nel testo (quelle nascoste, es. hidetag, restano intatte).
async function fixMentions(conn, chat, content) {
    if (!content || typeof content !== 'object' || !Array.isArray(content.mentions)) return content;
    const keys = ['text', 'caption'].filter((k) => typeof content[k] === 'string');
    if (!keys.length) return content;

    const visible = (u) => /^\d+$/.test(u) && keys.some((k) => new RegExp(`@${u}(?!\\d)`).test(content[k]));
    const toFix = content.mentions.filter((j) => typeof j === 'string' && visible(userOf(j)));
    if (!toFix.length) return content;

    if (toFix.some((j) => !phoneOf(j)) && typeof chat === 'string' && chat.endsWith('@g.us')) {
        const md = await conn.groupMetadata(chat).catch(() => null);
        learnParticipants(md?.participants);
    }
    for (const j of toFix) if (!phoneOf(j)) await resolveViaRepo(conn, j);

    const map = new Map(); // vecchio user -> numero
    for (const j of toFix) {
        const ph = phoneOf(j), old = userOf(j);
        if (ph && ph !== old) map.set(old, ph);
    }
    if (!map.size) return content;

    const out = { ...content };
    for (const k of keys) {
        out[k] = out[k].replace(/@(\d+)(?!\d)/g, (full, d) => (map.has(d) ? '@' + map.get(d) : full));
    }
    out.mentions = [...new Set(content.mentions.map((j) => {
        const u = userOf(j);
        return map.has(u) ? `${map.get(u)}@s.whatsapp.net` : j;
    }))];
    return out;
}

function patchConn(conn) {
    if (!conn || conn.__jidPatched) return;
    conn.__jidPatched = true;

    const rawSend = conn.sendMessage.bind(conn);
    conn.sendMessage = async (jid, content, options) => {
        try {
            content = await fixMentions(conn, jid, content);
        } catch (e) {
            console.error('[jid] errore menzioni:', e.message);
        }
        return rawSend(jid, content, options);
    };

    if (typeof conn.groupParticipantsUpdate === 'function') {
        const rawUpdate = conn.groupParticipantsUpdate.bind(conn);
        conn.groupParticipantsUpdate = async (chat, participants, action) => {
            let list = participants;
            try {
                if (action !== 'add' && Array.isArray(participants)) {
                    const md = await conn.groupMetadata(chat).catch(() => null);
                    if (md?.participants) {
                        learnParticipants(md.participants);
                        list = participants.map((j) => nativeParticipantId(md.participants, j) || j);
                    }
                }
            } catch {}
            return rawUpdate(chat, list, action);
        };
    }
}

global.jidTools = { userOf, learnPair, learnParticipants, phoneOf, candidates, sameUser,
                    participantMatches, nativeParticipantId, patchConn };
// ===== JID END =====

if (!global.db) global.db = {};
global.db.data = databaseManager.data;
global.db.database = databaseManager;
global.prefissoComandi = '.';
global.prefissiMulti = ['.', '/', '!', '#'];
global.messaggi = {
    ...(global.messaggi || {}),
    soloOwner: '❌ Comando riservato agli owner!',
    soloPremium: '❌ Comando riservato agli utenti Premium!',
    soloVip: '❌ Comando riservato ai membri VIP!',
    soloAdmin: '❌ Comando riservato agli amministratori!',
    soloBotAdmin: '❌ Il bot deve essere amministratore del gruppo!',
    soloGroup: '❌ Comando eseguibile solo nei gruppi!',
    soloPrivate: '❌ Comando eseguibile solo in chat privata!'
};

if (!global.whitelist) global.whitelist = {};
try {
    const wlDbPath = join(path.dirname(fileURLToPath(import.meta.url)), 'dn/whitelist.json');
    if (existsSync(wlDbPath)) {
        const data = JSON.parse(fs.readFileSync(wlDbPath, 'utf-8'));
        global.whitelist = (typeof data === 'object' && !Array.isArray(data)) ? data : {};
        console.log(`[𝐬𝐢𝐬𝐭𝐞𝐦𝐚] 𝐰𝐡𝐢𝐭𝐞𝐥𝐢𝐬𝐭 𝐜𝐚𝐫𝐢𝐜𝐚𝐭𝐚`);
    } else {
        global.whitelist = {};
    }
} catch (e) {
    console.log('[𝐬𝐢𝐬𝐭𝐞𝐦𝐚] 𝐞𝐫𝐫𝐨𝐫𝐞 𝐰𝐡𝐢𝐭𝐞𝐥𝐢𝐬𝐭:', e.message);
    global.whitelist = {};
}

const DisconnectReason = {
    connectionClosed: 428,
    connectionLost: 408,
    connectionReplaced: 440,
    timedOut: 408,
    loggedOut: 401,
    badSession: 500,
    restartRequired: 515,
    multideviceMismatch: 411,
    forbidden: 403,
    unavailableService: 503
};

const _baileysModule = await import('@realvare/baileys');
const _baileys = _baileysModule.makeWASocket || _baileysModule.initAuthCreds ? _baileysModule : (_baileysModule.default || _baileysModule);
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser, downloadContentFromMessage } = _baileys;

protoType();
serialize();

global.isLogoPrinted = false;
global.qrGenerated = false;
global.connectionMessagesPrinted = {};
global.viewOnceCache = new Map();
global.pollCache = new Map();

// Gruppi "non ancora pronti": quando il bot (o un utente) viene aggiunto con
// un add diretto, senza passare dal link d'invito, i metadata/participants e
// la mappa LID->PN possono impiegare qualche secondo a stabilizzarsi.
// Finché un gruppo è in questo set, i messaggi in arrivo da lì vengono
// accodati invece di essere scartati/processati con un sender non risolto.
global.gruppiInWarmup = new Set();
global.warmupQueue = new Map(); // groupId -> array di msg in attesa
global.groupMetadataCache = new Map(); // groupId -> { data, ts }
const GROUP_METADATA_TTL = 5 * 60 * 1000;

async function getGroupMetadataFresh(conn, groupId, { force = false } = {}) {
    const cached = global.groupMetadataCache.get(groupId);
    if (!force && cached && (Date.now() - cached.ts) < GROUP_METADATA_TTL) {
        return cached.data;
    }
    let timer;
    try {
        const raw = conn.groupMetadataRaw || conn.groupMetadata.bind(conn);
        const data = await Promise.race([
            raw(groupId),
            new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('groupMetadata timeout')), 8000); })
        ]);
        if (data) { global.groupMetadataCache.set(groupId, { data, ts: Date.now() }); learnParticipants(data.participants); }
        return data;
    } catch (e) {
        // meglio dati vecchi che bloccare tutto
        return cached?.data || null;
    } finally {
        clearTimeout(timer);
    }
}
global.getGroupMetadataFresh = getGroupMetadataFresh;

// Fa passare TUTTI i plugin (e ruoli.js) dalla cache senza doverli modificare
function patchGroupMetadata(conn) {
    if (conn.__gmPatched) return;
    conn.__gmPatched = true;
    conn.groupMetadataRaw = conn.groupMetadata.bind(conn);
    const inflight = new Map();
    conn.groupMetadata = (jid) => {
        if (!inflight.has(jid)) {
            const p = getGroupMetadataFresh(conn, jid).finally(() => inflight.delete(jid));
            inflight.set(jid, p);
        }
        return inflight.get(jid);
    };
}

// Riprova a leggere i metadata del gruppo finché non trova il JID atteso tra
// i participants (bot stesso o utente appena aggiunto), con backoff.
// Serve a coprire la finestra in cui l'add diretto non ha ancora propagato
// la risoluzione LID<->PN lato bot.
// I participants possono essere stringhe oppure oggetti { id, jid, phoneNumber }
function participantJid(p) {
    if (!p) return '';
    if (typeof p === 'string') return p;
    return p.id || p.jid || p.phoneNumber || '';
}
global.participantJid = participantJid;

async function warmupGroup(conn, groupId, expectedJids = []) {
    if (global.gruppiInWarmup.has(groupId)) return;
    global.gruppiInWarmup.add(groupId);

    const delays = [500, 1000, 2000, 3000, 5000];
    const deadline = Date.now() + 15000; // il gruppo non resta mai in warmup oltre 15s
    try {
        const wantedNums = expectedJids
            .map(j => participantJid(j))
            .map(j => (global.normalizeJid ? global.normalizeJid(j) : j))
            .filter(Boolean)
            .map(j => String(j).split('@')[0].replace(/\D/g, ''));

        for (const delay of delays) {
            if (Date.now() > deadline) break;
            await new Promise(r => setTimeout(r, delay));
            const metadata = await getGroupMetadataFresh(conn, groupId, { force: true });
            if (!metadata?.participants?.length) continue;

            const found = wantedNums.length === 0 || wantedNums.every(num =>
                metadata.participants.some(p => {
                    const ids = [p.id, p.jid, p.phoneNumber].filter(Boolean);
                    return ids.some(id => String(id).split('@')[0].replace(/\D/g, '') === num);
                })
            );
            if (found) break;
        }
    } catch (e) {
        console.log('[𝐬𝐢𝐬𝐭𝐞𝐦𝐚] 𝐞𝐫𝐫𝐨𝐫𝐞 𝐰𝐚𝐫𝐦𝐮𝐩 𝐠𝐫𝐮𝐩𝐩𝐨:', e.message);
    } finally {
        global.gruppiInWarmup.delete(groupId);
        const queued = global.warmupQueue.get(groupId) || [];
        global.warmupQueue.delete(groupId);
        for (const fn of queued) {
            try { fn(); } catch {}
        }
    }
}
global.warmupGroup = warmupGroup;

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of global.viewOnceCache) {
        if (now - value.timestamp > 3600000) {
            global.viewOnceCache.delete(key);
        }
    }
    for (const [key, value] of global.pollCache) {
        if (now - value.timestamp > 86400000) {
            global.pollCache.delete(key);
        }
    }
}, 60000);

let methodCodeQR = process.argv.includes("qr");
let methodCode = process.argv.includes("code");

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
    return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
};

global.__dirname = function dirname(pathURL) {
    return path.dirname(global.__filename(pathURL, true));
};

global.__require = function require(dir = import.meta.url) {
    return createRequire(dir);
};

const __dirname = global.__dirname(import.meta.url);
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp('^[' + (opts['prefix'] || './!').replace(/[|\\{}()[\]^$+*.\-^]/g, '\\$&') + ']');

global.creds = 'creds.json';
global.authFile = 'chromesession';

const { state, saveCreds } = await useMultiFileAuthState(global.authFile);
// sessione collegata: 'registered' da solo puo' restare false anche dopo un pairing riuscito,
// 'account' invece esiste solo se il collegamento e' stato completato
const sessioneRegistrata = () => !!(state.creds?.registered || state.creds?.account);
const msgRetryCounterCache = new NodeCache();
let version = [2, 3000, 1015901307];
try {
    const res = await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json', { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data?.version) {
        version = data.version;
    }
} catch (e) {
    try {
        const latest = await fetchLatestBaileysVersion();
        if (latest && latest.version) version = latest.version;
    } catch (err) {
        console.log('[𝐬𝐢𝐬𝐭𝐞𝐦𝐚] 𝐞𝐫𝐫𝐨𝐫𝐞 𝐟𝐞𝐭𝐜𝐡 𝐯𝐞𝐫𝐬𝐢𝐨𝐧𝐞, 𝐮𝐬𝐨 𝐟𝐚𝐥𝐥𝐛𝐚𝐜𝐤:', err.message);
    }
}

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
});

const question = (t) => {
    rl.clearLine(rl.input, 0);
    return new Promise((resolver) => {
        rl.question(t, (r) => {
            rl.clearLine(rl.input, 0);
            resolver(r.trim());
        });
    });
};

console.clear();

console.log('CHROME BOT');
console.log(`[𝐬𝐢𝐬𝐭𝐞𝐦𝐚] 𝐬𝐞𝐬𝐬𝐢𝐨𝐧𝐞: registered=${!!state.creds?.registered} account=${!!state.creds?.account} me=${!!state.creds?.me?.id}`);
if (!sessioneRegistrata()) {
    console.log('𝟏. 𝐪𝐫');
    console.log('𝟐. 𝐜𝐨𝐝𝐢𝐜𝐞');
    console.log('');
}

let opzione;
if (!sessioneRegistrata() && !methodCodeQR && !methodCode) {
    do {
        opzione = await question('𝐬𝐞𝐥𝐞𝐳𝐢𝐨𝐧𝐚 𝟏 𝐨 𝟐: ');
    } while (!/^[1-2]$/.test(opzione));
} else {
    opzione = methodCode ? '2' : '1';
}

const logger = pino({
    level: 'silent',
    timestamp: () => `,"time":"${new Date().toJSON()}"`
});

global.jidCache = new NodeCache({ stdTTL: 600, useClones: false });

global.normalizeJid = function(jid) {
    if (!jid) return jid;
    if (global.jidCache && global.jidCache.get(jid)) {
        return global.jidCache.get(jid);
    }
    let decoded = jid;
    if (/:\d+@/gi.test(jid)) {
        try {
            decoded = jidNormalizedUser(jid);
        } catch {
            decoded = jid;
        }
    }
    if (typeof decoded === 'object' && decoded.user && decoded.server) {
        decoded = `${decoded.user}@${decoded.server}`;
    }
    if (typeof decoded === 'string') {
        if (decoded.endsWith('@lid') || decoded.includes(':lid')) {
            decoded = decoded.replace(/[@:]lid/g, '@s.whatsapp.net');
        }
        if (!decoded.includes('@') && /^\d+$/.test(decoded)) {
            decoded = decoded + '@s.whatsapp.net';
        }
    }
    if (global.jidCache) {
        global.jidCache.set(jid, decoded);
    }
    return decoded;
};

function toJid(input) {
  if (!input) return null;
  input = input.toString().trim().toLowerCase();
  if (input.startsWith('@')) input = input.slice(1);
  if (input.endsWith('@s.whatsapp.net')) return input;
  const num = input.replace(/\D/g, '');
  return num.length >= 10 ? `${num}@s.whatsapp.net` : null;
}

function extractTargets(m, mentionedJid) {
  let targets = [];
  if (mentionedJid?.length) {
    targets.push(...mentionedJid);
  }
  if (m.quoted?.sender) {
    targets.push(m.quoted.sender);
  }
  if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
    targets.push(...m.message.extendedTextMessage.contextInfo.mentionedJid);
  }
  return [...new Set(targets.map(toJid).filter(Boolean))];
}

const decodeJid = jid => global.normalizeJid(jid);
const jidPhone = jid => {
    const normalized = global.normalizeJid(jid);
    return (normalized || '').split('@')[0].replace(/[^0-9]/g, '');
};
global.decodeJid = decodeJid;
global.jidPhone = jidPhone;
global.toJid = toJid;
global.extractTargets = extractTargets;

const connectionOptions = {
    version: version,
    logger: logger,
    browser: ['Ubuntu', 'Chrome', '122.0.6261.112'],
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    decodeJid: global.normalizeJid,
    printQRInTerminal: opzione === '1',
    syncFullHistory: false,
    defaultQueryTimeoutMs: 20000,
    cachedGroupMetadata: async (jid) => global.groupMetadataCache.get(jid)?.data,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    msgRetryCounterCache,
    getMessage: async (key) => ({})
};

let isInit = true;
const chatQueues = new Map();

function withTimeout(promise, ms) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms); })
    ]).finally(() => clearTimeout(timer));
}

// Una coda per ogni chat: i gruppi non si bloccano a vicenda
// e un messaggio incantato viene scartato dopo 45s.
function processMessage(msg) {
    const chatId = msg.key.remoteJid;
    const prev = chatQueues.get(chatId) || Promise.resolve();
    const next = prev
        .then(async () => {
            const t0 = Date.now();
            await withTimeout(gestore.gestisciMessaggio(msg, global.conn), 45000);
            const dt = Date.now() - t0;
            if (dt > 3000) console.log(`⏱ messaggio lento: ${chatId} ${dt}ms`);
        })
        .catch(err => console.error('𝐞𝐫𝐫𝐨𝐫𝐞 𝐠𝐞𝐬𝐭𝐢𝐨𝐧𝐞:', err.message))
        .finally(() => { if (chatQueues.get(chatId) === next) chatQueues.delete(chatId); });
    chatQueues.set(chatId, next);
}

async function downloadViewOnceContent(msg) {
    try {
        const viewOnceMsg = msg.message?.viewOnceMessageV2?.message || 
                           msg.message?.viewOnceMessageV2Extension?.message ||
                           msg.message?.viewOnceMessageV3?.message;
        if (!viewOnceMsg) throw new Error('non e view once');
        let mtype, mediaKey, directPath, buffer;
        if (viewOnceMsg.imageMessage) {
            mtype = 'image';
            mediaKey = viewOnceMsg.imageMessage.mediaKey;
            directPath = viewOnceMsg.imageMessage.directPath;
        } else if (viewOnceMsg.videoMessage) {
            mtype = 'video';
            mediaKey = viewOnceMsg.videoMessage.mediaKey;
            directPath = viewOnceMsg.videoMessage.directPath;
        } else if (viewOnceMsg.audioMessage) {
            mtype = 'audio';
            mediaKey = viewOnceMsg.audioMessage.mediaKey;
            directPath = viewOnceMsg.audioMessage.directPath;
        } else {
            throw new Error('formato non supportato');
        }
        if (!mediaKey || !directPath) {
            throw new Error('dati mancanti');
        }
        const mediaMessage = viewOnceMsg.imageMessage || viewOnceMsg.videoMessage || viewOnceMsg.audioMessage;
        const stream = await downloadContentFromMessage(mediaMessage, mtype);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks);
        return {
            buffer,
            type: mtype,
            caption: mediaMessage.caption || '',
            ptt: mediaMessage.ptt || false
        };
    } catch (error) {
        try {
            if (msg.download) {
                const buffer = await msg.download();
                return {
                    buffer,
                    type: 'unknown',
                    caption: ''
                };
            }
        } catch (fallbackErr) {}
        throw error;
    }
}

function cacheViewOnce(msg) {
    try {
        const inner = msg.message?.ephemeralMessage?.message || msg.message;
        if (inner?.viewOnceMessageV2 || inner?.viewOnceMessageV2Extension || inner?.viewOnceMessageV3) {
            global.viewOnceCache.set(msg.key.id, {
                message: { ...msg, message: inner },
                timestamp: Date.now()
            });
        }
    } catch {}
}

function unwrapMessage(msg) {
    if (!msg.message) return msg;
    if (msg.message.ephemeralMessage) {
        msg.message = msg.message.ephemeralMessage.message;
    }
    if (msg.message.viewOnceMessage) {
        msg.message = msg.message.viewOnceMessage.message;
    }
    if (msg.message.viewOnceMessageV2) {
        msg.message = msg.message.viewOnceMessageV2.message;
    }
    if (msg.message.viewOnceMessageV2Extension) {
        msg.message = msg.message.viewOnceMessageV2Extension.message;
    }
    if (msg.message.viewOnceMessageV3) {
        msg.message = msg.message.viewOnceMessageV3.message;
    }
    if (msg.message.documentWithCaptionMessage) {
        msg.message = msg.message.documentWithCaptionMessage.message;
    }
    return msg;
}

function getNomeContatto(jid) {
    try {
        if (!global.conn || !jid) return null;
        const contacts = global.conn.contacts || {};
        const contact = contacts[jid] || contacts[global.normalizeJid(jid)];
        return contact?.name || contact?.notify || contact?.verifiedName || null;
    } catch {
        return null;
    }
}

function logMessaggio(msg, numeroPersona, senderJid) {
    try {
        if (!msg.message || msg.key.fromMe) return;
        const ora = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        const chatId = msg.key.remoteJid;
        const tipoChat = chatId.includes("@g.us") ? "𝐠𝐫𝐮𝐩𝐩𝐨" : "𝐩𝐫𝐢𝐯𝐚𝐭𝐨";
        const tipoMessaggio = Object.keys(msg.message)[0] || "unknown";

        const nomeContatto = senderJid ? getNomeContatto(senderJid) : null;
        const pushName = msg.pushName || msg.verifiedBizName || null;
        const nomeFinale = nomeContatto || pushName || null;

        const mittente = nomeFinale ? `${nomeFinale} (${numeroPersona})` : numeroPersona;

        let contenuto = "";
        switch (tipoMessaggio) {
            case "conversation":        contenuto = msg.message.conversation; break;
            case "extendedTextMessage": contenuto = msg.message.extendedTextMessage?.text; break;
            case "imageMessage":        contenuto = msg.message.imageMessage?.caption || "foto"; break;
            case "videoMessage":        contenuto = msg.message.videoMessage?.caption || "video"; break;
            case "audioMessage":        contenuto = msg.message.audioMessage?.ptt ? "vocale" : "audio"; break;
            case "stickerMessage":      contenuto = "sticker"; break;
            case "documentMessage":     contenuto = msg.message.documentMessage?.fileName || "documento"; break;
            case "sendPaymentMessage":          contenuto = "💸 pagamento inviato"; break;
            case "requestPaymentMessage":       contenuto = "💸 richiesta di pagamento"; break;
            case "declinePaymentRequestMessage": contenuto = "💸 pagamento rifiutato"; break;
            case "cancelPaymentRequestMessage":  contenuto = "💸 pagamento annullato"; break;
            case "paymentInviteMessage":         contenuto = "💸 invito al pagamento"; break;
            default:                    contenuto = tipoMessaggio.replace("Message", "").toLowerCase(); break;
        }
        if (contenuto && contenuto.length > 45) contenuto = contenuto.substring(0, 42) + "...";
        console.log(`[${ora}] [${tipoChat}] ${mittente} -> ${contenuto}`);
    } catch (e) {}
}

function logGruppoUpdate(update) {
    try {
        const ora = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        const utenti = update.participants.map(u => jidPhone(u));
        const actorJid = (update.author || update.actor) ? global.normalizeJid(update.author || update.actor) : null;
        const actorNum = actorJid ? actorJid.split('@')[0].replace(/\D/g, '') : null;
        const actorNome = actorJid ? getNomeContatto(actorJid) : null;
        const autore = actorNum ? (actorNome ? `${actorNome} (${actorNum})` : actorNum) : "sconosciuto";

        console.log(`[${ora}] [${update.action}] ${autore} -> ${utenti.join(", ")}`);
    } catch (e) {}
}

async function gestisciAntinuke(update, conn) {
    try {
        const { id: groupId, participants, action } = update;
        if (!groupId?.endsWith('@g.us')) return;
        if (!['promote', 'demote', 'remove'].includes(action)) return;

        const { getChat } = await import('./database.js');
        const chatData = getChat(groupId, false);
        if (!chatData?.antinuke) return;

        const rawAuthor = update.author || update.actor;
        if (!rawAuthor) return;

        const actorJid = global.normalizeJid ? global.normalizeJid(rawAuthor) : rawAuthor;
        const actorNum = actorJid.split('@')[0].replace(/\D/g, '');

        const groupMetadata = await conn.groupMetadata(groupId).catch(() => null);
        if (!groupMetadata) return;

        const groupParticipants = groupMetadata.participants || [];
        const botJid = global.normalizeJid ? global.normalizeJid(conn.user?.id) : conn.user?.id;
        const botNum = botJid ? botJid.split('@')[0].replace(/\D/g, '') : '';

        function getNum(jid) {
            if (!jid) return '';
            return jid.split('@')[0].replace(/\D/g, '');
        }

        if (action === 'remove') {
            const isSelfLeave = participants.some(p => {
                const pJid = global.normalizeJid ? global.normalizeJid(participantJid(p)) : participantJid(p);
                return pJid === actorJid;
            });
            
            if (isSelfLeave) return;
        }

        function isAuthorized(jid) {
            const ruoli = global.sistemaRuoli || sistemaRuoli;
            const nums = global.jidTools?.candidates(jid) || [getNum(jid)];
            if (nums.includes(botNum)) return true;
            // owner + whitelist del gruppo (gestita con .addwl / .delwl)
            if (ruoli.isWhitelisted(jid, groupId)) return true;

            const p = groupParticipants.find(p => global.jidTools.participantMatches(p, jid));
            if (p?.admin === 'superadmin') return true;
            return false;
        }

        if (isAuthorized(actorJid)) return;

        const ora = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

        await conn.groupParticipantsUpdate(groupId, [actorJid], 'demote').catch(() => {});

        if (action === 'promote') {
            await conn.groupParticipantsUpdate(groupId, participants, 'demote').catch(() => {});
        } else if (action === 'demote') {
            await conn.groupParticipantsUpdate(groupId, participants, 'promote').catch(() => {});
        }

        await conn.groupSettingUpdate(groupId, 'announcement').catch(() => {});

        const testoAvviso = `𝐚𝐧𝐭𝐢𝐧𝐮𝐤𝐞\n\n𝐮𝐭𝐞𝐧𝐭𝐞: @${actorNum}\n𝐚𝐳𝐢𝐨𝐧𝐞: ${action}\n𝐨𝐫𝐚: ${ora}`;
        await conn.sendMessage(groupId, { text: testoAvviso, mentions: [actorJid] }).catch(() => {});

    } catch (e) {}
}

let reconnectTimer = null;

async function connectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;
    if (qr && opzione === '1' && !global.qrGenerated) {
        console.log('𝐪𝐫 𝐠𝐞𝐧𝐞𝐫𝐚𝐭𝐨');
        global.qrGenerated = true;
    }
    if (connection === 'open') {
        try { learnPair(global.conn.user?.id, global.conn.user?.lid); } catch {}
        global.qrGenerated = false;
        if (!global.isLogoPrinted) {
            console.log('𝐜𝐨𝐧𝐧𝐞𝐬𝐬𝐨');
            console.log(`𝐧𝐨𝐦𝐞: ${global.conn.user?.name || 'N/A'}`);
            console.log(`𝐧𝐮𝐦𝐞𝐫𝐨: ${jidPhone(global.conn.user?.id) || 'N/A'}`);
            global.isLogoPrinted = true;
        }

        const restartPath = join(process.cwd(), 'restart.json');
        if (existsSync(restartPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(restartPath, 'utf-8'));
                if (data?.chat) {
                    await global.conn.sendMessage(data.chat, {
                        text: '> *bot riavviato.*'
                    });
                }
                fs.unlinkSync(restartPath);
            } catch (e) {}
        }
    }
    if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log('𝐝𝐢𝐬𝐜𝐨𝐧𝐧𝐞𝐬𝐬𝐨');
        
        if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession || statusCode === 401) {
            console.log('[𝐬𝐢𝐬𝐭𝐞𝐦𝐚] 𝐬𝐞𝐬𝐬𝐢𝐨𝐧𝐞 𝐬𝐜𝐚𝐝𝐮𝐭𝐚 𝐨 𝐧𝐨𝐧 𝐯𝐚𝐥𝐢𝐝𝐚. 𝐫𝐢𝐦𝐨𝐳𝐢𝐨𝐧𝐞 𝐢𝐧 𝐜𝐨𝐫𝐬𝐨...');
            try {
                if (existsSync(global.authFile)) {
                    rmSync(global.authFile, { recursive: true, force: true });
                }
            } catch (e) {}
            process.exit(0);
        } else {
            if (!reconnectTimer) {
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    global.reloadHandler(true).catch(e => console.error('[𝐬𝐢𝐬𝐭𝐞𝐦𝐚] 𝐫𝐢𝐜𝐨𝐧𝐧𝐞𝐬𝐬𝐢𝐨𝐧𝐞 𝐟𝐚𝐥𝐥𝐢𝐭𝐚:', e.message));
                }, 3000);
            }
        }
    }
}

async function reloadRuoli() {
    try {
        const ruoliPath = pathToFileURL(join(__dirname, 'ruoli.js')).toString() + `?update=${Date.now()}`;
        const nuovoRuoli = await import(ruoliPath);
        global.sistemaRuoli = nuovoRuoli.default;
        return true;
    } catch (error) {
        return false;
    }
}

global.reloadHandler = async function (restartConn) {
    try {
        if (restartConn || !global.conn) {
            try {
                if (global.conn?.ws) global.conn.ws.close();
            } catch { }
            if (global.conn?.ev) global.conn.ev.removeAllListeners();
            global.conn = makeWASocket(connectionOptions);
            patchGroupMetadata(global.conn);
            patchConn(global.conn);
            global.conn.ev.on('lid-mapping.update', (u) => {
                try { for (const x of [].concat(u || [])) learnPair(x.lid, x.pn || x.phoneNumber); } catch {}
            });
            for (const evName of ['contacts.upsert', 'contacts.update']) {
                global.conn.ev.on(evName, (cs) => {
                    try { for (const c of cs || []) learnPair(c.id, c.lid || c.phoneNumber); } catch {}
                });
            }
            global.conn.ev.on('groups.update', (ups) => {
                for (const u of ups || []) if (u?.id) global.groupMetadataCache.delete(u.id);
            });
            isInit = true;
        }
        
        if (!isInit) {
            global.conn.ev.off('messages.upsert', global.conn.handler);
            global.conn.ev.off('group-participants.update', global.conn.groupUpdateHandler);
            global.conn.ev.off('connection.update', global.conn.connectionUpdate);
            global.conn.ev.off('creds.update', global.conn.credsUpdate);
        }
        
        global.conn.handler = async (m) => {
            try {
                if (!m.messages || m.messages.length === 0) return;
                
                for (const msg of m.messages) {
                    if (!msg.message || msg.key.fromMe) continue;
                    
                    const chatId = msg.key.remoteJid;
                    const isGroup = chatId.includes('@g.us');
                    // impara la corrispondenza LID <-> numero dal messaggio stesso
                    try {
                        learnPair(msg.key.participant, msg.key.participantPn || msg.key.participantAlt);
                        learnPair(msg.key.remoteJid, msg.key.remoteJidAlt);
                    } catch {}

                    // Se il gruppo è in fase di warm-up (bot o utente appena
                    // aggiunti senza link d'invito), rimanda il processing del
                    // messaggio a dopo, invece di processarlo subito con un
                    // sender/ruolo potenzialmente non risolto.
                    if (isGroup && global.gruppiInWarmup.has(chatId)) {
                        const pending = global.warmupQueue.get(chatId) || [];
                        pending.push(() => global.conn.handler({ messages: [msg] }));
                        global.warmupQueue.set(chatId, pending);
                        continue;
                    }

                    let senderJid;
                    
                    if (isGroup) {
                        senderJid = msg.key.participant || chatId;
                        senderJid = global.normalizeJid(senderJid);
                    } else {
                        senderJid = chatId;
                        senderJid = global.normalizeJid(senderJid);
                    }
                    
                    // Salva i view-once prima di rimuovere i wrapper, poi unwrap esplicito
                    cacheViewOnce(msg);
                    unwrapMessage(msg);

                    const numeroPersona = jidPhone(senderJid);
                    logMessaggio(msg, numeroPersona, senderJid);
                    
                    if (msg.message.buttonsResponseMessage) {
                        const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
                        if (buttonId && buttonId.startsWith(global.prefissoComandi)) {
                            const fakeMsg = {
                                ...msg,
                                message: { conversation: buttonId },
                                text: buttonId
                            };
                            processMessage(fakeMsg);
                        }
                        continue;
                    }
                    
                    if (msg.message.listResponseMessage) {
                        const listResp = msg.message.listResponseMessage;
                        const rowId = listResp.singleSelectReply?.selectedRowId;
                        if (rowId && rowId.startsWith(global.prefissoComandi)) {
                            const fakeMsg = {
                                ...msg,
                                message: { conversation: rowId },
                                text: rowId
                            };
                            processMessage(fakeMsg);
                        }
                        continue;
                    }
                    
                    if (msg.message.interactiveResponseMessage) {
                        const interactive = msg.message.interactiveResponseMessage;
                        if (interactive.nativeFlowResponseMessage) {
                            try {
                                const params = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson || '{}');
                                const id = params.id || params.display_text;
                                if (id && id.startsWith(global.prefissoComandi)) {
                                    const fakeMsg = {
                                        ...msg,
                                        message: { conversation: id },
                                        text: id
                                    };
                                    processMessage(fakeMsg);
                                }
                            } catch (e) {}
                        }
                        continue;
                    }
                    
                    if (msg.message.pollCreationMessageV3 || msg.message.pollCreationMessage) {
                        const poll = msg.message.pollCreationMessageV3 || msg.message.pollCreationMessage;
                        const pollId = poll.pollId || msg.key.id;
                        global.pollCache.set(pollId, {
                            message: msg,
                            pollData: poll,
                            timestamp: Date.now()
                        });
                    }
                    
                    let quoted = null;
                    const ext = msg.message.extendedTextMessage;
                    if (ext?.contextInfo?.quotedMessage) {
                        const qm = ext.contextInfo.quotedMessage;
                        const qText =
                            qm.conversation ||
                            qm.extendedTextMessage?.text ||
                            qm.imageMessage?.caption ||
                            qm.videoMessage?.caption ||
                            '';
                        quoted = {
                            text: qText,
                            message: qm,
                            sender: global.normalizeJid(ext.contextInfo.participant || senderJid),
                            chat: chatId,
                            id: ext.contextInfo.stanzaId
                        };
                    }
                    
                    let finalMsg = msg;
                    if (quoted) {
                        finalMsg = { ...msg, quoted };
                    }
                    
                    processMessage(finalMsg);
                }
                
            } catch (error) {
                console.error('𝐞𝐫𝐫𝐨𝐫𝐞:', error.message);
            }
        };
        
        global.conn.groupUpdateHandler = (update) => {
            if (update?.id) global.groupMetadataCache.delete(update.id);
            logGruppoUpdate(update);

            if (update.action === 'add' && update.id?.endsWith('@g.us')) {
                const botJid = global.normalizeJid(global.conn.user?.id);
                const botNum = botJid ? botJid.split('@')[0].replace(/\D/g, '') : '';
                const addedNums = (update.participants || []).map(p => {
                    const n = global.normalizeJid(participantJid(p));
                    return n ? n.split('@')[0].replace(/\D/g, '') : '';
                });
                const botWasAdded = addedNums.includes(botNum);

                // Caso 1: il bot stesso è stato aggiunto -> i suoi metadata locali
                // del gruppo sono vuoti finché non facciamo un fetch forzato.
                // Caso 2: un utente qualsiasi è stato aggiunto senza link d'invito
                // -> aggiorniamo subito la cache invece di aspettare il prossimo
                // messaggio, così isAdmin/whitelist/vip non falliscono a vuoto.
                warmupGroup(global.conn, update.id, botWasAdded ? [global.conn.user?.id] : update.participants);
            }

            setImmediate(async () => {
                await gestisciAntinuke(update, global.conn);
                gestore.gestisciEventoGruppo(update, global.conn);
            });
        };
        
        global.conn.connectionUpdate = connectionUpdate;
        global.conn.credsUpdate = saveCreds;
        global.conn.downloadViewOnce = downloadViewOnceContent;
        
        global.conn.ev.on('messages.upsert', global.conn.handler);
        global.conn.ev.on('group-participants.update', global.conn.groupUpdateHandler);
        global.conn.ev.on('connection.update', global.conn.connectionUpdate);
        global.conn.ev.on('creds.update', global.conn.credsUpdate);
        
        isInit = false;
        return true;
    } catch (e) {
        throw e;
    }
};

process.on('uncaughtException', (err) => console.error('[𝐮𝐧𝐜𝐚𝐮𝐠𝐡𝐭𝐄𝐱𝐜𝐞𝐩𝐭𝐢𝐨𝐧]', err?.stack || err));
process.on('unhandledRejection', (err) => console.error('[𝐮𝐧𝐡𝐚𝐧𝐝𝐥𝐞𝐝𝐑𝐞𝐣𝐞𝐜𝐭𝐢𝐨𝐧]', err?.message || err));

process.on('SIGINT', () => {
    try { global.conn.ws.close(); } catch {}
    process.exit(0);
});

await global.reloadHandler(true);

if (!sessioneRegistrata() && opzione === '2') {
    let numero = '';
    let numeroValido = false;
    do {
        numero = await question('𝐧𝐮𝐦𝐞𝐫𝐨: ');
        numero = numero.replace(/[\s+\-()]/g, '');
        
        if (numero.startsWith('39')) {
            let numeroSenzaPrefisso = numero.substring(2);
            if (numeroSenzaPrefisso.startsWith('0')) {
                numeroSenzaPrefisso = numeroSenzaPrefisso.substring(1);
            }
            if (numeroSenzaPrefisso.length === 10) {
                numeroValido = true;
            }
        } else if (numero.length >= 10 && numero.length <= 15) {
            numeroValido = true;
        }
    } while (!numeroValido);
    
    setTimeout(async () => {
        try {
            const code = await global.conn.requestPairingCode(numero, 'CHR0M£IT');
            console.log(`𝐜𝐨𝐝𝐢𝐜𝐞: ${code}`);
        } catch (error) {
            console.error('𝐞𝐫𝐫𝐨𝐫𝐞 𝐜𝐨𝐝𝐢𝐜𝐞:', error.message);
            process.exit(0);
        }
    }, 3000);
}

const ruoliPath = join(__dirname, 'ruoli.js');
if (existsSync(ruoliPath)) {
    global.sistemaRuoli = sistemaRuoli;
    
    const ruoliWatcher = watch(ruoliPath, async (eventType) => {
        if (eventType === 'change') {
            await reloadRuoli();
        }
    });
    
    ruoliWatcher.on('error', () => {});
}
