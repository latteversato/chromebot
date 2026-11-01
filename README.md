
<div align="center">

# 🤖 ChromeBot

### Bot WhatsApp multifunzione — Moderazione, RPG, Giochi e tanto altro

![Node.js](https://img.shields.io/badge/Node.js-ES_Modules-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-WhatsApp_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Attivo-success?style=for-the-badge)

</div>

---

## 📋 Descrizione

**ChromeBot** è un bot WhatsApp veloce e reattivo, costruito in Node.js su libreria **Baileys** per garantire tempi di risposta minimi e massima stabilità anche sotto carico. Gestisce gruppi, economia RPG, giochi e strumenti multimediali con un'architettura a plugin leggera, pensata per restare performante anche con centinaia di comandi attivi contemporaneamente.

---

## ✨ Funzionalità principali

### 🛡️ Moderazione & Sicurezza gruppo
- Sistema **Anti-Nuke** per proteggere i gruppi da attacchi
- Anti-link, anti-spam, anti-tag, anti-TikTok
- Kick, mute, warn, promuovi/declassa admin
- Gestione richieste d'ingresso, benvenuto personalizzabile
- Sistema di ruoli custom e ruoli utente

### 💰 Sistema RPG / Economia
- Banca con deposito e prelievo
- Portafoglio, paghetta, bonifici tra utenti
- Sistema famiglia e matrimonio virtuale
- Adozioni, pet shop
- Rapine e classifica economica

### 🎮 Giochi & Intrattenimento
- Slot machine, indovina canzone/album
- Impiccato, tris, bandiera, miniera
- Roulette, bonk, carcere virtuale
- Bellometro, messaggiometro, quote casuali

### 🛠️ Strumenti utili
- Download da TikTok
- Ricerca e riproduzione media (play)
- Creazione sticker
- Conversione to-anime / to-ing
- Controllo numeri e ban check
- Generazione QR/server info

### 👑 Pannello Owner/Creatore
- Gestione VIP e whitelist
- Backup automatico del database
- Sistema di editing plugin live
- Ban/unban utenti e chat
- Statistiche dispositivo e gestione soldi globale

---

## 🧩 Tech Stack

| Tecnologia | Uso |
|---|---|
| **Node.js (ESM)** | Runtime principale |
| **@realvare/baileys** | Libreria di connessione WhatsApp |
| **LowDB / MongoDB** | Gestione database |
| **Canvas** | Generazione immagini dinamiche |
| **FFmpeg** | Elaborazione audio/video |
| **Google GenAI** | Funzionalità AI integrate |

---

## ⚙️ Installazione

Prima di iniziare, assicurati di avere un numero WhatsApp dedicato al bot (consigliato, per non rischiare il tuo numero personale).

---

### 🪟 Windows

**1. Installa Node.js**
Scarica e installa Node.js LTS da [nodejs.org](https://nodejs.org) (versione 18 o superiore consigliata).

**2. Installa Git**
Scarica Git da [git-scm.com](https://git-scm.com) se non lo hai già.

**3. Installa FFmpeg**
- Scarica FFmpeg da [ffmpeg.org](https://ffmpeg.org/download.html)
- Estrai l'archivio e aggiungi la cartella `bin` al PATH di sistema

**4. Clona ed esegui il bot**
Apri **PowerShell** o **Prompt dei comandi** nella cartella dove vuoi installarlo:

```bash
git clone https://github.com/latteversato/chromebot.git
cd chromebot
npm install
npm start
```

**5. Collega WhatsApp**
Scansiona il QR Code che apparirà nel terminale usando WhatsApp > Dispositivi collegati > Collega un dispositivo.

---

### 🐧 Linux (Ubuntu/Debian e derivate)

**1. Aggiorna il sistema e installa le dipendenze base**

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

**2. Installa Node.js (tramite NVM, consigliato)**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**3. Installa FFmpeg e librerie per Canvas**

```bash
sudo apt install -y ffmpeg
sudo apt install -y libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**4. Clona ed esegui il bot**

```bash
git clone https://github.com/latteversato/chromebot.git
cd chromebot
npm install
npm start
```

**5. Collega WhatsApp**
Scansiona il QR Code mostrato nel terminale.

> 💡 **Suggerimento:** per far girare il bot 24/7 su un server Linux, usa `pm2`:
> ```bash
> npm install -g pm2
> pm2 start index.js --name chromebot
> pm2 save
> pm2 startup
> ```

---

### 🍏 macOS

**1. Installa Homebrew** (se non lo hai già)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**2. Installa Node.js, Git e FFmpeg**

```bash
brew install node git ffmpeg
```

**3. Clona ed esegui il bot**

```bash
git clone https://github.com/latteversato/chromebot.git
cd chromebot
npm install
npm start
```

**4. Collega WhatsApp**
Scansiona il QR Code mostrato nel terminale.

---

### 📱 Termux (Android)

**1. Installa Termux**
Scarica Termux da [F-Droid](https://f-droid.org/packages/com.termux/) (sconsigliato il Play Store, versione obsoleta).

**2. Aggiorna i pacchetti e installa le dipendenze**

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs-lts git python ffmpeg libcairo libjpeg-turbo libpng pkg-config
```

**3. Concedi i permessi di storage (opzionale, se vuoi salvare file fuori da Termux)**

```bash
termux-setup-storage
```

**4. Clona ed esegui il bot**

```bash
git clone https://github.com/latteversato/chromebot.git
cd chromebot
npm install
npm start
```

**5. Collega WhatsApp**
Scansiona il QR Code mostrato nel terminale con WhatsApp.

> 💡 **Suggerimento:** per evitare che Termux chiuda il processo in background, usa `termux-wake-lock` prima di avviare il bot:
> ```bash
> termux-wake-lock
> npm start
> ```
> Puoi anche usare `tmux` o `screen` per mantenere il bot attivo anche chiudendo l'app Termux.

---

### ✅ Requisiti minimi comuni

| Requisito | Versione consigliata |
|---|---|
| Node.js | 18.x o superiore |
| npm | 9.x o superiore |
| FFmpeg | Ultima versione stabile |
| RAM | Almeno 512 MB disponibili |
| Connessione | Stabile, bot resta sempre online |

---

### ❗ Problemi comuni

- **Errore `node-gyp` durante `npm install`** → assicurati di avere `build-essential` (Linux) o Xcode Command Line Tools (macOS) installati.
- **Errore libreria Canvas** → su Linux/Termux verifica di aver installato `libcairo`, `libjpeg`, `libpango`.
- **QR Code non si collega** → assicurati che l'orario del dispositivo sia sincronizzato correttamente.

---

## 📁 Struttura del progetto

```
chromebot/
├── plugins/        # Tutti i comandi del bot, divisi per categoria
├── lib/             # Librerie di supporto (store, converter, ecc.)
├── db/              # Database JSON locali
├── media/           # File multimediali del bot
├── index.js         # Entry point principale
├── database.js       # Gestione database
├── vipManager.js     # Sistema gestione utenti VIP
└── ruoli.js          # Sistema di ruoli
```

---

## ⚠️ Avviso importante

> Questo repository **non deve mai includere** la cartella di sessione (`chromesession/`, `creds.json`) né i database contenenti dati reali degli utenti. Queste informazioni sono sensibili e personali: assicurati che siano presenti nel `.gitignore` prima di ogni push.

---

## 👤 Autore

Sviluppato e mantenuto da **Latte Versato**

---

<div align="center">

⭐️ Se ti piace questo progetto lascia una stella al repository!

</div>
```
