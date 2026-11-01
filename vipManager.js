import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const vipPath = path.join(__dirname, 'vips.json')

class VipManager {
    constructor() {
        this.data = {}
        this.load()
    }

    load() {
        try {
            if (fs.existsSync(vipPath)) {
                this.data = JSON.parse(fs.readFileSync(vipPath, 'utf8'))
            } else {
                this.data = {}
                this.save()
            }
        } catch (error) {
            console.error('Errore caricamento VIP:', error)
            this.data = {}
        }
    }

    save() {
        try {
            fs.writeFileSync(vipPath, JSON.stringify(this.data, null, 2))
            return true
        } catch (error) {
            console.error('Errore salvataggio VIP:', error)
            return false
        }
    }

    getVips(gruppoJid) {
        if (!gruppoJid) return []
        const cleanJid = gruppoJid.replace(/[^0-9@]/g, '')
        return this.data[cleanJid] || []
    }

    addVip(gruppoJid, numero) {
        if (!gruppoJid || !numero) return false
        const cleanJid = gruppoJid.replace(/[^0-9@]/g, '')
        const cleanNum = numero.toString().replace(/\D/g, '')
        
        if (!this.data[cleanJid]) {
            this.data[cleanJid] = []
        }
        
        if (!this.data[cleanJid].includes(cleanNum)) {
            this.data[cleanJid].push(cleanNum)
            return this.save()
        }
        return true
    }

    removeVip(gruppoJid, numero) {
        if (!gruppoJid || !numero) return false
        const cleanJid = gruppoJid.replace(/[^0-9@]/g, '')
        const cleanNum = numero.toString().replace(/\D/g, '')
        
        if (this.data[cleanJid]) {
            const index = this.data[cleanJid].indexOf(cleanNum)
            if (index !== -1) {
                this.data[cleanJid].splice(index, 1)
                if (this.data[cleanJid].length === 0) {
                    delete this.data[cleanJid]
                }
                return this.save()
            }
        }
        return false
    }

    resetVips(gruppoJid) {
        if (!gruppoJid) return false
        const cleanJid = gruppoJid.replace(/[^0-9@]/g, '')
        if (this.data[cleanJid]) {
            delete this.data[cleanJid]
            return this.save()
        }
        return true
    }

    isVip(gruppoJid, numero) {
        if (!gruppoJid || !numero) return false
        const cleanJid = gruppoJid.replace(/[^0-9@]/g, '')
        const cleanNum = numero.toString().replace(/\D/g, '')
        
        const vips = this.getVips(cleanJid)
        return vips.includes(cleanNum)
    }

    getAllVips() {
        return this.data
    }
}

const vipManager = new VipManager()
export default vipManager
