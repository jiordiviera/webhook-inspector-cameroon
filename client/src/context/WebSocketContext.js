import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [stats, setStats] = useState({
    totalConnections: 0,
    activeConnections: 0
  });

  // Fonction pour se connecter au WebSocket
  const connect = useCallback(() => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
      
      console.log('🔌 Connexion WebSocket:', wsUrl);
      
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = (event) => {
        console.log('✅ WebSocket connecté');
        setIsConnected(true);
        setConnectionStatus('connected');
        setWs(websocket);
        
        // Toast de succès discret
        toast.success('Connexion temps réel établie 📡', {
          duration: 2000,
          position: 'bottom-right'
        });
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Message WebSocket reçu:', data);
          
          setLastMessage(data);
          
          // Traiter différents types de messages
          switch (data.type) {
            case 'webhook_received':
              // Notifier qu'un nouveau webhook a été reçu
              toast.success(`📡 Nouveau webhook: ${data.webhook?.event_type}`, {
                duration: 3000,
                position: 'top-right'
              });
              
              // Déclencher un événement personnalisé pour mettre à jour la liste
              window.dispatchEvent(new CustomEvent('newWebhook', { 
                detail: data.webhook 
              }));
              break;
              
            case 'connected':
              console.log('🎯 Message de bienvenue:', data.message);
              setStats(prev => ({
                ...prev,
                activeConnections: data.client_count || 0
              }));
              break;
              
            case 'pong':
              // Réponse au ping - maintenir la connexion
              break;
              
            default:
              console.log('ℹ️ Message WebSocket non traité:', data.type);
          }
          
        } catch (error) {
          console.error('❌ Erreur parsing message WebSocket:', error);
        }
      };
      
      websocket.onclose = (event) => {
        console.log('🔌 WebSocket fermé:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setWs(null);
        
        // Tentative de reconnexion après 3 secondes
        if (event.code !== 1000) { // 1000 = fermeture normale
          setTimeout(() => {
            console.log('🔄 Tentative de reconnexion...');
            connect();
          }, 3000);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setConnectionStatus('error');
        
        toast.error('Erreur connexion temps réel', {
          duration: 3000
        });
      };
      
    } catch (error) {
      console.error('❌ Erreur création WebSocket:', error);
      setConnectionStatus('error');
    }
  }, []);
  
  // Fonction pour envoyer un message
  const sendMessage = useCallback((message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        console.log('📤 Message envoyé:', message);
      } catch (error) {
        console.error('❌ Erreur envoi message:', error);
      }
    } else {
      console.warn('⚠️ WebSocket non connecté');
    }
  }, [ws]);
  
  // Fonction ping pour maintenir la connexion
  const sendPing = useCallback(() => {
    sendMessage({
      type: 'ping',
      timestamp: new Date().toISOString()
    });
  }, [sendMessage]);
  
  // Souscrire à des événements spécifiques
  const subscribe = useCallback((events) => {
    sendMessage({
      type: 'subscribe',
      events: Array.isArray(events) ? events : [events]
    });
  }, [sendMessage]);
  
  // Effet pour la connexion initiale
  useEffect(() => {
    connect();
    
    // Nettoyer à la destruction du composant
    return () => {
      if (ws) {
        ws.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);
  
  // Effet pour le ping périodique
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(sendPing, 30000); // Ping toutes les 30s
      
      return () => clearInterval(pingInterval);
    }
  }, [isConnected, sendPing]);
  
  const value = {
    ws,
    isConnected,
    connectionStatus,
    lastMessage,
    stats,
    sendMessage,
    sendPing,
    subscribe,
    connect
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};