// Compatible avec Bun et Node.js
let Database: any;
let db: any;

try {
  // Essayer d'importer bun:sqlite en premier (pour Bun)
  Database = (await import("bun:sqlite")).Database;
  db = new Database("webhooks.db");
} catch {
  // Fallback vers better-sqlite3 (pour Node.js/Vercel)
  const BetterSqlite3 = (await import("better-sqlite3")).default;
  db = new BetterSqlite3(":memory:"); // En mémoire sur Vercel
}

// Table principale pour stocker les webhooks
const createWebhooksTable = `
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    company_id TEXT,
    payload TEXT NOT NULL,
    headers TEXT NOT NULL,
    signature TEXT,
    is_valid_signature INTEGER DEFAULT 0,
    received_at TEXT NOT NULL,
    response_status INTEGER DEFAULT 200,
    processing_time_ms INTEGER,
    source_ip TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Index pour améliorer les performances
const createIndexes = `
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_company_id ON webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_received_at ON webhooks(received_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at);
`;

// Table pour les métriques et analytics
const createAnalyticsTable = `
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    company_id TEXT,
    UNIQUE(date, hour, event_type, company_id)
);
`;

// Table pour les configurations (secrets, endpoints, etc.)
const createConfigTable = `
CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Initialisation de la base de données
export function initDatabase() {
    console.log("🗄️ Initialisation de la base de données...");
    
    db.exec(createWebhooksTable);
    db.exec(createIndexes);
    db.exec(createAnalyticsTable);
    db.exec(createConfigTable);
    
    // Configuration par défaut
    const insertDefaultConfig = `
    INSERT OR IGNORE INTO config (key, value, description) VALUES 
    ('webhook_secret', '', 'Secret pour la validation des signatures webhooks'),
    ('max_webhooks_history', '10000', 'Nombre maximum de webhooks à conserver'),
    ('timezone', 'Africa/Douala', 'Timezone par défaut (Cameroun)'),
    ('theme', 'cameroon', 'Thème de l''interface'),
    ('language', 'fr', 'Langue par défaut');
    `;
    
    db.exec(insertDefaultConfig);
    
    console.log("✅ Base de données initialisée avec succès!");
    return db;
}

export { db };

// Exécuter l'initialisation si ce fichier est lancé directement
if (import.meta.main) {
    initDatabase();
}