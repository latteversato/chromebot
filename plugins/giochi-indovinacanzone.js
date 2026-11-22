import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getUser, forceSave } from '../database.js';

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

async function getRandomItalianTrack(artist = null) {
    const artisti = [
        "Baby Gang", "Lazza", "Thasup", "Geolier", "Sfera Ebbasta", "Shiva", 
        "Capo Plaza", "Tony Effe", "Simba La Rue", "Rondo Da Sosa", "Paky", 
        "Neima Ezza", "Il Tre", "Anna", "Medy", "Vale Pain", "Nayt", "Salmo", 
        "Guè", "Ernia", "Gemitaiz", "Emis Killa", "Villabanks", "Tony Boy", 
        "Artie 5ive", "Ghali", "Noyz Narcos", "Slings", "Niky Savage", "Papa V", 
        "Nerissima Serpe", "IL GHOST", "Sick Luke", "Drillionaire", "Night Skinny", 
        "Tha Supreme", "Kiid", "Ddusi", "Sadturs", "MILES", "Wairaki"
    ];

    const searchTerm = artist || artisti[Math.floor(Math.random() * artisti.length)];
    
    try {
        const response = await axios.get('https://itunes.apple.com/search', {
            params: {
                term: searchTerm,
                country: 'IT',
                media: 'music',
                limit: 25
            }
        });

        const validTracks = response.data.results.filter(track => 
            track.previewUrl && track.trackName && track.artistName
        );

        if (validTracks.length === 0) {
            throw new Error('Nessuna traccia trovata');
        }

        const selectedTrack = validTracks[Math.floor(Math.random() * validTracks.length)];
        
        return {
            title: selectedTrack.trackName,
            cleanTitle: cleanTitle(selectedTrack.trackName),
            artist: selectedTrack.artistName,
            preview: selectedTrack.previewUrl
        };
    } catch (error) {
        console.error('Errore nella ricerca della traccia:', error);
        throw new Error('Errore nel caricamento della canzone');
    }
}

const activeGames = new Map();

