import fs from 'fs';
import path from 'path';
import syntaxError from 'syntax-error';

const _fs = fs.promises;

function findSimilarFiles(searchTerm, baseDir = process.cwd(), maxResults = 5) {
    const results = [];
    
    function searchRecursive(dir) {
        try {
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const fullPath = path.join(dir, file);
                
                try {
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('chrome-session')) {
                            searchRecursive(fullPath);
                        }
                    } else {
                        const fileName = path.basename(file, path.extname(file));
                        const similarity = calculateSimilarity(searchTerm.toLowerCase(), fileName.toLowerCase());
                        
                        if (similarity > 0.3) {
                            results.push({
                                path: fullPath,
                                name: file,
                                baseName: fileName,
                                similarity: similarity,
                                relativePath: path.relative(baseDir, fullPath)
                            });
                        }
                    }
                } catch (err) {
                    continue;
                }
            }
        } catch (err) {}
    }
    
    searchRecursive(baseDir);
    
    return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);
}

function calculateSimilarity(a, b) {
    const bigramsA = getBigrams(a);
    const bigramsB = getBigrams(b);
    const intersection = bigramsA.filter(bigram => bigramsB.includes(bigram));
    return (2 * intersection.length) / (bigramsA.length + bigramsB.length);
}

function getBigrams(str) {
    const bigrams = [];
    for (let i = 0; i < str.length - 1; i++) {
        bigrams.push(str.substring(i, i + 2));
    }
    return bigrams;
}

