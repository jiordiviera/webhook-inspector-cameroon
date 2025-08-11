import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Set();

/**
 * Configurer le serveur WebSocket
 */
function setupWebSocket(server) {
    wss = new WebSocketServer({ 
        server,
        path: '/ws'
    });
    
    wss.on('connection', (ws, req) => {
        const clientInfo = {
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            connectedAt: new Date().toISOString()
        };
        
        console.log(`📡 Nouvelle connexion WebSocket (${clients.size + 1} actives)`);
        console.log(`   IP: ${clientInfo.ip}`);
        
        // Ajouter le client
        clients.add(ws);
        ws.clientInfo = clientInfo;
        
        // Message de bienvenue
        ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connexion WebSocket établie ! 🇨🇲',
            timestamp: new Date().toISOString(),
            client_count: clients.size
        }));
        
        // Gestion des messages du client
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                console.log('📨 Message WebSocket reçu:', data);
                
                // Traiter différents types de messages
                switch (data.type) {
                    case 'ping':
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: new Date().toISOString()
                        }));
                        break;
                        
                    case 'subscribe':
                        // Abonner le client à des événements spécifiques
                        ws.subscriptions = data.events || [];
                        ws.send(JSON.stringify({
                            type: 'subscribed',
                            events: ws.subscriptions,
                            timestamp: new Date().toISOString()
                        }));
                        break;
                        
                    default:
                        console.log(`ℹ️  Type de message WebSocket non géré: ${data.type}`);
                }
                
            } catch (error) {
                console.error('❌ Erreur traitement message WebSocket:', error);
            }
        });
        
        // Gestion de la fermeture
        ws.on('close', (code, reason) => {
            clients.delete(ws);
            console.log(`📡 Connexion WebSocket fermée (${clients.size} restantes)`);
            console.log(`   Code: ${code}, Raison: ${reason.toString()}`);
        });
        
        // Gestion des erreurs
        ws.on('error', (error) => {
            console.error('❌ Erreur WebSocket:', error);
            clients.delete(ws);
        });
        
        // Heartbeat pour maintenir la connexion
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });
    });
    
    // Nettoyage automatique des connexions mortes
    const heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) {
                console.log('💀 Fermeture connexion WebSocket inactive');
                clients.delete(ws);
                return ws.terminate();
            }
            
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000); // Toutes les 30 secondes
    
    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });
    
    console.log('✅ Serveur WebSocket configuré sur /ws');
}

/**
 * Diffuser un webhook à tous les clients connectés
 */
function broadcastWebhook(webhookData) {
    if (!wss || clients.size === 0) {
        return;
    }
    
    const message = JSON.stringify({
        type: 'webhook_received',
        ...webhookData,
        timestamp: new Date().toISOString()
    });
    
    let sentCount = 0;
    
    clients.forEach((ws) => {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                // Vérifier les abonnements du client
                const subscriptions = ws.subscriptions || [];
                const shouldSend = subscriptions.length === 0 || 
                                  subscriptions.includes(webhookData.webhook?.event_type);
                
                if (shouldSend) {
                    ws.send(message);
                    sentCount++;
                }
            } else {
                // Nettoyer les connexions fermées
                clients.delete(ws);
            }
        } catch (error) {
            console.error('❌ Erreur envoi WebSocket:', error);
            clients.delete(ws);
        }
    });
    
    console.log(`📡 Message diffusé à ${sentCount} client(s)`);
}

/**
 * Diffuser un message générique à tous les clients
 */
function broadcast(message) {
    if (!wss || clients.size === 0) {
        return;
    }
    
    const data = JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
    });
    
    let sentCount = 0;
    
    clients.forEach((ws) => {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
                sentCount++;
            } else {
                clients.delete(ws);
            }
        } catch (error) {
            console.error('❌ Erreur broadcast:', error);
            clients.delete(ws);
        }
    });
    
    console.log(`📡 Broadcast envoyé à ${sentCount} client(s)`);
}

/**
 * Obtenir les statistiques des connexions WebSocket
 */
function getWebSocketStats() {
    const activeConnections = Array.from(clients).map(ws => ({
        ip: ws.clientInfo?.ip,
        userAgent: ws.clientInfo?.userAgent,
        connectedAt: ws.clientInfo?.connectedAt,
        subscriptions: ws.subscriptions || [],
        isAlive: ws.isAlive
    }));
    
    return {
        total_connections: clients.size,
        active_connections: activeConnections,
        server_status: wss ? 'running' : 'stopped'
    };
}

/**
 * Fermer toutes les connexions WebSocket
 */
function closeAllConnections() {
    console.log('🔄 Fermeture de toutes les connexions WebSocket...');
    
    clients.forEach((ws) => {
        try {
            ws.close(1000, 'Server shutdown');
        } catch (error) {
            console.error('❌ Erreur fermeture WebSocket:', error);
        }
    });
    
    clients.clear();
    
    if (wss) {
        wss.close();
        wss = null;
    }
}

export {
    setupWebSocket,
    broadcastWebhook,
    broadcast,
    getWebSocketStats,
    closeAllConnections
};