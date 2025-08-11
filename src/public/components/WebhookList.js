// Composant Liste des Webhooks
class WebhookList {
  static container = null;
  static modal = null;
  static currentWebhook = null;
  
  static init() {
    console.log('📋 Initialisation de la liste des webhooks...');
    
    this.container = document.getElementById('webhooks-list');
    this.modal = document.getElementById('webhook-modal');
    
    this.initModalEvents();
  }
  
  static initModalEvents() {
    // Fermer la modal
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal();
      });
    });
    
    // Fermer en cliquant à l'extérieur
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
    
    // Touches clavier
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('show')) {
        this.closeModal();
      }
    });
    
    // Actions de la modal
    document.getElementById('replay-webhook')?.addEventListener('click', () => {
      this.replayWebhook();
    });
    
    document.getElementById('copy-webhook')?.addEventListener('click', () => {
      this.copyWebhook();
    });
  }
  
  static render(webhooks) {
    if (!this.container) return;
    
    if (!webhooks || webhooks.length === 0) {
      this.renderEmptyState();
      return;
    }
    
    this.container.innerHTML = '';
    
    webhooks.forEach(webhook => {
      const webhookElement = this.createWebhookElement(webhook);
      this.container.appendChild(webhookElement);
    });
  }
  
  static renderEmptyState() {
    this.container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>Aucun webhook pour le moment</h3>
        <p>Les webhooks apparaîtront ici en temps réel dès qu'ils arrivent.</p>
        <button id="create-test-webhook" class="btn-primary">Créer un webhook de test</button>
      </div>
    `;
    
    // Re-attacher l'événement
    document.getElementById('create-test-webhook')?.addEventListener('click', () => {
      Dashboard.createTestWebhook();
    });
  }
  
  static createWebhookElement(webhook) {
    const webhookDiv = document.createElement('div');
    webhookDiv.className = 'webhook-item';
    webhookDiv.addEventListener('click', () => this.openWebhookModal(webhook));
    
    // Déterminer le statut
    const status = webhook.is_valid_signature ? 'valid' : 'invalid';
    
    // Extraire des informations utiles du payload
    let amount = null;
    let phone = null;
    let paymentMethod = null;
    
    try {
      if (typeof webhook.payload === 'object') {
        const payload = webhook.payload;
        
        // Rechercher des montants
        if (payload.amount) amount = payload.amount;
        if (payload.data && payload.data.amount) amount = payload.data.amount;
        if (payload.order && payload.order.total) amount = payload.order.total;
        
        // Rechercher des téléphones
        if (payload.phone) phone = payload.phone;
        if (payload.customer && payload.customer.phone) phone = payload.customer.phone;
        if (payload.data && payload.data.customer && payload.data.customer.phone) phone = payload.data.customer.phone;
        
        // Rechercher méthode de paiement
        if (payload.payment && payload.payment.method) paymentMethod = payload.payment.method;
        if (payload.payment_method) paymentMethod = payload.payment_method;
      }
    } catch (error) {
      // Ignorer les erreurs de parsing
    }
    
    // Créer les badges
    let badges = '';
    
    if (paymentMethod && (paymentMethod.toLowerCase().includes('orange') || paymentMethod.toLowerCase().includes('mtn'))) {
      badges += `<span class="badge mobile-money">📱 ${paymentMethod}</span>`;
    }
    
    if (webhook.is_valid_signature) {
      badges += `<span class="badge signature-valid">✅ Valide</span>`;
    } else {
      badges += `<span class="badge signature-invalid">❌ Invalide</span>`;
    }
    
    if (amount && CameroonUtils.detectFCFA(amount.toString())) {
      badges += `<span class="badge amount">💰 ${CameroonUtils.formatAmount(amount)}</span>`;
    }
    
    if (phone && CameroonUtils.isPhoneCameroon(phone)) {
      badges += `<span class="badge phone-cm">🇨🇲 ${phone}</span>`;
    }
    
    webhookDiv.innerHTML = `
      <div class="webhook-status ${status}"></div>
      <div class="webhook-content">
        <div class="webhook-event">
          <strong>${webhook.event_type}</strong>
          ${webhook.company_id ? `<div class="webhook-company">${webhook.company_id}</div>` : ''}
        </div>
        <div class="webhook-badges">
          ${badges}
        </div>
        <div class="webhook-time">
          ${CameroonUtils.formatTime(webhook.received_at)}
        </div>
        <div class="webhook-ip">
          ${webhook.source_ip}
        </div>
      </div>
    `;
    
    return webhookDiv;
  }
  
  static async openWebhookModal(webhook) {
    this.currentWebhook = webhook;
    
    if (!this.modal) return;
    
    // Remplir la modal avec les détails du webhook
    const modalBody = this.modal.querySelector('.modal-body');
    
    modalBody.innerHTML = `
      <div class="webhook-details">
        <div class="detail-section">
          <h4>🔍 Informations Générales</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>ID :</strong>
              <span class="selectable">${webhook.id}</span>
            </div>
            <div class="detail-item">
              <strong>Type d'événement :</strong>
              <span class="event-badge">${webhook.event_type}</span>
            </div>
            <div class="detail-item">
              <strong>Société :</strong>
              <span>${webhook.company_id || 'Non spécifiée'}</span>
            </div>
            <div class="detail-item">
              <strong>Date de réception :</strong>
              <span>${CameroonUtils.formatTime(webhook.received_at)}</span>
            </div>
            <div class="detail-item">
              <strong>IP Source :</strong>
              <span class="mono">${webhook.source_ip}</span>
            </div>
            <div class="detail-item">
              <strong>User Agent :</strong>
              <span class="mono small">${webhook.user_agent || 'Non spécifié'}</span>
            </div>
            <div class="detail-item">
              <strong>Temps de traitement :</strong>
              <span>${webhook.processing_time_ms}ms</span>
            </div>
            <div class="detail-item">
              <strong>Signature valide :</strong>
              <span class="${webhook.is_valid_signature ? 'valid' : 'invalid'}">
                ${webhook.is_valid_signature ? '✅ Oui' : '❌ Non'}
              </span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>📦 Headers HTTP</h4>
          <div class="json-viewer">
${JSON.stringify(webhook.headers, null, 2)}
          </div>
        </div>
        
        <div class="detail-section">
          <h4>📄 Payload JSON</h4>
          <div class="json-viewer" id="payload-viewer">
${JSON.stringify(webhook.payload, null, 2)}
          </div>
        </div>
        
        ${webhook.signature ? `
        <div class="detail-section">
          <h4>🔐 Signature</h4>
          <div class="signature-info">
            <div class="mono small selectable">${webhook.signature}</div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
    
    // Colorier le JSON
    this.highlightJSON();
    
    // Afficher la modal
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  
  static closeModal() {
    if (!this.modal) return;
    
    this.modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    this.currentWebhook = null;
  }
  
  static highlightJSON() {
    // Colorier le JSON dans les viewers
    document.querySelectorAll('.json-viewer').forEach(viewer => {
      let content = viewer.textContent;
      
      // Colorer les clés
      content = content.replace(/\"([^\"]+)\"(?=\s*:)/g, '<span class="json-key">"$1"</span>');
      
      // Colorer les chaînes
      content = content.replace(/:\s*\"([^\"]*)\"/g, ': <span class="json-string">"$1"</span>');
      
      // Colorer les nombres
      content = content.replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>');
      
      // Colorer les booléens
      content = content.replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>');
      
      // Colorer null
      content = content.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
      
      viewer.innerHTML = content;
    });
  }
  
  static async replayWebhook() {
    if (!this.currentWebhook) return;
    
    const targetUrl = prompt('URL cible pour rejouer le webhook :', 'http://localhost:8000/webhook');
    if (!targetUrl) return;
    
    try {
      const response = await API.replayWebhook(this.currentWebhook.id, targetUrl);
      
      if (response.success) {
        Toast.success(`Webhook rejoué avec succès ! Status: ${response.replay_status}`);
      } else {
        Toast.error(`Erreur lors du replay: ${response.error}`);
      }
    } catch (error) {
      console.error('❌ Erreur replay:', error);
      Toast.error('Erreur lors du replay du webhook');
    }
  }
  
  static async copyWebhook() {
    if (!this.currentWebhook) return;
    
    try {
      const webhookData = {
        id: this.currentWebhook.id,
        event_type: this.currentWebhook.event_type,
        payload: this.currentWebhook.payload,
        headers: this.currentWebhook.headers,
        received_at: this.currentWebhook.received_at
      };
      
      await navigator.clipboard.writeText(JSON.stringify(webhookData, null, 2));
      Toast.success('Webhook copié dans le presse-papier ! 📋');
      
    } catch (error) {
      console.error('❌ Erreur copie:', error);
      
      // Fallback pour navigateurs plus anciens
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(this.currentWebhook, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      Toast.success('Webhook copié ! 📋');
    }
  }
}

// Styles CSS pour les détails dans la modal
const modalStyles = `
<style>
.webhook-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: var(--border-radius);
  border-left: 4px solid var(--cameroon-green);
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  color: var(--cameroon-green);
  font-size: 1.1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item strong {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selectable {
  user-select: all;
  cursor: text;
}

.mono {
  font-family: var(--font-mono);
  font-size: 0.875rem;
}

.small {
  font-size: 0.75rem;
}

.event-badge {
  background: var(--cameroon-yellow);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  display: inline-block;
}

.valid {
  color: var(--success);
}

.invalid {
  color: var(--error);
}

.signature-info {
  background: var(--bg-primary);
  padding: 0.75rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', modalStyles);