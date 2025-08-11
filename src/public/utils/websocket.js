// Client WebSocket pour les mises à jour temps réel
class WebsocketClient {
  static instance = null;
  static ws = null;
  static reconnectAttempts = 0;
  static maxReconnectAttempts = 5;
  static reconnectDelay = 1000;
  static listeners = {};
  
  static init() {
    if (this.instance) return this.instance;
    
    this.instance = this;
    this.connect();
    
    // Écouter les changements de visibilité de la page
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
        this.connect();
      }
    });
    
    return this.instance;
  }
  
  static connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('🔌 Connexion WebSocket vers', wsUrl);
    this.updateConnectionStatus('connecting');
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connecté');
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('connected');
        Toast.success('Connexion temps réel établie ! 🇨🇲');
        
        // Ping périodique pour maintenir la connexion
        this.startPingInterval();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Message WebSocket reçu:', data);
          
          // Dispatcher le message aux listeners
          this.emit(data.type, data);
          
          // Messages spéciaux
          if (data.type === 'welcome') {
            Toast.success(data.message);
          } else if (data.type === 'webhook_received') {
            this.handleNewWebhook(data.webhook, data.stats);
          }
          
        } catch (error) {
          console.error('❌ Erreur parsing message WebSocket:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket fermé:', event.code, event.reason);
        this.updateConnectionStatus('disconnected');
        this.stopPingInterval();
        
        // Tentative de reconnexion automatique
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          Toast.error('Connexion temps réel perdue. Actualisez la page.');
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        this.updateConnectionStatus('error');
      };
      
    } catch (error) {
      console.error('❌ Erreur création WebSocket:', error);
      this.updateConnectionStatus('error');
      this.scheduleReconnect();
    }
  }
  
  static scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnexion dans ${delay}ms (tentative ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }, delay);
  }
  
  static updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    const statusConfig = {
      connecting: { text: '🟡 Connexion...', class: 'status-connecting' },
      connected: { text: '🟢 Connecté', class: 'status-connected' },
      disconnected: { text: '🔴 Déconnecté', class: 'status-disconnected' },
      error: { text: '❌ Erreur', class: 'status-error' }
    };
    
    const config = statusConfig[status] || statusConfig.disconnected;
    statusElement.textContent = config.text;
    statusElement.className = config.class;
  }
  
  static send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    } else {
      console.warn('⚠️ WebSocket non connecté, impossible d\'envoyer:', data);
      return false;
    }
  }
  
  static startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', timestamp: new Date().toISOString() });
    }, 30000); // Ping toutes les 30 secondes
  }
  
  static stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  // Système d'événements
  static on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  static off(event, callback) {
    if (!this.listeners[event]) return;
    
    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }
  
  static emit(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ Erreur listener ${event}:`, error);
      }
    });
  }
  
  // Gérer l'arrivée d'un nouveau webhook
  static handleNewWebhook(webhook, stats) {
    // Notifier visuellement
    const eventName = webhook.event_type || 'webhook';
    const company = webhook.company_id ? ` (${webhook.company_id})` : '';
    
    Toast.success(`📡 Nouveau webhook: ${eventName}${company}`);
    
    // Son de notification (optionnel)
    if (Storage.get('notifications_sound', true)) {
      this.playNotificationSound();
    }
    
    // Mettre à jour le badge du navigateur
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nouveau webhook reçu', {
        body: `${eventName} de ${webhook.company_id || 'source inconnue'}`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🇨🇲</text></svg>',
        tag: 'webhook-notification'
      });
    }
    
    // Émettre l'événement pour les composants
    this.emit('new_webhook', { webhook, stats });
  }
  
  static playNotificationSound() {
    // Son simple avec Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Son de notification non supporté:', error);
    }
  }
  
  // Demander l'autorisation pour les notifications
  static requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          Toast.success('Notifications activées ! 🔔');
        }
      });
    }
  }
  
  static disconnect() {
    this.stopPingInterval();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.updateConnectionStatus('disconnected');
    this.reconnectAttempts = 0;
  }
}

// Auto-initialisation
document.addEventListener('DOMContentLoaded', () => {
  WebsocketClient.init();
  
  // Demander les permissions de notification après un délai
  setTimeout(() => {
    WebsocketClient.requestNotificationPermission();
  }, 2000);
});