import { createHmac, timingSafeEqual } from 'crypto';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class WebhookValidator {
  
  // Valider la signature HMAC-SHA256
  static validateSignature(
    payload: string, 
    signature: string, 
    secret: string
  ): ValidationResult {
    
    if (!secret) {
      return { 
        isValid: false, 
        error: "Aucun secret configuré" 
      };
    }
    
    if (!signature) {
      return { 
        isValid: false, 
        error: "Signature manquante" 
      };
    }
    
    try {
      // Supporte différents formats de signature
      // Format 1: "sha256=hash"
      // Format 2: "hash"
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      // Calculer la signature attendue
      const expectedSignature = createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      
      // Comparaison sécurisée
      const signatureBuffer = Buffer.from(cleanSignature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      if (signatureBuffer.length !== expectedBuffer.length) {
        return { 
          isValid: false, 
          error: "Longueur de signature invalide" 
        };
      }
      
      const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);
      
      return {
        isValid,
        error: isValid ? undefined : "Signature invalide"
      };
      
    } catch (error) {
      return { 
        isValid: false, 
        error: `Erreur de validation: ${error.message}` 
      };
    }
  }
  
  // Valider le format du payload JSON
  static validatePayload(payload: string): ValidationResult {
    try {
      const parsed = JSON.parse(payload);
      
      // Vérifications basiques pour les webhooks Genuka
      if (typeof parsed !== 'object' || parsed === null) {
        return { 
          isValid: false, 
          error: "Le payload doit être un objet JSON" 
        };
      }
      
      // Vérifier la présence de champs requis typiques
      const requiredFields = ['event', 'data', 'timestamp'];
      const hasRequiredField = requiredFields.some(field => field in parsed);
      
      if (!hasRequiredField) {
        console.warn("Aucun champ standard détecté, mais payload JSON valide");
      }
      
      return { isValid: true };
      
    } catch (error) {
      return { 
        isValid: false, 
        error: `JSON invalide: ${error.message}` 
      };
    }
  }
  
  // Valider l'origine IP (optionnel)
  static validateIP(clientIP: string, allowedIPs: string[] = []): ValidationResult {
    if (allowedIPs.length === 0) {
      return { isValid: true }; // Pas de restriction IP
    }
    
    const isAllowed = allowedIPs.some(ip => {
      if (ip.includes('/')) {
        // Support pour les sous-réseaux CIDR (basique)
        const [network, mask] = ip.split('/');
        // Pour une implémentation complète, utiliser une librairie de réseau
        return clientIP.startsWith(network.split('.').slice(0, -1).join('.'));
      }
      return ip === clientIP;
    });
    
    return {
      isValid: isAllowed,
      error: isAllowed ? undefined : `IP ${clientIP} non autorisée`
    };
  }
  
  // Détecter le type d'événement à partir du payload
  static detectEventType(payload: any, headers: any): string {
    // Tentative de détection du type d'événement
    if (payload.event) {
      return payload.event;
    }
    
    if (payload.type) {
      return payload.type;
    }
    
    if (payload.data && payload.data.type) {
      return payload.data.type;
    }
    
    // Détection basée sur les headers
    if (headers['x-event-type'] || headers['X-Event-Type']) {
      return headers['x-event-type'] || headers['X-Event-Type'];
    }
    
    if (headers['x-genuka-event'] || headers['X-Genuka-Event']) {
      return headers['x-genuka-event'] || headers['X-Genuka-Event'];
    }
    
    // Détection basée sur la structure du payload
    if (payload.order && payload.order.id) {
      if (payload.order.status === 'created') return 'order.created';
      if (payload.order.status === 'paid') return 'order.paid';
      if (payload.order.status === 'shipped') return 'order.shipped';
      return 'order.updated';
    }
    
    if (payload.customer) {
      return payload.customer.id ? 'customer.updated' : 'customer.created';
    }
    
    if (payload.payment) {
      return 'payment.created';
    }
    
    if (payload.product) {
      return 'product.updated';
    }
    
    return 'unknown';
  }
  
  // Extraire l'ID de la société/client
  static extractCompanyId(payload: any, headers: any): string | null {
    // Depuis le payload
    if (payload.company_id) return payload.company_id;
    if (payload.shop_id) return payload.shop_id;
    if (payload.tenant_id) return payload.tenant_id;
    
    if (payload.data) {
      if (payload.data.company_id) return payload.data.company_id;
      if (payload.data.shop_id) return payload.data.shop_id;
    }
    
    // Depuis les headers
    if (headers['x-company-id'] || headers['X-Company-Id']) {
      return headers['x-company-id'] || headers['X-Company-Id'];
    }
    
    if (headers['x-shop-id'] || headers['X-Shop-Id']) {
      return headers['x-shop-id'] || headers['X-Shop-Id'];
    }
    
    return null;
  }
}