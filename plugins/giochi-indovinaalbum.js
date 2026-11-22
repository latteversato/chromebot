import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUser, forceSave } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalize(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

function cleanTitle(title) {
    if (!title) return '';
    return title
        .split(/(?:\s+feat\.|\s+ft\.|\s+con|\s+with|\s+\(|\s+-)/i)[0]
        .trim();
}

const artistiItaliani = [
    "thasup", "sfera ebbasta", "geolier", "lazza", "rondodasosa", 
    "simba la rue", "baby gang", "capo plaza", "paky", "shiva", 
    "massimo pericolo", "madman", "gemitaiz", "nerissima serpe", 
    "artie 5ive", "ghali", "marracash", "guè", "gue pequeno", 
    "ernia", "frah quintale", "coeZ", "night skinny", "sick luke", 
    "drefgold", "chiello", "drillionaire", "tedua", "thasupreme",
    "tha supreme", "mambolosco", "vale pain", "neima ezza", "medy", 
    "kid yugi", "tony boy", "digital astro", "villabanks", "mikush",
    "quentin40", "niko pandetta", "lele blade", "mv killa", "yung snapp",
    "rose villain", "salmo", "noyz narcos", "bresh", "side baby"
];

const premi = {
    facile: 50,
    medio: 100,
    difficile: 1000
};

async function getRandomAlbum(artist = null) {
    const searchTerm = artist || artistiItaliani[Math.floor(Math.random() * artistiItaliani.length)];
    let found = null;
    let attempts = 0;
    let difficolta = 'medio';
    
    while (!found && attempts < 10) {
        try {
            const res = await axios.get('https://api.deezer.com/search/album', {
                params: { q: searchTerm, limit: 25 }
            });
            
            if (!res.data || !res.data.data || res.data.data.length === 0) {
                attempts++;
                continue;
            }
            
            const valid = res.data.data.filter(album => 
                album.cover_medium && 
                album.title && 
                album.artist?.name &&
                !album.title.toLowerCase().includes('remix') &&
                !album.title.toLowerCase().includes('deluxe') &&
                !album.title.toLowerCase().includes('edition') &&
                !album.title.toLowerCase().includes('(live)')
            );
            
            if (valid.length > 0) {
                const randomIndex = Math.floor(Math.random() * valid.length);
                found = valid[randomIndex];
                
                const titoloLength = found.title.length;
                if (titoloLength < 10) difficolta = 'facile';
                else if (titoloLength < 20) difficolta = 'medio';
                else difficolta = 'difficile';
            }
        } catch (e) {
            console.log('Errore ricerca album:', e.message);
        }
        attempts++;
    }
    
    if (!found) {
        const fallbackRes = await axios.get('https://api.deezer.com/chart/0/albums', {
            params: { limit: 20 }
        });
        const fallbackAlbums = fallbackRes.data?.data || [];
        if (fallbackAlbums.length > 0) {
            found = fallbackAlbums[Math.floor(Math.random() * fallbackAlbums.length)];
            
            const titoloLength = found.title.length;
            if (titoloLength < 10) difficolta = 'facile';
            else if (titoloLength < 20) difficolta = 'medio';
            else difficolta = 'difficile';
        }
    }
    
    if (!found) throw new Error('Nessun album trovato');
    
    return {
        title: found.title,
        cleanTitle: cleanTitle(found.title),
        artist: found.artist.name,
        cover: found.cover_medium || found.cover_big || found.cover,
        id: found.id,
        difficolta: difficolta,
        premio: premi[difficolta]
    };
}

const activeGames = new Map();

export default {
    command: ['indovinaalbum', 'ica', 'hint'],
    group: true,
    
    async execute(m, { conn, text, command }) {
        const chat = m.chat;
        
        if (command === 'hint') {
            if (!activeGames.has(chat)) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ *Non c\'è nessuna partita in corso!*' 
                }, { quoted: m });
            }
            
            const game = activeGames.get(chat);
            
            if (game.hintUsed) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ *Hai già usato l\'hint!*' 
                }, { quoted: m });
            }
            
            game.hintUsed = true;
            
            const titolo = game.album.title;
            let hint = '🔍 *Indizio:* ';
            
            for (let i = 0; i < titolo.length; i++) {
                if (titolo[i] === ' ') {
                    hint += '  ';
                } else if (Math.random() < 0.4) {
                    hint += titolo[i];
                } else {
                    hint += '▢';
                }
            }
            
            return conn.sendMessage(m.chat, { text: hint }, { quoted: m });
        }
        
        if (command === 'indovinaalbum' || command === 'ica') {
            if (activeGames.has(chat)) {
                return conn.sendMessage(m.chat, { 
                    text: '⚠️ *C\'è già una partita in corso in questo gruppo!*' 
                }, { quoted: m });
            }
            
            if (!text) {
                return conn.sendMessage(m.chat, {
                    text: `🖼️ *𝗜𝗡𝗗𝗢𝗩𝗜𝗡𝗔 𝗟'𝗔𝗟𝗕𝗨𝗠* 🖼️\n\nScegli la modalità di gioco:`,
                    buttons: [
                        { buttonId: `${global.prefissoComandi}ica generale`, buttonText: { displayText: '🎲 Generale' }, type: 1 },
                        { buttonId: `${global.prefissoComandi}ica specifico`, buttonText: { displayText: '🎤 Specifico' }, type: 1 }
                    ],
                    headerType: 1
                }, { quoted: m });
            }
            
            const args = text.toLowerCase().split(' ');
            
            if (args[0] === 'specifico') {
                if (args.length === 1) {
                    return conn.sendMessage(m.chat, {
                        text: `🎤 *𝗠𝗢𝗗𝗔𝗟𝗜𝗧À 𝗦𝗣𝗘𝗖𝗜𝗙𝗜𝗖𝗔* 🎤\n\nDigita il nome dell'artista dopo il comando:\n\nEsempio: *.ica specifico thasup*`,
                        headerType: 1
                    }, { quoted: m });
                }
                
                const artistName = args.slice(1).join(' ');
                return startGame(m, conn, chat, artistName);
            }
            
            if (args[0] === 'generale') {
                return startGame(m, conn, chat);
            }
            
            return conn.sendMessage(m.chat, { 
                text: '❌ *Comando non riconosciuto!*\n\nUsa:\n• *.ica* per il menu\n• *.ica generale* per modalità mista\n• *.ica specifico [artista]* per artista specifico' 
            }, { quoted: m });
        }
    },
    
    async before(m, { conn }) {
        const chat = m.chat;
        if (!activeGames.has(chat)) return false;
        
        const game = activeGames.get(chat);
        
        const isReplyToGame = m.quoted && (
            m.quoted.id === game.fullMessage?.key?.id ||
            m.quoted.id === game.fullMessage?.id
        );
        
        if (!isReplyToGame) return false;
        
        const userAnswer = normalize(m.text || '');
        const correctAnswerOriginal = normalize(game.album.title);
        const correctAnswerClean = normalize(game.album.cleanTitle);
        
        const userAnswerCleaned = normalize(cleanTitle(m.text || ''));
        
        if (!userAnswer || userAnswer.length < 2) return false;
        
        const calculateSimilarity = (a, b) => {
            if (a === b) return 1.0;
            
            const wordsA = a.split(' ');
            const wordsB = b.split(' ');
            
            const matches = wordsA.filter(wordA => 
                wordsB.some(wordB => wordB.includes(wordA) || wordA.includes(wordB))
            );
            
            return matches.length / Math.max(wordsA.length, wordsB.length);
        };
        
        const similarity1 = calculateSimilarity(userAnswer, correctAnswerOriginal);
        const similarity2 = calculateSimilarity(userAnswer, correctAnswerClean);
        const similarity3 = calculateSimilarity(userAnswerCleaned, correctAnswerClean);
        
        const maxSimilarity = Math.max(similarity1, similarity2, similarity3);
        
        const isCorrect = maxSimilarity >= 0.65;
        
        if (isCorrect) {
            clearInterval(game.interval);
            activeGames.delete(chat);
            
            const user = getUser(m.sender, true);
            let premioFinale = game.album.premio;
            
            if (game.hintUsed) {
                premioFinale = Math.floor(premioFinale / 2);
            }
            
            user.money = (parseInt(user.money) || 0) + premioFinale;
            forceSave();
            
            await conn.sendMessage(chat, { 
                delete: game.fullMessage.key 
            }).catch(() => {});
            
            const difficoltaEmoji = game.album.difficolta === 'facile' ? '🟢' : game.album.difficolta === 'medio' ? '🟡' : '🔴';
            const playAgainCommand = game.gameMode === 'specifico' 
                ? `${global.prefissoComandi}ica specifico ${game.artistName}`
                : `${global.prefissoComandi}ica generale`;
            
            const playAgainText = game.gameMode === 'specifico'
                ? `🎤 Gioca ancora (${game.artistName})`
                : '🔄 Gioca ancora';
            
            let messaggioPremio = `💰 *Vincita:* ${premioFinale}€`;
            if (game.hintUsed) {
                messaggioPremio = `💰 *Vincita:* ${premioFinale}€ (metà per l'hint)`;
            }
            
            await conn.sendMessage(chat, {
                text: `
╭─✅ 𝗥𝗜𝗦𝗣𝗢𝗦𝗧𝗔 𝗖𝗢𝗥𝗥𝗘𝗧𝗧𝗔 ✅─╮
│ 
│ 🎉 *Hai indovinato!*
│ 
│ 💿 *Album:* ${game.album.title}
│ 👤 *Artista:* ${game.album.artist}
│ ${difficoltaEmoji} *Difficoltà:* ${game.album.difficolta}
│ 
│ ${messaggioPremio}
│ 💵 *Saldo:* ${user.money}€
╰─────────────────╯`,
                buttons: [
                    { 
                        buttonId: playAgainCommand, 
                        buttonText: { displayText: playAgainText }, 
                        type: 1 
                    }
                ],
                headerType: 1
            }, { quoted: m });
            
            return true;
        }
        
        return false;
    }
};

