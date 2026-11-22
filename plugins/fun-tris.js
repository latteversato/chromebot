import { addMoney, getUser } from '../database.js'

class TicTacToe {
    constructor(playerX, playerO) {
        this.playerX = playerX
        this.playerO = playerO
        this.board = [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ]
        this.currentTurn = playerX
        this.winner = null
        this.draw = false
    }

    render() {
        let arr = []
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (typeof this.board[i][j] === 'string') {
                    arr.push(this.board[i][j])
                } else {
                    arr.push(this.board[i][j])
                }
            }
        }
        return arr
    }

    play(player, pos) {
        if (this.winner || this.draw) return -1
        if (player !== this.currentTurn) return -2
        
        let row, col
        if (pos <= 3) {
            row = 0
            col = pos - 1
        } else if (pos <= 6) {
            row = 1
            col = pos - 4
        } else {
            row = 2
            col = pos - 7
        }
        
        if (typeof this.board[row][col] !== 'number') return -3
        
        this.board[row][col] = player === this.playerX ? 'X' : 'O'
        
        if (this.checkWinner()) {
            this.winner = player
        } else if (this.isBoardFull()) {
            this.draw = true
        } else {
            this.currentTurn = player === this.playerX ? this.playerO : this.playerX
        }
        
        return 0
    }

    checkWinner() {
        for (let i = 0; i < 3; i++) {
            if (this.board[i][0] === this.board[i][1] && this.board[i][1] === this.board[i][2]) {
                return true
            }
        }
        for (let i = 0; i < 3; i++) {
            if (this.board[0][i] === this.board[1][i] && this.board[1][i] === this.board[2][i]) {
                return true
            }
        }
        if (this.board[0][0] === this.board[1][1] && this.board[1][1] === this.board[2][2]) return true
        if (this.board[0][2] === this.board[1][1] && this.board[1][1] === this.board[2][0]) return true
        
        return false
    }

    isBoardFull() {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (typeof this.board[i][j] === 'number') return false
            }
        }
        return true
    }

    getSymbol(player) {
        return player === this.playerX ? 'X' : 'O'
    }
}

function updateUserStats(userId, win = false, lose = false, draw = false) {
    if (!userId) return
    
    const user = getUser(userId, true)
    if (!user) return
    
    if (win) {
        user.wins = (user.wins || 0) + 1
        user.exp = (user.exp || 0) + 50
        addMoney(userId, 200)
    } else if (lose) {
        user.losses = (user.losses || 0) + 1
        user.exp = (user.exp || 0) + 10
        addMoney(userId, 20)
    } else if (draw) {
        user.draws = (user.draws || 0) + 1
        user.exp = (user.exp || 0) + 20
        addMoney(userId, 50)
    }
}

const getPrefisso = () => global.prefissoComandi || '.'

