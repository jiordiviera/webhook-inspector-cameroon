import moment from "moment-timezone";

// Constantes spécifiques au Cameroun
export const CAMEROON_TIMEZONE = 'Africa/Douala';
export const CAMEROON_CURRENCY = 'FCFA';
export const CAMEROON_COUNTRY_CODE = 'CM';

// Régions du Cameroun
export const CAMEROON_REGIONS = [
  'Adamaoua',
  'Centre',
  'Est',
  'Extrême-Nord',
  'Littoral',
  'Nord',
  'Nord-Ouest',
  'Ouest',
  'Sud',
  'Sud-Ouest'
];

// Principales villes du Cameroun
export const CAMEROON_CITIES = [
  'Yaoundé',
  'Douala', 
  'Garoua',
  'Kousseri',
  'Bamenda',
  'Maroua',
  'Bafoussam',
  'Mokolo',
  'Ngaoundéré',
  'Bertoua',
  'Loum',
  'Kumba',
  'Nkongsamba',
  'Mbouda',
  'Dschang',
  'Foumban',
  'Ebolowa',
  'Kribi',
  'Tiko',
  'Mbalmayo'
];

// Services de paiement mobile populaires au Cameroun
export const MOBILE_MONEY_PROVIDERS = [
  'Orange Money',
  'MTN Mobile Money',
  'Express Union Mobile',
  'UBA Mobile Banking'
];

// Expressions camerounaises populaires pour l'interface
export const CAMEROON_EXPRESSIONS = {
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

// Utilitaires pour les heures camerounaises
export class CameroonTimeUtils {
  
  // Obtenir l'heure actuelle au Cameroun
  static now(): moment.Moment {
    return moment().tz(CAMEROON_TIMEZONE);
  }
  
  // Formater une date en heure locale camerounaise
  static format(date: string | Date, format: string = 'DD/MM/YYYY HH:mm'): string {
    return moment(date).tz(CAMEROON_TIMEZONE).format(format);
  }
  
  // Obtenir le début de la journée (00:00) en heure camerounaise
  static startOfDay(date?: string | Date): string {
    const target = date ? moment(date) : moment();
    return target.tz(CAMEROON_TIMEZONE).startOf('day').format();
  }
  
  // Obtenir la fin de la journée (23:59) en heure camerounaise
  static endOfDay(date?: string | Date): string {
    const target = date ? moment(date) : moment();
    return target.tz(CAMEROON_TIMEZONE).endOf('day').format();
  }
  
  // Vérifier si c'est les heures de bureau (8h-18h)
  static isBusinessHours(date?: string | Date): boolean {
    const target = date ? moment(date) : moment();
    const hour = target.tz(CAMEROON_TIMEZONE).hour();
    return hour >= 8 && hour < 18;
  }
  
  // Formater en style camerounais (ex: "Hier 14h30", "Maintenant", etc.)
  static humanize(date: string | Date): string {
    const target = moment(date).tz(CAMEROON_TIMEZONE);
    const now = moment().tz(CAMEROON_TIMEZONE);
    
    const diffMinutes = now.diff(target, 'minutes');
    const diffHours = now.diff(target, 'hours');
    const diffDays = now.diff(target, 'days');
    
    if (diffMinutes < 1) return "Maintenant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return `Hier à ${target.format('HH:mm')}`;
    if (diffDays < 7) return `${target.format('dddd à HH:mm')}`;
    
    return target.format('DD/MM/YYYY à HH:mm');
  }
}

// Utilitaires pour la monnaie FCFA
export class CameroonCurrencyUtils {
  
  // Formater un montant en FCFA
  static formatAmount(amount: number, showCurrency: boolean = true): string {
    const formatted = new Intl.NumberFormat('fr-CM', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
    
    return showCurrency ? `${formatted} FCFA` : formatted;
  }
  
  // Détecter si un montant est en FCFA dans un texte
  static detectFCFA(text: string): boolean {
    return /\b\d+[\s,.]*(FCFA|CFA|F\s*CFA)\b/i.test(text);
  }
  
  // Extraire les montants en FCFA d'un texte
  static extractAmounts(text: string): number[] {
    const regex = /(\d+(?:[\s,.]\d+)*)\s*(FCFA|CFA|F\s*CFA)/gi;
    const matches = text.matchAll(regex);
    
    return Array.from(matches).map(match => {
      return parseInt(match[1].replace(/[\s,.]/g, ''));
    });
  }
}

// Détection des services de paiement mobile
export class MobileMoneyDetector {
  
  // Détecter le type de paiement mobile à partir du payload
  static detectProvider(payload: any): string | null {
    const payloadString = JSON.stringify(payload).toLowerCase();
    
    if (payloadString.includes('orange') || payloadString.includes('#150*1#')) {
      return 'Orange Money';
    }
    
    if (payloadString.includes('mtn') || payloadString.includes('momo') || payloadString.includes('#126#')) {
      return 'MTN Mobile Money';
    }
    
    if (payloadString.includes('express union') || payloadString.includes('eu mobile')) {
      return 'Express Union Mobile';
    }
    
    if (payloadString.includes('uba') && payloadString.includes('mobile')) {
      return 'UBA Mobile Banking';
    }
    
    return null;
  }
  
  // Valider un numéro de téléphone camerounais
  static validatePhoneNumber(phone: string): boolean {
    // Formats acceptés pour le Cameroun
    // +237XXXXXXXX, 237XXXXXXXX, 6XXXXXXXX, 7XXXXXXXX
    const patterns = [
      /^\+237[67]\d{8}$/,  // +237 6/7 + 8 chiffres
      /^237[67]\d{8}$/,    // 237 6/7 + 8 chiffres  
      /^[67]\d{8}$/        // 6/7 + 8 chiffres
    ];
    
    return patterns.some(pattern => pattern.test(phone.replace(/\s/g, '')));
  }
}

// Utilitaires pour les produits camerounais
export class CameroonProductUtils {
  
  // Produits typiquement camerounais
  static readonly TYPICAL_PRODUCTS = [
    'ndolé', 'eru', 'koki', 'bobolo', 'bâton de manioc',
    'plantain', 'macabo', 'taro', 'igname', 'arachide',
    'cacao', 'café', 'banane', 'avocat', 'mangue',
    'piment', 'gingembre', 'curcuma', 'poivre blanc',
    'bière camerounaise', '33 export', 'mutzig', 'castel',
    'huile rouge', 'huile de palme', 'beurre de karité'
  ];
  
  // Détecter si un produit est typiquement camerounais
  static isTypicalProduct(productName: string): boolean {
    const name = productName.toLowerCase();
    return this.TYPICAL_PRODUCTS.some(product => 
      name.includes(product) || product.includes(name)
    );
  }
  
  // Suggérer des catégories pour des produits camerounais
  static suggestCategory(productName: string): string {
    const name = productName.toLowerCase();
    
    if (['ndolé', 'eru', 'koki'].some(p => name.includes(p))) {
      return 'Plats traditionnels';
    }
    
    if (['plantain', 'macabo', 'taro', 'igname', 'bobolo'].some(p => name.includes(p))) {
      return 'Tubercules et féculents';
    }
    
    if (['cacao', 'café', 'arachide'].some(p => name.includes(p))) {
      return 'Produits d\'exportation';
    }
    
    if (['33', 'mutzig', 'castel', 'bière'].some(p => name.includes(p))) {
      return 'Boissons';
    }
    
    if (['huile', 'karité'].some(p => name.includes(p))) {
      return 'Huiles et cosmétiques';
    }
    
    return 'Général';
  }
}