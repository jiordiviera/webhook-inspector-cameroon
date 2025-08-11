// Service de diffusion pour les WebSocket connections
class BroadcastService {
  private connections = new Set<any>();
  
  addConnection(ws: any) {
    this.connections.add(ws);
    console.log(`📡 Nouvelle connexion WebSocket (${this.connections.size} actives)`);
  }
  
  removeConnection(ws: any) {
    this.connections.delete(ws);
    console.log(`📡 Connexion WebSocket fermée (${this.connections.size} restantes)`);
  }
  
  broadcast(data: any) {
    const message = JSON.stringify(data);
    let sent = 0;
    
    for (const ws of this.connections) {
      try {
        ws.send(message);
        sent++;
      } catch (error) {
        console.error('❌ Erreur envoi WebSocket:', error);
        this.connections.delete(ws);
      }
    }
    
    if (sent > 0) {
      console.log(`📡 Message diffusé à ${sent} client(s)`);
    }
    
    return sent;
  }
  
  getConnectionCount(): number {
    return this.connections.size;
  }
}

export const broadcastService = new BroadcastService();