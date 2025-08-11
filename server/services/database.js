import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const { Database: SQLite3Database } = sqlite3.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(process.cwd(), 'webhooks.db');
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new SQLite3Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Erreur connexion SQLite:', err);
                    reject(err);
                } else {
                    console.log('✅ Connexion SQLite établie:', this.dbPath);
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }
    
    async createTables() {
        const createWebhooksTable = `
            CREATE TABLE IF NOT EXISTS webhooks (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
                delivery_id TEXT UNIQUE NOT NULL,
                event_type TEXT NOT NULL,
                company_id TEXT,
                payload TEXT NOT NULL,
                headers TEXT NOT NULL,
                signature TEXT,
                is_valid_signature BOOLEAN DEFAULT 0,
                signature_error TEXT,
                source_ip TEXT,
                user_agent TEXT,
                processing_time_ms INTEGER,
                received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        const createLogsTable = `
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                data TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        const createIndexes = [
            'CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON webhooks(event_type)',
            'CREATE INDEX IF NOT EXISTS idx_webhooks_company_id ON webhooks(company_id)',
            'CREATE INDEX IF NOT EXISTS idx_webhooks_received_at ON webhooks(received_at)',
            'CREATE INDEX IF NOT EXISTS idx_webhooks_delivery_id ON webhooks(delivery_id)',
            'CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)'
        ];
        
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Créer les tables
                this.db.run(createWebhooksTable, (err) => {
                    if (err) {
                        console.error('❌ Erreur création table webhooks:', err);
                        return reject(err);
                    }
                });
                
                this.db.run(createLogsTable, (err) => {
                    if (err) {
                        console.error('❌ Erreur création table logs:', err);
                        return reject(err);
                    }
                });
                
                // Créer les index
                createIndexes.forEach(indexSql => {
                    this.db.run(indexSql, (err) => {
                        if (err) {
                            console.error('❌ Erreur création index:', err);
                        }
                    });
                });
                
                console.log('✅ Tables SQLite créées avec succès');
                resolve();
            });
        });
    }
    
    // Méthodes utilitaires pour les requêtes
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }
    
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('✅ Connexion SQLite fermée');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// Instance singleton
const database = new Database();

// Fonctions d'initialisation
async function initDatabase() {
    await database.init();
    return database;
}

// Export pour utilisation dans l'app
export {
    Database,
    database,
    initDatabase
};