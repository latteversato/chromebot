import axios from 'axios';
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

async function getRandomItalianWord() {
    try {
        const response = await axios.get('https://random-word-api.herokuapp.com/word?lang=it&number=1');
        
        if (response.data && response.data.length > 0) {
            return response.data[0].toLowerCase();
        }
        
        throw new Error('Nessuna parola trovata');
    } catch (error) {
        console.error('Errore API parole:', error);
        
        const paroleFallback = [
            "ciao", "cane", "gatto", "casa", "scuola", "amico", "libro", 
            "sole", "luna", "stella", "montagna", "mare", "fiume", "foresta",
            "macchina", "treno", "aereo", "bicicletta", "telefono", "computer",
            "pizza", "pasta", "gelato", "cioccolato", "acqua", "fuoco", "vento",
            "felicità", "amore", "amicizia", "viaggio", "musica", "cinema",
            "gioco", "sport", "calcio", "basket", "tennis", "nuoto", "corsa"
        ];
        
        return paroleFallback[Math.floor(Math.random() * paroleFallback.length)];
    }
}

function displayWord(word, guessedLetters) {
    let display = '';
    for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        if (guessedLetters.includes(letter)) {
            display += letter + ' ';
        } else {
            display += '_ ';
        }
    }
    return display.trim();
}

const activeGames = new Map();

