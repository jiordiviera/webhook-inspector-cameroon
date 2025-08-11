# 🇨🇲 Webhook Inspector Cameroon

Application web moderne pour capturer, analyser et déboguer les webhooks de l'API Genuka dans le contexte camerounais.

## 🚀 Fonctionnalités

### 📡 Capture & Réception des Webhooks
- **Endpoint universel** : `POST /webhook` accepte tous les webhooks Genuka
- **Validation signature** : Vérification automatique du secret webhook HMAC-SHA256
- **Headers complets** : Capture de tous les headers HTTP
- **Payload brut** : Stockage du JSON original + version formatée
- **Horodatage précis** : Timestamp avec timezone Cameroun (WAT)
- **ID unique** : Génération d'un UUID pour chaque webhook reçu

### 🎨 Interface Web Interactive
- **Dashboard temps réel** : WebSocket pour mise à jour live
- **Design Camerounais** : Couleurs du drapeau (Vert, Rouge, Jaune)
- **Responsive** : Compatible mobile/desktop
- **Dark/Light mode** : Basculement thème
- **Multilingue** : Interface FR/EN avec expressions camerounaises

### 📊 Visualisation & Analyse
- **Timeline interactive** : Flux chronologique des webhooks
- **JSON Viewer** : Syntaxe colorée avec détection spécifique Cameroun
- **Métriques temps réel** : Statistiques en direct
- **Event Grouping** : Regroupement par type d'événement

### 🔍 Filtrage & Recherche
- Filtrage par type d'événement, société, signature
- Recherche textuelle dans le payload JSON
- Filtrage par date
- Pagination intelligente

### 🛠️ Outils de Débogage
- **Webhook Replayer** : Rejouer un webhook vers un autre endpoint
- **Export** : JSON/CSV des données
- **Test Creator** : Créer des webhooks de test
- **Nettoyage** : Suppression des anciens webhooks

### 🇨🇲 Spécificités Camerounaises
- **Timezone** : Heure locale Cameroun (WAT)
- **Devises** : Support FCFA dans les montants
- **Mobile Money** : Détection Orange Money/MTN Mobile Money
- **Téléphones** : Reconnaissance numéros camerounais (+237)
- **Produits locaux** : Détection produits typiquement camerounais

## 🏗️ Architecture Technique

### Backend (Bun + TypeScript)
```
src/
├── routes/
│   ├── webhook.ts      # Réception webhooks
│   └── api.ts          # API REST
├── services/
│   ├── webhook-validator.ts  # Validation signatures
│   └── broadcast.ts          # WebSocket broadcasting
├── models/
│   └── webhook.ts      # Modèle données
├── utils/
│   └── cameroon.ts     # Utils spécifiques Cameroun
└── database/
    └── init.ts         # Initialisation SQLite
```

### Frontend (Vanilla JS)
```
src/public/
├── components/
│   ├── Dashboard.js    # Dashboard principal
│   ├── WebhookList.js  # Liste webhooks
│   └── JSONViewer.js   # Viewer JSON
├── styles/
│   ├── cameroon.css    # Thème Cameroun
│   └── components.css  # Styles composants
└── utils/
    ├── websocket.js    # Connexion temps réel
    └── api.js          # Appels API
```

## 🚀 Installation & Démarrage

### Prérequis
- [Bun](https://bun.sh/) >= 1.0.0

### Installation
```bash
# Cloner le projet
cd webhook-inspector-cameroon

# Installer les dépendances
bun install

# Initialiser la base de données
bun run db:init

# Démarrer en développement
bun run dev

# Ou démarrer en production
bun run start
```

### Variables d'environnement
```bash
# .env
PORT=3001
WEBHOOK_SECRET=your-webhook-secret-here
```

## 📖 Utilisation

### 1. Démarrer l'application
```bash
bun run dev
```
L'application sera disponible sur http://localhost:3001

### 2. Configurer vos webhooks
Pointez vos webhooks Genuka vers :
```
POST http://localhost:3001/webhook
```

### 3. Interface Web
Accédez au dashboard sur http://localhost:3001 pour :
- Voir les webhooks en temps réel
- Filtrer et rechercher
- Analyser les données
- Exporter les résultats

## 🇨🇲 Exemples Camerounais

### Webhook Commande avec Orange Money
```json
POST /webhook
{
  "event": "order.created",
  "data": {
    "order": {
      "id": "ORD-CM-001",
      "customer": {
        "name": "Jean-Claude Mbappé",
        "phone": "+237677123456",
        "city": "Douala"
      },
      "total": 15000,
      "currency": "FCFA",
      "payment": {
        "method": "Orange Money",
        "reference": "#OM1234567890"
      },
      "items": [
        {
          "name": "Ndolé traditionnel",
          "quantity": 1,
          "price": 7500
        },
        {
          "name": "Plantains braisés",
          "quantity": 1,
          "price": 7500
        }
      ]
    }
  },
  "company_id": "restaurant-douala-001",
  "timestamp": "2025-08-11T15:30:00+01:00"
}
```

### Détection automatique
L'application détecte automatiquement :
- ✅ **Orange Money** / **MTN Mobile Money**
- ✅ **Montants en FCFA**
- ✅ **Numéros camerounais** (+237...)
- ✅ **Produits locaux** (Ndolé, Eru, Koki...)
- ✅ **Villes camerounaises** (Douala, Yaoundé...)

## 🚀 API Complète

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/webhook` | POST | Recevoir un webhook |
| `/api/webhooks` | GET | Liste des webhooks |
| `/api/webhooks/{id}` | GET | Détail d'un webhook |
| `/api/webhooks/{id}/replay` | POST | Rejouer un webhook |
| `/api/test` | POST | Créer un webhook de test |
| `/api/stats` | GET | Statistiques |
| `/api/events` | GET | Types d'événements |
| `/api/companies` | GET | Liste des sociétés |
| `/api/export` | GET | Export CSV/JSON |

## 🤝 Contribution

Made with ❤️ by Genuka Team 🇨🇲

**Allez l'équipe, on code ensemble ! 🇨🇲**