async function startGame(m, conn, chat, artist = null) {
    try {
        const album = await getRandomAlbum(artist);
        
        const imageResponse = await axios.get(album.cover, { 
            responseType: 'arraybuffer',
            timeout: 10000
        });
        
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        
        const imagePath = path.join(tmpDir, `album_${Date.now()}.jpg`);
        fs.writeFileSync(imagePath, imageResponse.data);
        
        const difficoltaEmoji = album.difficolta === 'facile' ? '🟢' : album.difficolta === 'medio' ? '🟡' : '🔴';
        
        const caption = `
╭─🖼️ 𝗜𝗡𝗗𝗢𝗩𝗜𝗡𝗔 𝗟'𝗔𝗟𝗕𝗨𝗠 🖼️─╮
│ 
│ ⏰ *Tempo:* 40 secondi
│ ${artist ? `🎤 *Artista richiesto:* ${artist}\n│ ` : ''}👤 *Artista:* ${album.artist}
│ ${difficoltaEmoji} *Premio:* ${album.premio}€
│ 💡 *Usa .hint (dimezza il premio)*
│ 
│ 💬 Rispondi a questo messaggio con il titolo!
╰─────────────────╯`;
        
        const fullMessage = await conn.sendMessage(chat, {
            image: fs.readFileSync(imagePath),
            caption: caption
        }, { quoted: m });
        
        fs.unlinkSync(imagePath);
        
        const game = {
            album,
            timeLeft: 40,
            fullMessage: fullMessage,
            gameMode: artist ? 'specifico' : 'generale',
            artistName: artist || null,
            hintUsed: false,
            interval: setInterval(async () => {
                game.timeLeft -= 5;
                
                if (game.timeLeft <= 0) {
                    clearInterval(game.interval);
                    activeGames.delete(chat);
                    
                    await conn.sendMessage(chat, { 
                        delete: fullMessage.key 
                    }).catch(() => {});
                    
                    const playAgainCommand = game.gameMode === 'specifico' 
                        ? `${global.prefissoComandi}ica specifico ${game.artistName}`
                        : `${global.prefissoComandi}ica generale`;
                    
                    const playAgainText = game.gameMode === 'specifico'
                        ? `🎤 Gioca ancora (${game.artistName})`
                        : '🔄 Gioca ancora';
                    
                    await conn.sendMessage(chat, {
                        text: `
╭─⌛ 𝗧𝗘𝗠𝗣𝗢 𝗦𝗖𝗔𝗗𝗨𝗧𝗢 ⌛─╮
│ 
│ ❌ *Nessuno ha indovinato!*
│ 
│ 💿 *Album:* ${game.album.title}
│ 👤 *Artista:* ${game.album.artist}
│ 
╰─────────────────╯`,
                        buttons: [
                            { 
                                buttonId: playAgainCommand, 
                                buttonText: { displayText: playAgainText }, 
                                type: 1 
                            }
                        ],
                        headerType: 1
                    });
                    return;
                }
                
                const updatedCaption = `
╭─🖼️ 𝗜𝗡𝗗𝗢𝗩𝗜𝗡𝗔 𝗟'𝗔𝗟𝗕𝗨𝗠 🖼️─╮
│ 
│ ⏰ *Tempo:* ${game.timeLeft} secondi
│ ${artist ? `🎤 *Artista richiesto:* ${artist}\n│ ` : ''}👤 *Artista:* ${album.artist}
│ ${difficoltaEmoji} *Premio:* ${album.premio}€
│ 💡 *Usa .hint (dimezza il premio)*
│ 
│ 💬 Rispondi a questo messaggio con il titolo!
╰─────────────────╯`;
                
                await conn.sendMessage(chat, {
                    text: updatedCaption,
                    edit: fullMessage.key
                }).catch(() => {});
            }, 5000)
        };
        
        activeGames.set(chat, game);
        
    } catch (error) {
        console.error('Errore avvio gioco:', error);
        conn.sendMessage(chat, { 
            text: '❌ *Errore nel caricamento del gioco. Riprova più tardi.*' 
        }, { quoted: m });
        activeGames.delete(chat);
    }
}