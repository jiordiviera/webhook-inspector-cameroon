// Composant Dashboard principal
class Dashboard {
  static currentFilters = {
    event_type: '',
    company_id: '',
    is_valid_signature: '',
    date_from: '',
    search: '',
    limit: 50,
    offset: 0
  };
  
  static currentPage = 1;
  static totalPages = 1;
  static autoRefreshInterval = null;
  
  static init() {
    console.log('📊 Initialisation du Dashboard...');
    
    this.initEventListeners();
    this.initThemeToggle();
    this.initLanguageToggle();
    this.loadInitialData();
    this.startAutoRefresh();
    
    // Écouter les nouveaux webhooks via WebSocket
    WebsocketClient.on('new_webhook', (data) => {
      this.handleNewWebhook(data.webhook, data.stats);
    });
  }
  
  static initEventListeners() {
    // Boutons de contrôle
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.refreshData();
    });
    
    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.exportData();
    });
    
    document.getElementById('test-btn')?.addEventListener('click', () => {
      this.createTestWebhook();
    });
    
    document.getElementById('clear-btn')?.addEventListener('click', () => {
      this.clearOldWebhooks();
    });
    
    // Filtres
    document.getElementById('search-btn')?.addEventListener('click', () => {
      this.applyFilters();
    });
    
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.applyFilters();
      }
    });
    
    document.getElementById('event-filter')?.addEventListener('change', () => {
      this.applyFilters();
    });
    
    document.getElementById('company-filter')?.addEventListener('change', () => {
      this.applyFilters();
    });
    
    document.getElementById('signature-filter')?.addEventListener('change', () => {
      this.applyFilters();
    });
    
    document.getElementById('date-filter')?.addEventListener('change', () => {
      this.applyFilters();
    });
    
    // Pagination
    document.getElementById('prev-page')?.addEventListener('click', () => {
      this.previousPage();
    });
    
    document.getElementById('next-page')?.addEventListener('click', () => {
      this.nextPage();
    });
    
    // Auto-refresh toggle
    document.getElementById('auto-refresh')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    });
    
    // Webhook de test depuis l'état vide
    document.getElementById('create-test-webhook')?.addEventListener('click', () => {
      this.createTestWebhook();
    });
  }
  
  static initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = Storage.get('theme', 'light');
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    themeToggle?.addEventListener('click', () => {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      Storage.set('theme', newTheme);
      
      Toast.success(newTheme === 'dark' ? 'Mode sombre activé 🌙' : 'Mode clair activé ☀️');
    });
  }
  
  static initLanguageToggle() {
    const langToggle = document.getElementById('lang-toggle');
    const currentLang = Storage.get('language', 'fr');
    
    langToggle.value = currentLang;
    CameroonUtils.setLanguage(currentLang);
    
    langToggle?.addEventListener('change', (e) => {
      const newLang = e.target.value;
      CameroonUtils.setLanguage(newLang);
      Storage.set('language', newLang);
      
      Toast.success(`Langue changée vers ${newLang === 'fr' ? 'Français' : 'English'}`);
    });
  }
  
  static async loadInitialData() {
    try {
      // Charger les options de filtre
      await this.loadFilterOptions();
      
      // Charger les stats et webhooks
      await this.refreshData();
      
    } catch (error) {
      console.error('❌ Erreur chargement initial:', error);
      Toast.error('Erreur de chargement des données');
    }
  }
  
  static async loadFilterOptions() {
    try {
      // Charger les types d'événements
      const eventsResponse = await API.getEventTypes();
      const eventSelect = document.getElementById('event-filter');
      
      if (eventSelect && eventsResponse.success) {
        eventSelect.innerHTML = '<option value=\"\">Tous les événements</option>';
        eventsResponse.data.forEach(event => {
          const option = document.createElement('option');
          option.value = event;
          option.textContent = event;
          eventSelect.appendChild(option);
        });
      }
      
      // Charger les entreprises
      const companiesResponse = await API.getCompanies();
      const companySelect = document.getElementById('company-filter');
      
      if (companySelect && companiesResponse.success) {
        companySelect.innerHTML = '<option value=\"\">Toutes les sociétés</option>';
        companiesResponse.data.forEach(company => {
          const option = document.createElement('option');
          option.value = company;
          option.textContent = company;
          companySelect.appendChild(option);
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement options filtres:', error);
    }
  }
  
  static async refreshData() {
    try {
      // Afficher un indicateur de chargement
      this.showLoadingState();
      
      // Charger les stats
      const statsResponse = await API.getStats();
      if (statsResponse.success) {
        this.updateStats(statsResponse.data);
      }
      
      // Charger les webhooks
      await this.loadWebhooks();
      
    } catch (error) {
      console.error('❌ Erreur rafraîchissement:', error);
      Toast.error('Erreur lors du rafraîchissement');
    } finally {
      this.hideLoadingState();
    }
  }
  
  static async loadWebhooks() {
    try {
      const response = await API.getWebhooks(this.currentFilters);
      
      if (response.success) {
        WebhookList.render(response.data);
        this.updatePagination(response.pagination);
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement webhooks:', error);
      Toast.error('Erreur de chargement des webhooks');
    }
  }
  
  static updateStats(stats) {
    document.getElementById('total-webhooks').textContent = stats.total || 0;
    document.getElementById('today-webhooks').textContent = stats.today || 0;
    document.getElementById('valid-webhooks').textContent = stats.valid || 0;
    document.getElementById('invalid-webhooks').textContent = stats.invalid || 0;
  }
  
  static updatePagination(pagination) {
    if (!pagination) return;
    
    const { total, limit, offset } = pagination;
    this.currentPage = Math.floor(offset / limit) + 1;
    this.totalPages = Math.ceil(total / limit);
    
    document.getElementById('page-info').textContent = `Page ${this.currentPage} sur ${this.totalPages}`;
    document.getElementById('prev-page').disabled = this.currentPage <= 1;
    document.getElementById('next-page').disabled = this.currentPage >= this.totalPages;
  }
  
  static applyFilters() {
    this.currentFilters = {
      event_type: document.getElementById('event-filter').value,
      company_id: document.getElementById('company-filter').value,
      is_valid_signature: document.getElementById('signature-filter').value,
      date_from: document.getElementById('date-filter').value,
      search: document.getElementById('search-input').value.trim(),
      limit: 50,
      offset: 0
    };
    
    this.currentPage = 1;
    this.loadWebhooks();
  }
  
  static previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.currentFilters.offset = (this.currentPage - 1) * this.currentFilters.limit;
      this.loadWebhooks();
    }
  }
  
  static nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.currentFilters.offset = (this.currentPage - 1) * this.currentFilters.limit;
      this.loadWebhooks();
    }
  }
  
  static async createTestWebhook() {
    try {
      const testData = {
        event_type: 'test.webhook',
        company_id: 'demo-cameroun',
        payload: {
          test: true,
          message: 'Webhook de test depuis le Cameroun ! 🇨🇲',
          timestamp: new Date().toISOString(),
          amount: 5000,
          currency: 'FCFA',
          customer: {
            name: 'Jean-Claude Mbappé',
            phone: '+237612345678',
            city: 'Douala'
          },
          payment: {
            method: 'Orange Money',
            reference: '#OM' + Date.now()
          }
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'webhook-inspector-test',
          'User-Agent': 'Genuka-Test/1.0'
        }
      };
      
      const response = await API.createTestWebhook(testData);
      
      if (response.success) {
        Toast.success('Webhook de test créé ! 🎉');
        this.refreshData();
      }
      
    } catch (error) {
      console.error('❌ Erreur création webhook test:', error);
      Toast.error('Erreur lors de la création du webhook de test');
    }
  }
  
  static async clearOldWebhooks() {
    if (!confirm('Êtes-vous sûr de vouloir nettoyer les anciens webhooks ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      const keepCount = prompt('Combien de webhooks récents garder ?', '1000');
      if (!keepCount) return;
      
      const response = await API.cleanWebhooks(parseInt(keepCount));
      
      if (response.success) {
        Toast.success(`${response.deleted_count} webhooks supprimés !`);
        this.refreshData();
      }
      
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      Toast.error('Erreur lors du nettoyage');
    }
  }
  
  static async exportData() {
    try {
      const format = prompt('Format d\\'export (json/csv) ?', 'json');
      if (!format || !['json', 'csv'].includes(format)) return;
      
      const response = await API.exportWebhooks(this.currentFilters, format);
      
      // Télécharger le fichier
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webhooks-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      Toast.success(`Export ${format.toUpperCase()} téléchargé !`);
      
    } catch (error) {
      console.error('❌ Erreur export:', error);
      Toast.error('Erreur lors de l\\'export');
    }
  }
  
  static handleNewWebhook(webhook, stats) {
    // Mettre à jour les stats
    if (stats) {
      this.updateStats(stats);
    }
    
    // Recharger la liste si on est sur la première page et sans filtre spécifique
    if (this.currentPage === 1 && !this.hasActiveFilters()) {
      this.loadWebhooks();
    }
  }
  
  static hasActiveFilters() {
    return Object.values(this.currentFilters).some(value => 
      value !== '' && value !== 0 && value !== 50
    );
  }
  
  static startAutoRefresh() {
    this.stopAutoRefresh();
    
    // Actualiser toutes les 30 secondes
    this.autoRefreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.refreshData();
      }
    }, 30000);
  }
  
  static stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }
  
  static showLoadingState() {
    // Ajouter des indicateurs de chargement si nécessaire
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.textContent = '🔄 ' + CameroonUtils.t('loading');
      refreshBtn.disabled = true;
    }
  }
  
  static hideLoadingState() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.textContent = '🔄 ' + CameroonUtils.t('refresh');
      refreshBtn.disabled = false;
    }
  }
}