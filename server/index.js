import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import WebSocket from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Import des routes et services
import webhookRoutes from './routes/webhook.js';
import apiRoutes from './routes/api.js';
import { initDatabase } from './services/database.js';
import { setupWebSocket } from './services/websocket.js';
import { setupCronJobs } from './services/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Configuration Express
app.use(helmet({
    contentSecurityPolicy: false, // Pour permettre les WebSockets
}));
app.use(cors());
app.use(morgan('combined'));

// Middleware pour les webhooks (raw body pour signature)
app.use('/webhook', express.raw({ type: 'application/json', limit: '10mb' }));
app.use('/genuka/webhook', express.raw({ type: 'application/json', limit: '10mb' }));

// Middleware standard JSON pour les autres routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques React 
app.use(express.static(path.join(__dirname, '../client/dist')));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/genuka/webhook', webhookRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Genuka Webhook Inspector V2 - Cameroon 🇨🇲',
        timestamp: new Date().toISOString(),
        timezone: 'Africa/Douala',
        runtime: 'Bun + Express + React',
        version: '2.0.0'
    });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur s\'est produite',
        timestamp: new Date().toISOString()
    });
});

// Route React (catch-all) - EN DERNIER après les erreurs
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Démarrage du serveur
async function startServer() {
    try {
        console.log('🚀 Initialisation Genuka Webhook Inspector V2...');
        console.log('⚡ Runtime: Bun + Express + React + SQLite');
        
        // Initialiser la base de données
        await initDatabase();
        console.log('✅ Base de données SQLite initialisée');
        
        // Créer le serveur HTTP
        const server = createServer(app);
        
        // Configurer WebSocket
        setupWebSocket(server);
        console.log('📡 WebSocket configuré');
        
        // Démarrer les tâches cron
        setupCronJobs();
        console.log('⏰ Tâches planifiées configurées');
        
        // Écouter sur le port
        server.listen(PORT, () => {
            const now = new Date();
            const cameroonTime = now.toLocaleString('fr-FR', {
                timeZone: 'Africa/Douala',
                weekday: 'long',
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            console.log('');
            console.log('🇨🇲 ==========================================');
            console.log('     GENUKA WEBHOOK INSPECTOR V2.0');
            console.log('    Bun + Express + React + Tailwind v4');
            console.log('==========================================');
            console.log('');
            console.log(`🌍 Serveur: http://localhost:${PORT}`);
            console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
            console.log(`🎯 Webhook: http://localhost:${PORT}/webhook`);
            console.log(`🔗 API: http://localhost:${PORT}/api`);
            console.log(`🧪 Health: http://localhost:${PORT}/health`);
            console.log('');
            console.log(`📅 Heure Douala: ${cameroonTime}`);
            console.log('🚀 Prêt à inspecter les webhooks Genuka !');
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Erreur démarrage:', error);
        process.exit(1);
    }
}

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('🔄 Arrêt propre du serveur...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 Arrêt propre du serveur...');
    process.exit(0);
});

// Démarrer
startServer();

export default app;