export default {
    command: ['tris', 'ttt', 'xo', 'entra', 'esci'],
    group: true,
    tags: ['game'],
    
    async execute(m, { conn, usedPrefix, command, text, sender }) {
        conn.game = conn.game || {}
        const chatId = m.chat
        const prefisso = getPrefisso()
        
        if (command === 'esci') {
            let room = Object.values(conn.game).find(room => 
                room.id?.startsWith('tictactoe') && 
                room.game && 
                [room.game.playerX, room.game.playerO].includes(sender) &&
                room.state !== 'FINISHED'
            )
            
            if (!room) {
                return conn.sendMessage(chatId, { 
                    text: '❌ Non sei in nessuna partita attiva' 
                }, { quoted: m })
            }
            
            let winner = room.game.playerX === sender ? room.game.playerO : room.game.playerX
            let winnerName = winner ? '@' + winner.split('@')[0] : 'Sconosciuto'
            let loserName = '@' + sender.split('@')[0]
            
            if (winner) updateUserStats(winner, true, false)
            updateUserStats(sender, false, true)
            
            let msg = `🏳️ *IL GIOCATORE ${loserName} HA ABBANDONATO!*\n\n🎉 *VINCITORE: ${winnerName}* 🎉\n\n💰 *Vincita: 200 monete*`
            
            let mentions = []
            if (winner) mentions.push(winner)
            mentions.push(sender)
            
            if (room.x) await conn.sendMessage(room.x, { text: msg, mentions }, { quoted: m })
            if (room.o) await conn.sendMessage(room.o, { text: msg, mentions }, { quoted: m })
            
            delete conn.game[room.id]
            return
        }
        
        if (command === 'entra') {
            if (!text) {
                return conn.sendMessage(chatId, { 
                    text: `❌ Usa: ${prefisso}entra <nome_sala>` 
                }, { quoted: m })
            }
            
            let room = Object.values(conn.game).find(room => 
                room.state === 'WAITING' && 
                room.name === text
            )
            
            if (!room) {
                return conn.sendMessage(chatId, { 
                    text: `❌ Nessuna sala '${text}' in attesa` 
                }, { quoted: m })
            }
            
            if (room.x === chatId) {
                return conn.sendMessage(chatId, { 
                    text: '❌ Non puoi entrare nella tua stessa sala' 
                }, { quoted: m })
            }
            
            if (Object.values(conn.game).find(room => 
                room.id?.startsWith('tictactoe') && 
                room.game && 
                [room.game.playerX, room.game.playerO].includes(sender) &&
                room.state !== 'FINISHED'
            )) {
                return conn.sendMessage(chatId, { 
                    text: '❌ Stai già giocando con qualcuno' 
                }, { quoted: m })
            }
            
            room.o = chatId
            room.game.playerO = sender
            room.state = 'PLAYING'
            
            await conn.sendMessage(room.x, { 
                text: '🕹️ Un giocatore si è unito, la partita sta iniziando!' 
            }, { quoted: m })
            
            await conn.sendMessage(room.o, { 
                text: '🕹️ Ti sei unito alla partita, la partita sta iniziando!' 
            }, { quoted: m })
            
            let users = global.db?.data?.users || {}
            let victoriesX = (room.game.playerX && users[room.game.playerX]?.wins) || 0
            let victoriesO = (room.game.playerO && users[room.game.playerO]?.wins) || 0
            let moneyX = (room.game.playerX && users[room.game.playerX]?.money) || 0
            let moneyO = (room.game.playerO && users[room.game.playerO]?.money) || 0
            
            let arr = room.game.render().map(v => {
                return {
                    'X': '❌',
                    'O': '⭕',
                    1: '1️⃣',
                    2: '2️⃣',
                    3: '3️⃣',
                    4: '4️⃣',
                    5: '5️⃣',
                    6: '6️⃣',
                    7: '7️⃣',
                    8: '8️⃣',
                    9: '9️⃣',
                }[v]
            })
            
            let str = `
❌ = @${room.game.playerX?.split('@')[0] || '?'} 🏆 ${victoriesX} 💰 ${moneyX}
⭕ = @${room.game.playerO?.split('@')[0] || '?'} 🏆 ${victoriesO} 💰 ${moneyO}

┌───┬───┬───┐
│ ${arr[0]} │ ${arr[1]} │ ${arr[2]} │
├───┼───┼───┤
│ ${arr[3]} │ ${arr[4]} │ ${arr[5]} │
├───┼───┼───┤
│ ${arr[6]} │ ${arr[7]} │ ${arr[8]} │
└───┴───┴───┘

🎮 *TURNO DI:* @${room.game.currentTurn?.split('@')[0] || '?'}

💰 *Vincita:* 200 monete
📌 *USA I NUMERI DA 1 A 9 PER GIOCARE*
❌ *ESCI:* ${prefisso}esci
`.trim()
            
            let mentions = []
            if (room.game.playerX) mentions.push(room.game.playerX)
            if (room.game.playerO) mentions.push(room.game.playerO)
            if (room.game.currentTurn) mentions.push(room.game.currentTurn)
            
            if (room.x && room.x !== room.o) {
                await conn.sendMessage(room.x, { text: str, mentions }, { quoted: m })
            }
            if (room.o) {
                await conn.sendMessage(room.o, { text: str, mentions }, { quoted: m })
            }
            
            return
        }
        
        if (command === 'tris' || command === 'ttt' || command === 'xo') {
            if (Object.values(conn.game).find(room => 
                room.id?.startsWith('tictactoe') && 
                room.game && 
                [room.game.playerX, room.game.playerO].includes(sender) &&
                room.state !== 'FINISHED'
            )) {
                return conn.sendMessage(chatId, { 
                    text: '❌ Stai già giocando con qualcuno' 
                }, { quoted: m })
            }
            
            if (text && /^[1-9]$/.test(text)) {
                let room = Object.values(conn.game).find(room => 
                    room.state === 'PLAYING' && 
                    room.game && 
                    [room.game.playerX, room.game.playerO].includes(sender)
                )
                
                if (!room) {
                    return conn.sendMessage(chatId, { 
                        text: '❌ Non sei in nessuna partita attiva' 
                    }, { quoted: m })
                }
                
                let pos = parseInt(text)
                let result = room.game.play(sender, pos)
                
                if (result === -1) {
                    return conn.sendMessage(chatId, { 
                        text: '❌ Partita già finita' 
                    }, { quoted: m })
                }
                
                if (result === -2) {
                    return conn.sendMessage(chatId, { 
                        text: `❌ Non è il tuo turno, tocca a @${room.game.currentTurn?.split('@')[0] || '?'}`,
                        mentions: room.game.currentTurn ? [room.game.currentTurn] : []
                    }, { quoted: m })
                }
                
                if (result === -3) {
                    return conn.sendMessage(chatId, { 
                        text: '❌ Casella già occupata' 
                    }, { quoted: m })
                }
                
                let users = global.db?.data?.users || {}
                let victoriesX = (room.game.playerX && users[room.game.playerX]?.wins) || 0
                let victoriesO = (room.game.playerO && users[room.game.playerO]?.wins) || 0
                let moneyX = (room.game.playerX && users[room.game.playerX]?.money) || 0
                let moneyO = (room.game.playerO && users[room.game.playerO]?.money) || 0
                
                let arr = room.game.render().map(v => {
                    return {
                        'X': '❌',
                        'O': '⭕',
                        1: '1️⃣',
                        2: '2️⃣',
                        3: '3️⃣',
                        4: '4️⃣',
                        5: '5️⃣',
                        6: '6️⃣',
                        7: '7️⃣',
                        8: '8️⃣',
                        9: '9️⃣',
                    }[v]
                })
                
                let str = `
❌ = @${room.game.playerX?.split('@')[0] || '?'} 🏆 ${victoriesX} 💰 ${moneyX}
⭕ = @${room.game.playerO?.split('@')[0] || '?'} 🏆 ${victoriesO} 💰 ${moneyO}

┌───┬───┬───┐
│ ${arr[0]} │ ${arr[1]} │ ${arr[2]} │
├───┼───┼───┤
│ ${arr[3]} │ ${arr[4]} │ ${arr[5]} │
├───┼───┼───┤
│ ${arr[6]} │ ${arr[7]} │ ${arr[8]} │
└───┴───┴───┘
`.trim()
                
                if (room.game.winner) {
                    let winner = room.game.winner
                    let loser = winner === room.game.playerX ? room.game.playerO : room.game.playerX
                    
                    if (winner) updateUserStats(winner, true, false)
                    if (loser) updateUserStats(loser, false, true)
                    
                    str += `\n\n🎉 *VINCITORE: @${winner?.split('@')[0] || '?'}* 🎉\n💰 *Hai vinto 200 monete!*`
                    room.state = 'FINISHED'
                    
                } else if (room.game.draw) {
                    if (room.game.playerX) updateUserStats(room.game.playerX, false, false, true)
                    if (room.game.playerO) updateUserStats(room.game.playerO, false, false, true)
                    
                    str += `\n\n🤝 *PAREGGIO* 🤝\n💰 *50 monete a testa!*`
                    room.state = 'FINISHED'
                    
                } else {
                    str += `\n\n🎮 *TURNO DI:* @${room.game.currentTurn?.split('@')[0] || '?'}`
                }
                
                str += `\n\n📌 *USA I NUMERI DA 1 A 9 PER GIOCARE*\n❌ *ESCI:* ${prefisso}esci`
                
                let mentions = []
                if (room.game.playerX) mentions.push(room.game.playerX)
                if (room.game.playerO) mentions.push(room.game.playerO)
                if (room.game.currentTurn && !room.game.winner && !room.game.draw) mentions.push(room.game.currentTurn)
                if (room.game.winner) mentions = [room.game.winner]
                if (room.game.draw) mentions = [room.game.playerX, room.game.playerO].filter(Boolean)
                
                if (room.x && room.x !== room.o) {
                    await conn.sendMessage(room.x, { text: str, mentions }, { quoted: m })
                }
                if (room.o) {
                    await conn.sendMessage(room.o, { text: str, mentions }, { quoted: m })
                }
                
                if (room.game.winner || room.game.draw) {
                    setTimeout(() => {
                        delete conn.game[room.id]
                    }, 60000)
                }
                
                return
            }
            
            if (!text) {
                return conn.sendMessage(chatId, { 
                    text: `❌ Usa: ${prefisso}tris <nome_sala>\nEsempio: ${prefisso}tris sfida1` 
                }, { quoted: m })
            }
            
            let room = {
                id: 'tictactoe-' + (+new Date),
                x: chatId,
                o: '',
                game: new TicTacToe(sender, null),
                state: 'WAITING',
                name: text
            }
            
            let users = global.db?.data?.users || {}
            let victoriesX = (users[sender]?.wins) || 0
            let moneyX = (users[sender]?.money) || 0
            
            let str = `
══════ •⊰✧⊱• ══════
*🕹️ TRIS - MULTIPLAYER*
══════════════

👤 *CREATORE:* @${sender.split('@')[0]} 🏆 ${victoriesX} 💰 ${moneyX}
📋 *SALA:* ${text}
⏳ *STATO:* IN ATTESA
💰 *Vincita:* 200 monete

══════════════
*📌 PER ENTRARE:*
${prefisso}entra ${text}

*❌ PER USCIRE:*
${prefisso}esci
══════ •⊰✧⊱• ══════`.trim()
            
            await conn.sendMessage(chatId, { 
                text: str, 
                mentions: [sender] 
            }, { quoted: m })
            
            conn.game[room.id] = room
        }
    }
}