export default {
  command: ['indovinacanzone', 'ic'],
  group: true,
  
  async execute(m, { conn, text }) {
    const chat = m.chat;

    if (activeGames.has(chat)) {
        return conn.sendMessage(m.chat, { 
            text: '⚠️ *C\'è già una partita in corso in questo gruppo!*' 
        }, { quoted: m });
    }

    if (!text) {
        return conn.sendMessage(m.chat, {
            text: `🎧 *𝗜𝗡𝗗𝗢𝗩𝗜𝗡𝗔 𝗟𝗔 𝗖𝗔𝗡𝗭𝗢𝗡𝗘* 🎧\n\nScegli la modalità di gioco:`,
            buttons: [
                { buttonId: `${global.prefissoComandi}ic generale`, buttonText: { displayText: '🎲 Modalità Generale' }, type: 1 },
                { buttonId: `${global.prefissoComandi}ic specifico`, buttonText: { displayText: '🎤 Modalità Specifica' }, type: 1 }
            ],
            headerType: 1
        }, { quoted: m });
    }

    const args = text.toLowerCase().split(' ');
    
    if (args[0] === 'specifico') {
        if (args.length === 1) {
            return conn.sendMessage(m.chat, {
                text: `🎤 *𝗠𝗢𝗗𝗔𝗟𝗜𝗧À 𝗦𝗣𝗘𝗖𝗜𝗙𝗜𝗖𝗔* 🎤\n\nDigita il nome dell'artista dopo il comando:\n\nEsempio: *.ic specifico sfera ebbasta*`,
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
        text: '❌ *Comando non riconosciuto!*\n\nUsa:\n• *.ic* per il menu\n• *.ic generale* per modalità mista\n• *.ic specifico [artista]* per artista specifico' 
    }, { quoted: m });
  },
  
  async before(m, { conn }) {
    const chat = m.chat;
    if (!activeGames.has(chat)) return false;

    const game = activeGames.get(chat);
    
    const isReplyToGame = m.quoted && (
        m.quoted.id === game.message?.id || 
        m.quoted.id === game.message?.key?.id
    );

    if (!isReplyToGame) return false;

    const userAnswer = normalize(m.text || '');
    const correctAnswerOriginal = normalize(game.track.title);
    const correctAnswerClean = normalize(game.track.cleanTitle);
    
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
    
    const isCorrect = maxSimilarity >= 0.6;

    if (isCorrect) {
        clearInterval(game.interval);
        activeGames.delete(chat);

        const reward = Math.floor(Math.random() * 100) + 50;
        const exp = 500;

        const user = getUser(m.sender, true);
        user.money = (parseInt(user.money) || 0) + reward;
        user.exp = (parseInt(user.exp) || 0) + exp;
        forceSave();

        await conn.sendMessage(chat, { 
            delete: game.message.key 
        }).catch(() => {});

        const playAgainCommand = game.gameMode === 'specifico' 
            ? `${global.prefissoComandi}ic specifico ${game.artistName}`
            : `${global.prefissoComandi}ic generale`;
        
        const playAgainText = game.gameMode === 'specifico'
            ? `🎤 Gioca ancora (${game.artistName})`
            : '🔄 Gioca ancora';

        await conn.sendMessage(chat, {
            text: `
╭─✅ 𝗥𝗜𝗦𝗣𝗢𝗦𝗧𝗔 𝗖𝗢𝗥𝗥𝗘𝗧𝗧𝗔 ✅─╮
│ 
│ 🎉 *Hai indovinato!*
│ 
│ 🎵 *Titolo originale:* ${game.track.title}
│ 👤 *Artista:* ${game.track.artist}
│ 
│ 💰 *Vincita:* ${reward}€
│ ⭐ *EXP:* ${exp}
│ 
│ 💵 *Saldo attuale:* ${user.money}€
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

    } else if (maxSimilarity >= 0.3) {
        await conn.sendMessage(chat, { 
            text: '🎯 *Ci sei quasi!* Riprova...' 
        }, { quoted: m });
        return true;
    }
    
    return false;
  }
};

async function startGame(m, conn, chat, artist = null) {
    try {
        const track = await getRandomItalianTrack(artist);
        const audioResponse = await axios.get(track.preview, { 
            responseType: 'arraybuffer',
            timeout: 10000
        });

        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const audioPath = path.join(tmpDir, `song_${Date.now()}.m4a`);
        fs.writeFileSync(audioPath, audioResponse.data);

        await conn.sendMessage(chat, {
            audio: fs.readFileSync(audioPath),
            mimetype: 'audio/mp4',
            ptt: true,
            fileName: 'canzone.m4a'
        }, { quoted: m });

        fs.unlinkSync(audioPath);

        const gameMessageText = `
╭─🎧 𝗜𝗡𝗗𝗢𝗩𝗜𝗡𝗔 𝗖𝗔𝗡𝗭𝗢𝗡𝗘 🎧─╮
│ 
│ ⏰ *Tempo:* 30 secondi
│ ${artist ? `🎤 *Artista richiesto:* ${artist}\n│ ` : ''}👤 *Artista canzone:* ${track.artist}
│ 
│ 💬 Rispondi con il titolo!
╰─────────────────╯`;

        const gameMessage = await conn.sendMessage(chat, { text: gameMessageText }, { quoted: m });

        const game = {
            track,
            timeLeft: 30,
            message: gameMessage,
            gameMode: artist ? 'specifico' : 'generale',
            artistName: artist || null,
            interval: setInterval(async () => {
                game.timeLeft -= 5;

                if (game.timeLeft <= 0) {
                    clearInterval(game.interval);
                    activeGames.delete(chat);
                    
                    await conn.sendMessage(chat, { 
                        delete: gameMessage.key 
                    }).catch(() => {});
                    
                    const playAgainCommand = game.gameMode === 'specifico' 
                        ? `${global.prefissoComandi}ic specifico ${game.artistName}`
                        : `${global.prefissoComandi}ic generale`;
                    
                    const playAgainText = game.gameMode === 'specifico'
                        ? `🎤 Gioca ancora (${game.artistName})`
                        : '🔄 Gioca ancora';
                    
                    await conn.sendMessage(chat, {
                        text: `
╭─⌛ 𝗧𝗘𝗠𝗣𝗢 𝗦𝗖𝗔𝗗𝗨𝗧𝗢 ⌛─╮
│ 
│ ❌ *Nessuno ha indovinato!*
│ 
│ 🎵 *Titolo originale:* ${game.track.title}
│ 🎵 *Titolo base:* ${game.track.cleanTitle}
│ 👤 *Artista:* ${game.track.artist}
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

                const updatedText = `
╭─🎧 𝗜𝗡𝗗𝗢𝗩𝗜𝗡𝗔 𝗖𝗔𝗡𝗭𝗢𝗡𝗘 🎧─╮
│ 
│ ⏰ *Tempo:* ${game.timeLeft} secondi
│ ${artist ? `🎤 *Artista richiesto:* ${artist}\n│ ` : ''}👤 *Artista canzone:* ${track.artist}
│ 
│ 💬 Rispondi con il titolo!
╰─────────────────╯`;

                await conn.sendMessage(chat, {
                    text: updatedText,
                    edit: gameMessage.key
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