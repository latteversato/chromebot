import { getMoney, addMoney, removeMoney, getBank, addBank, removeBank } from '../database.js';

export default {
  command: ['resetsoldi'],
  owner: true,
  
  async execute(m, { conn }) {
    const users = global.db.data.users;
    let count = 0;
    
    for (let user in users) {
      if (users[user].money > 0 || users[user].bank > 0) {
        users[user].money = 0;
        users[user].bank = 0;
        count++;
      }
    }
    
    conn.sendMessage(m.chat, { 
      text: `✅ *Reset completato!*\nSono stati azzerati soldi e banca di *${count} utenti*.`
    });
  }
}