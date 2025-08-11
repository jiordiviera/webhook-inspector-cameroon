import { initDatabase } from "./database/init.ts";
import { webhookRoutes } from "./routes/webhook.ts";
import { apiRoutes } from "./routes/api.ts";
import { CameroonTimeUtils } from "./utils/cameroon.ts";
import { broadcastService } from "./services/broadcast.ts";

// Initialiser la base de données
initDatabase();

console.log(`🇨🇲 Webhook Inspector Cameroon démarré à ${CameroonTimeUtils.now().format('HH:mm DD/MM/YYYY')}`);
console.log("🚀 Serveur en cours de démarrage...");

// Serveur Bun avec support WebSocket
const server = Bun.serve({
  port: process.env.PORT || 3001,
  
  // Routes HTTP
  fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Route webhook - POST /webhook
    if (path === '/webhook' && req.method === 'POST') {
      return webhookRoutes.handleWebhook(req);
    }
    
    // Routes API - /api/*
    if (path.startsWith('/api/')) {
      return apiRoutes.handleAPI(req, url);
    }
    
    // WebSocket upgrade
    if (path === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
    }
    
    // Servir les fichiers statiques et l'interface web
    if (path === '/' || path === '/index.html') {
      return new Response(Bun.file('./src/public/index.html'));
    }
    
    // CSS
    if (path.endsWith('.css')) {
      return new Response(Bun.file(`./src/public${path}`), {
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    // JavaScript
    if (path.endsWith('.js')) {
      return new Response(Bun.file(`./src/public${path}`), {
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    
    // Images
    if (path.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
      const ext = path.split('.').pop();
      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg', 
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon'
      };
      return new Response(Bun.file(`./src/public${path}`), {
        headers: { 'Content-Type': mimeTypes[ext] || 'image/png' }
      });
    }
    
    // 404 pour les autres routes
    return new Response(`
      <html>
        <body style="font-family: Arial; text-align: center; margin-top: 100px;">
          <h1>🇨🇲 Webhook Inspector Cameroon</h1>
          <p>Page non trouvée - <a href="/">Retour à l'accueil</a></p>
          <p><small>Route demandée: ${path}</small></p>
        </body>
      </html>
    `, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  },
  
  // Gestion WebSocket pour les mises à jour temps réel
  websocket: {
    open(ws) {
      broadcastService.addConnection(ws);
      
      // Envoyer un message de bienvenue
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Bienvenue sur Webhook Inspector Cameroun ! 🇨🇲',
        timestamp: CameroonTimeUtils.now().format()
      }));
    },
    
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString());
        console.log('📨 Message WebSocket reçu:', data);
        
        // Echo du message pour debug
        if (data.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: CameroonTimeUtils.now().format()
          }));
        }
      } catch (error) {
        console.error('❌ Erreur message WebSocket:', error);
      }
    },
    
    close(ws) {
      broadcastService.removeConnection(ws);
    }
  }
});

// Fonction pour broadcaster aux clients WebSocket
export function broadcastToClients(data: any) {
  return broadcastService.broadcast(data);
}

console.log(`✅ Serveur démarré sur http://localhost:${server.port}`);
console.log(`📡 WebSocket disponible sur ws://localhost:${server.port}/ws`);
console.log(`🔗 Endpoint webhooks: http://localhost:${server.port}/webhook`);
console.log(`🔧 API REST: http://localhost:${server.port}/api/`);
console.log(`🇨🇲 Bon développement les gars !`);