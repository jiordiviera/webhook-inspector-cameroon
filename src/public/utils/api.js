// Utilitaires pour les appels API
class API {
  static baseURL = '/api';
  
  // Méthode générique pour les requêtes
  static async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Erreur API ${endpoint}:`, error);
      throw error;
    }
  }
  
  // Récupérer les webhooks avec filtres
  static async getWebhooks(filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const endpoint = `/webhooks${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }
  
  // Récupérer un webhook par ID
  static async getWebhook(id) {
    return this.request(`/webhooks/${id}`);
  }
  
  // Récupérer les statistiques
  static async getStats() {
    return this.request('/stats');
  }
  
  // Récupérer les types d'événements
  static async getEventTypes() {
    return this.request('/events');
  }
  
  // Récupérer les entreprises
  static async getCompanies() {
    return this.request('/companies');
  }
  
  // Rejouer un webhook
  static async replayWebhook(id, targetUrl) {
    return this.request(`/webhooks/${id}/replay`, {
      method: 'POST',
      body: JSON.stringify({ target_url: targetUrl })
    });
  }
  
  // Créer un webhook de test
  static async createTestWebhook(data) {
    return this.request('/test', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  // Nettoyer les anciens webhooks
  static async cleanWebhooks(keepCount = 1000) {
    return this.request(`/webhooks/clean?keep=${keepCount}`, {
      method: 'DELETE'
    });
  }
  
  // Exporter les webhooks
  static async exportWebhooks(filters = {}, format = 'json') {
    const params = new URLSearchParams({
      format,
      ...filters
    });
    
    const response = await fetch(`${this.baseURL}/export?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Erreur export: ${response.status}`);
    }
    
    return response;
  }
}

// Utilitaires pour les expressions camerounaises
class CameroonUtils {
  static expressions = {
    fr: {
      welcome: "Bienvenue mon frère ! 🇨🇲",
      loading: "Ça charge là...",
      error: "Aïe aïe, il y a un souci !",
      success: "C'est bon maintenant !",
      empty: "Rien du tout ici...",
      refresh: "Actualiser ça",
      search: "Chercher ça",
      filter: "Filtrer les trucs",
      export: "Télécharger ça",
      delete: "Supprimer ça",
      edit: "Modifier ça",
      save: "Enregistrer ça",
      cancel: "Laisser tomber",
      retry: "Ressayer encore"
    },
    en: {
      welcome: "Welcome my brother! 🇨🇲",
      loading: "Loading...",
      error: "Aïe aïe, there's a problem!",
      success: "It's good now!",
      empty: "Nothing here...",
      refresh: "Refresh this",
      search: "Search this",
      filter: "Filter things",
      export: "Download this",
      delete: "Delete this",
      edit: "Edit this",
      save: "Save this",
      cancel: "Cancel",
      retry: "Try again"
    }
  };
  
  static currentLang = 'fr';
  
  static t(key) {
    return this.expressions[this.currentLang][key] || key;
  }
  
  static setLanguage(lang) {
    this.currentLang = lang;
    // Mettre à jour l'interface
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
  }
  
  // Formater l'heure en style camerounais
  static formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return "Maintenant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays < 7) return `${date.toLocaleDateString('fr-FR', { weekday: 'long' })} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    
    return date.toLocaleString('fr-FR', { 
      timeZone: 'Africa/Douala',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Formater un montant en FCFA
  static formatAmount(amount) {
    if (typeof amount !== 'number') return amount;
    
    return new Intl.NumberFormat('fr-CM', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA';
  }
  
  // Détecter si un texte contient des montants FCFA
  static detectFCFA(text) {
    return /\b\d+[\s,.]*(FCFA|CFA|F\s*CFA)\b/i.test(text);
  }
  
  // Détecter les numéros de téléphone camerounais
  static isPhoneCameroon(phone) {
    const patterns = [
      /^\+237[67]\d{8}$/,  // +237 6/7 + 8 chiffres
      /^237[67]\d{8}$/,    // 237 6/7 + 8 chiffres  
      /^[67]\d{8}$/        // 6/7 + 8 chiffres
    ];
    
    return patterns.some(pattern => pattern.test(phone.replace(/\s/g, '')));
  }
}

// Utilitaires pour les notifications toast
class Toast {
  static container = null;
  
  static init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }
  
  static show(message, type = 'info', duration = 5000) {
    if (!this.container) this.init();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span>${icon}</span>
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    this.container.appendChild(toast);
    
    // Auto-suppression
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, duration);
    }
  }
  
  static getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }
  
  static success(message) {
    this.show(message, 'success');
  }
  
  static error(message) {
    this.show(message, 'error');
  }
  
  static warning(message) {
    this.show(message, 'warning');
  }
  
  static info(message) {
    this.show(message, 'info');
  }
}

// Utilitaires pour le stockage local
class Storage {
  static get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
  
  static remove(key) {
    localStorage.removeItem(key);
  }
  
  static clear() {
    localStorage.clear();
  }
}