export default {
    command: ['getplugin', 'getfile', 'gp', 'gf', 'ottienifile', 'fileplugin', 'selectfile'],
    desc: 'Gestione file per owner',
    category: 'Owner',
    owner: true,

    async execute(m, extra) {
        const conn = extra?.conn || global.conn
        const chat = m.chat
        const args = extra.args || []
        const text = extra.text || ''
        const command = extra.command || ''
        const usedPrefix = global.prefissoComandi || '.'

        try {
            if (['getplugin', 'getfile', 'gp', 'gf'].includes(command)) {
                if (!text?.trim()) {
                    return conn.sendMessage(chat, {
                        text: `🔍 *RICERCA AVANZATA FILE*\n\n❓ Inserisci il nome o parte del nome del file\n📝 *Esempio:*\n${usedPrefix}gp owner\n${usedPrefix}gp menu\n${usedPrefix}gp delete`
                    }, { quoted: m })
                }

                const similarFiles = findSimilarFiles(text, process.cwd(), 5);
                
                if (similarFiles.length === 0) {
                    return conn.sendMessage(chat, {
                        text: `❌ *NESSUN FILE TROVATO*\n\nImpossibile trovare file simili a: "${text}"`
                    }, { quoted: m })
                }

                if (similarFiles.length === 1) {
                    const file = similarFiles[0];
                    const messaggio = `🎯 *FILE TROVATO*\n\n🗂️ *Nome:* ${file.name}\n📂 *Percorso:* ${file.relativePath}\n⭐ *Corrispondenza:* ${(file.similarity * 100).toFixed(1)}%\n📊 *Dimensione:* ${(fs.statSync(file.path).size / 1024).toFixed(2)} KB\n\n⚡ *Scegli un'azione:*`;

                    return await conn.sendMessage(chat, {
                        text: messaggio,
                        buttons: [
                            { buttonId: `${usedPrefix}fileplugin ${file.path}`, buttonText: { displayText: '📜 Vedi Codice' }, type: 1 },
                            { buttonId: `${usedPrefix}ottienifile ${file.path}`, buttonText: { displayText: '📥 Scarica File' }, type: 1 }
                        ],
                        viewOnce: true,
                        headerType: 1
                    }, { quoted: m })
                }

                let listaFile = `🔍 *RICERCA: "${text}"*\n\n📋 *File trovati (${similarFiles.length}):*\n\n`;
                
                similarFiles.forEach((file, index) => {
                    const percentuale = (file.similarity * 100).toFixed(1);
                    listaFile += `${index + 1}️⃣ *${file.name}*\n   📁 ${file.relativePath}\n   ⭐ ${percentuale}% corrispondenza\n\n`;
                });

                listaFile += `⚡ *Seleziona un file:*`;

                const buttons = similarFiles.map((file, index) => ({
                    buttonId: `${usedPrefix}selectfile ${file.path}`,
                    buttonText: { displayText: `${index + 1}️⃣ ${file.name}` },
                    type: 1
                }));

                await conn.sendMessage(chat, {
                    text: listaFile,
                    footer: 'CHROME Bot File Manager',
                    buttons: buttons,
                    headerType: 1
                }, { quoted: m })

            } else if (command === 'selectfile') {
                if (!text) {
                    return conn.sendMessage(chat, {
                        text: '❌ Specifica il percorso del file'
                    }, { quoted: m })
                }

                const filePath = text.trim();
                
                if (!fs.existsSync(filePath)) {
                    return conn.sendMessage(chat, {
                        text: `❌ File non trovato: ${filePath}`
                    }, { quoted: m })
                }

                if (fs.statSync(filePath).isDirectory()) {
                    return conn.sendMessage(chat, {
                        text: '❌ Non puoi selezionare una cartella'
                    }, { quoted: m })
                }

                const fileName = path.basename(filePath);
                const fileSize = (fs.statSync(filePath).size / 1024).toFixed(2);
                const relativePath = path.relative(process.cwd(), filePath);

                const messaggio = `🎯 *FILE SELEZIONATO*\n\n🗂️ *Nome:* ${fileName}\n📂 *Percorso:* ${relativePath}\n📊 *Dimensione:* ${fileSize} KB\n\n⚡ *Scegli un'azione:*`;

                await conn.sendMessage(chat, {
                    text: messaggio,
                    footer: 'CHROME Bot File Manager',
                    buttons: [
                        { buttonId: `${usedPrefix}fileplugin ${filePath}`, buttonText: { displayText: '📜 Vedi Codice' }, type: 1 },
                        { buttonId: `${usedPrefix}ottienifile ${filePath}`, buttonText: { displayText: '📥 Scarica File' }, type: 1 },
                        { buttonId: `${usedPrefix}gp ${path.basename(filePath, path.extname(filePath))}`, buttonText: { displayText: '🔍 Nuova Ricerca' }, type: 1 }
                    ],
                    viewOnce: true,
                    headerType: 1
                }, { quoted: m })

            } else if (command === 'ottienifile') {
                if (!text) {
                    return conn.sendMessage(chat, {
                        text: '❌ Specifica il percorso del file da scaricare'
                    }, { quoted: m })
                }

                let filePath = text.trim();
                
                if (!fs.existsSync(filePath)) {
                    return conn.sendMessage(chat, {
                        text: `❌ File non trovato: ${filePath}`
                    }, { quoted: m })
                }

                if (fs.statSync(filePath).isDirectory()) {
                    return conn.sendMessage(chat, {
                        text: '❌ Non puoi scaricare una cartella'
                    }, { quoted: m })
                }

                const buffer = await _fs.readFile(filePath);
                const fileName = path.basename(filePath);
                const fileSize = (buffer.length / 1024 / 1024).toFixed(2);

                await conn.sendMessage(chat, {
                    text: `📥 *DOWNLOAD COMPLETATO*\n\n🗂️ *File:* ${fileName}\n📊 *Dimensione:* ${fileSize} MB\n✅ File inviato con successo!`
                }, { quoted: m })

                return await conn.sendMessage(chat, {
                    document: buffer,
                    fileName: fileName,
                    mimetype: 'application/octet-stream'
                }, { quoted: m })

            } else if (command === 'fileplugin') {
                if (!text) {
                    return conn.sendMessage(chat, {
                        text: `📜 *VISUALIZZATORE CODICE*\n\nUtilizzo: ${usedPrefix}fileplugin <percorso>\n\nEsempi:\n${usedPrefix}fileplugin gestione.js\n${usedPrefix}fileplugin plugins/delete.js`
                    }, { quoted: m })
                }

                let pathFile = text.trim();
                
                if (!fs.existsSync(pathFile)) {
                    return conn.sendMessage(chat, {
                        text: `❌ File non trovato: ${pathFile}`
                    }, { quoted: m })
                }

                if (fs.statSync(pathFile).isDirectory()) {
                    return conn.sendMessage(chat, {
                        text: '❌ Non puoi visualizzare una cartella'
                    }, { quoted: m })
                }

                const fileExt = path.extname(pathFile).toLowerCase();
                const fileName = path.basename(pathFile);
                const relativePath = path.relative(process.cwd(), pathFile);
                
                if (['.js', '.json', '.txt', '.md', '.ts', '.html', '.css', '.xml'].includes(fileExt)) {
                    const fileContent = await _fs.readFile(pathFile, 'utf8');
                    const fileSize = fileContent.length;
                    
                    if (fileSize > 50000) {
                        await conn.sendMessage(chat, {
                            text: `📜 *FILE TROPPO GRANDE*\n\nIl file ${fileName} è troppo grande (${(fileSize/1024).toFixed(2)}KB)\n📥 Usa il download per visualizzarlo completamente`,
                            buttons: [
                                { buttonId: `${usedPrefix}ottienifile ${pathFile}`, buttonText: { displayText: '📥 Scarica File' }, type: 1 }
                            ]
                        }, { quoted: m })
                        return;
                    }

                    await conn.sendMessage(chat, {
                        text: `📜 *CODICE SORGENTE*\n\n🗂️ *File:* ${fileName}\n📂 *Percorso:* ${relativePath}\n📊 *Dimensioni:* ${fileSize} caratteri`
                    }, { quoted: m })

                    await conn.sendMessage(chat, {
                        text: `\`\`\`${fileExt.substring(1)}\n${fileContent}\n\`\`\``
                    }, { quoted: m })

                    if (fileExt === '.js' || fileExt === '.ts') {
                        const error = syntaxError(fileContent, fileName, {
                            sourceType: 'module',
                            allowReturnOutsideFunction: true,
                            allowAwaitOutsideFunction: true
                        });
                        
                        if (error) {
                            await conn.sendMessage(chat, {
                                text: `⚠️ *ERRORI DI SINTASSI*\n\n\`\`\`${error}\`\`\``
                            }, { quoted: m })
                        } else {
                            await conn.sendMessage(chat, {
                                text: '✅ *Sintassi verificata: Nessun errore*'
                            }, { quoted: m })
                        }
                    }
                } else {
                    const fileBuffer = await _fs.readFile(pathFile);
                    await conn.sendMessage(chat, {
                        text: `📁 *FILE BINARIO*\n\nImpossibile visualizzare il contenuto di ${fileName}\n📥 Invio come file...`
                    }, { quoted: m })
                    
                    await conn.sendMessage(chat, {
                        document: fileBuffer,
                        fileName: fileName,
                        mimetype: 'application/octet-stream'
                    }, { quoted: m })
                }
            }

        } catch (err) {
            console.error('Errore File Manager:', err);
            await conn.sendMessage(chat, {
                text: `❌ *ERRORE*\n\n${err.message}`
            }, { quoted: m })
        }
    }
}