export default {
    command: ['imp', 'impl', 'impd'],
    group: true,
    
    async execute(m, { conn, text, command }) {
        const chat = m.chat;
        const user = getUser(m.sender, true);
        
        if (command === 'imp') {
            if (activeGames.has(chat)) {
                return conn.sendMessage(m.chat, { 
                    text: '⚠️ C\'è già una partita in corso in questo gruppo!' 
                });
            }
            
            const costoPartita = 50;
            
            if ((user.money || 0) < costoPartita) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Non hai abbastanza soldi! Ti mancano ${costoPartita - (user.money || 0)}€ (costo: ${costoPartita}€)` 
                });
            }
            
            user.money = (user.money || 0) - costoPartita;
            forceSave();
            
            try {
                await conn.sendMessage(m.chat, { 
                    text: '⏳ Caricando una parola casuale...' 
                });
                
                const parola = await getRandomItalianWord();
                
                await conn.sendMessage(m.chat, {
                    text: `╭─🎮 IMPICCATO 🎮─╮
│
│ 📝 Parola: ${displayWord(parola, [])}
│ ❌ Errori: 0/7
│ 💰 Premio: ${parola.length * 50}€
│
│ 📌 .impl [lettera] - Prova lettera
│ 📌 .impd [parola] - Indovina
╰─────────────────╯`
                });
                
                const game = {
                    word: parola,
                    guessedLetters: [],
                    errors: 0,
                    maxErrors: 7,
                    startedBy: m.sender,
                    prize: parola.length * 50
                };
                
                activeGames.set(chat, game);
                
            } catch (error) {
                console.error('Errore avvio impiccato:', error);
                conn.sendMessage(m.chat, { 
                    text: '❌ Errore nel caricamento. Riprova più tardi.' 
                });
                
                user.money = (user.money || 0) + costoPartita;
                forceSave();
            }
            
            return;
        }
        
        if (command === 'impl') {
            if (!activeGames.has(chat)) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ Nessuna partita in corso! Usa .imp per iniziare.' 
                });
            }
            
            if (!text || text.length !== 1) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ Devi inserire una sola lettera! Esempio: .impl a' 
                });
            }
            
            const game = activeGames.get(chat);
            const letter = normalize(text)[0];
            
            if (!/[a-z]/.test(letter)) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ Inserisci una lettera valida!' 
                });
            }
            
            if (game.guessedLetters.includes(letter)) {
                return conn.sendMessage(m.chat, { 
                    text: `❌ Lettera "${letter}" già provata!` 
                });
            }
            
            game.guessedLetters.push(letter);
            let messaggio = '';
            
            if (game.word.includes(letter)) {
                messaggio = `✅ Lettera "${letter}" corretta!`;
                
                const allLettersGuessed = game.word.split('').every(l => game.guessedLetters.includes(l));
                
                if (allLettersGuessed) {
                    activeGames.delete(chat);
                    
                    const premio = game.prize;
                    user.money = (parseInt(user.money) || 0) + premio;
                    forceSave();
                    
                    await conn.sendMessage(chat, {
                        text: `╭─🎉 HAI VINTO! 🎉─╮
│
│ 🎊 Complimenti!
│ 📝 Parola: ${game.word}
│ 💰 Premio: ${premio}€
│ 💵 Saldo: ${user.money}€
│
│ 📌 .imp - Gioca ancora
╰─────────────────╯`
                    });
                    
                    return;
                }
            } else {
                game.errors++;
                messaggio = `❌ Lettera "${letter}" sbagliata! Errori: ${game.errors}/7`;
                
                if (game.errors >= game.maxErrors) {
                    activeGames.delete(chat);
                    
                    await conn.sendMessage(chat, {
                        text: `╭─💀 HAI PERSO! 💀─╮
│
│ 😵 Sei stato impiccato!
│ 📝 Parola: ${game.word}
│
│ 📌 .imp - Gioca ancora
╰─────────────────╯`
                    });
                    
                    return;
                }
            }
            
            await conn.sendMessage(chat, {
                text: `╭─🎮 IMPICCATO 🎮─╮
│
│ 📝 Parola: ${displayWord(game.word, game.guessedLetters)}
│ ❌ Errori: ${game.errors}/7
│ 💰 Premio: ${game.prize}€
│ 🔤 Lettere: ${game.guessedLetters.join(', ')}
│
│ ${messaggio}
│
│ 📌 .impl [lettera] - Prova lettera
│ 📌 .impd [parola] - Indovina
╰─────────────────╯`
            });
            
            return;
        }
        
        if (command === 'impd') {
            if (!activeGames.has(chat)) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ Nessuna partita in corso! Usa .imp per iniziare.' 
                });
            }
            
            if (!text) {
                return conn.sendMessage(m.chat, { 
                    text: '❌ Devi inserire una parola! Esempio: .impd cane' 
                });
            }
            
            const game = activeGames.get(chat);
            const guess = normalize(text);
            
            if (guess === normalize(game.word)) {
                activeGames.delete(chat);
                
                const premio = game.prize;
                user.money = (parseInt(user.money) || 0) + premio;
                forceSave();
                
                await conn.sendMessage(chat, {
                    text: `╭─🎉 HAI VINTO! 🎉─╮
│
│ 🎊 Complimenti!
│ 📝 Parola: ${game.word}
│ 💰 Premio: ${premio}€
│ 💵 Saldo: ${user.money}€
│
│ 📌 .imp - Gioca ancora
╰─────────────────╯`
                });
                
                return;
            } else {
                game.errors += 2;
                
                if (game.errors >= game.maxErrors) {
                    activeGames.delete(chat);
                    
                    await conn.sendMessage(chat, {
                        text: `╭─💀 HAI PERSO! 💀─╮
│
│ 😵 Sei stato impiccato!
│ 📝 Parola: ${game.word}
│
│ 📌 .imp - Gioca ancora
╰─────────────────╯`
                    });
                    
                    return;
                }
                
                await conn.sendMessage(chat, {
                    text: `╭─🎮 IMPICCATO 🎮─╮
│
│ 📝 Parola: ${displayWord(game.word, game.guessedLetters)}
│ ❌ Errori: ${game.errors}/7
│ 💰 Premio: ${game.prize}€
│ 🔤 Lettere: ${game.guessedLetters.join(', ')}
│
│ ❌ Parola sbagliata! -2 errori
│
│ 📌 .impl [lettera] - Prova lettera
│ 📌 .impd [parola] - Indovina
╰─────────────────╯`
                });
            }
            
            return;
        }
    }
};