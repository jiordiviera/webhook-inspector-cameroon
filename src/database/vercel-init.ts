// Version Node.js pour Vercel
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function initDatabase() {
  try {
    // Utiliser une base de données en mémoire sur Vercel
    const db = new Database(':memory:');
    
    console.log('🗄️ Initialisation de la base de données (Vercel)...');
    
    // Créer la table webhooks
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        company_id TEXT,
        payload TEXT NOT NULL,
        headers TEXT NOT NULL,
        signature TEXT,
        is_valid_signature BOOLEAN DEFAULT true,
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        response_status INTEGER DEFAULT 200,
        processing_time_ms INTEGER DEFAULT 0,
        source_ip TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Base de données initialisée avec succès (Vercel)!');
    return db;
  } catch (error) {
    console.error('❌ Erreur initialisation base de données:', error);
    throw error;
  }
}