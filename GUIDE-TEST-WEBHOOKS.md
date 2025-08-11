# 🧪 Guide de Test des Webhooks Genuka

Ce guide explique comment tester vos webhooks Genuka avec le Webhook Inspector.

## 🎯 Objectif

Vous êtes développeur et vous utilisez l'API Genuka. Vous devez **tester vos webhooks** avec les **clés secrètes** pour vérifier que :
- Votre signature HMAC-SHA256 est correcte
- Le format de votre payload est valide  
- Votre webhook arrive bien à destination
- La validation fonctionne côté réception

## 🚀 Méthodes de Test

### 1. Interface Web (Recommandé) 

#### Étapes :
1. Ouvrez http://localhost:3002
2. Cliquez sur **"Test Webhook"** dans la barre d'outils
3. Sélectionnez un **template Genuka** prédéfini :
   - `order.created` - Commande créée
   - `order.completed` - Commande terminée  
   - `payment.completed` - Paiement réussi
   - `payment.failed` - Paiement échoué
   - `user.created` - Utilisateur créé
4. Entrez votre **clé secrète Genuka**
5. Modifiez le JSON si nécessaire
6. Cliquez **"Envoyer Test"**

#### Avantages :
- ✅ **Génération automatique** de la signature HMAC-SHA256
- ✅ **Templates préremplis** avec données camerounaises réalistes
- ✅ **Validation** du JSON en temps réel
- ✅ **Affichage du résultat** complet (status, headers, réponse)
- ✅ Interface **intuitive** et guidée

### 2. cURL (Manuel)

```bash
# Exemple avec signature générée manuellement
curl -X POST http://localhost:3002/webhook \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=YOUR_GENERATED_SIGNATURE" \
  -H "User-Agent: YourApp/1.0" \
  -d '{
    "event_type": "order.created",
    "company_id": "votre-company-id",
    "order": {
      "id": "ORD-TEST-001",
      "total": 25000,
      "currency": "FCFA"
    }
  }'
```

### 3. Code JavaScript/Node.js

```javascript
const crypto = require('crypto');

function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

const payload = JSON.stringify({
  event_type: 'payment.completed',
  company_id: 'mon-app',
  payment: {
    amount: 50000,
    currency: 'FCFA',
    method: 'Orange Money'
  }
});

const signature = generateSignature(payload, 'ma-cle-secrete');

fetch('http://localhost:3002/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Signature': `sha256=${signature}`
  },
  body: payload
});
```

## 🔐 Gestion des Clés Secrètes

### Configuration côté Inspector
```bash
# .env
WEBHOOK_SECRET=votre-cle-secrete-partagee
```

### Headers supportés
L'inspector accepte la signature dans ces headers :
- `X-Signature` (format: `sha256=signature`)
- `X-Hub-Signature-256` (format GitHub/GitLab)
- `Signature` (format direct)

### Validation de signature
- ✅ **Automatique** si `WEBHOOK_SECRET` configuré
- ✅ **HMAC-SHA256** standard
- ✅ **Timing-safe comparison** pour la sécurité
- ❌ **Désactivée** si pas de secret configuré

## 📋 Templates Disponibles

### 1. Commande Créée (`order.created`)
```json
{
  "event_type": "order.created",
  "company_id": "genuka-test",
  "order": {
    "id": "ORD-1708507944",
    "customer": {
      "name": "Jean-Claude Mbappé",
      "phone": "+237677123456",
      "city": "Douala",
      "quarter": "Bonanjo"
    },
    "items": [{
      "name": "Poisson braisé + Bâton de manioc",
      "price": 15000,
      "quantity": 1
    }],
    "total": 15000,
    "currency": "FCFA"
  }
}
```

### 2. Paiement Orange Money (`payment.completed`)
```json
{
  "event_type": "payment.completed", 
  "company_id": "genuka-test",
  "payment": {
    "amount": 50000,
    "currency": "FCFA",
    "method": "Orange Money",
    "customer": {
      "name": "Paul Etoo",
      "phone": "+237654321098", 
      "city": "Bafoussam"
    },
    "reference": "OM1708507944"
  }
}
```

### 3. Utilisateur Créé (`user.created`)
```json
{
  "event_type": "user.created",
  "company_id": "genuka-test", 
  "user": {
    "name": "Aminatou Diallo",
    "email": "aminatou@email.cm",
    "phone": "+237687654321",
    "city": "Maroua",
    "region": "Extrême-Nord",
    "preferences": {
      "language": "fr",
      "currency": "FCFA"
    }
  }
}
```

## 🇨🇲 Spécificités Camerounaises

Les templates incluent des **données réalistes camerounaises** :

### 📞 Téléphones
- Format : `+237XXXXXXXXX`
- Opérateurs : MTN (67X, 68X), Orange (69X, 65X)
- Détection automatique du provider

### 💰 Montants
- Devise : **FCFA** 
- Montants typiques : 5000, 15000, 25000, 50000 FCFA
- Détection automatique des montants FCFA

### 🌍 Villes 
- **Douala** (capitale économique)
- **Yaoundé** (capitale)  
- **Bafoussam** (Ouest)
- **Garoua** (Nord)
- **Maroua** (Extrême-Nord)

### 💳 Méthodes de paiement
- **Orange Money** (leader)
- **MTN Mobile Money** 
- Génération automatique des références

## 📊 Analyse des Résultats

Après envoi, vous verrez dans l'interface :

### ✅ Webhook Valide
```json
{
  "success": true,
  "webhook_id": "uuid-generated", 
  "is_valid_signature": true,
  "processing_time_ms": 15,
  "message": "Webhook reçu avec succès ! 🇨🇲"
}
```

### ❌ Signature Invalide  
```json
{
  "success": false,
  "error": "Signature invalide",
  "is_valid_signature": false
}
```

### Timeline Temps Réel
- Les webhooks apparaissent **immédiatement** dans la timeline
- **Badges colorés** : Orange Money, MTN, Signature valide/invalide
- **Détails complets** : headers, payload, timing
- **WebSocket** pour mise à jour live

## 🛠️ Débogage

### Problèmes Courants

#### 1. Signature Invalide
**Cause** : Clé secrète différente ou algorithme incorrect
**Solution** : 
- Vérifiez la clé dans `.env`
- Utilisez HMAC-SHA256 exactement
- Format : `sha256=signature_hex`

#### 2. JSON Invalide
**Cause** : Payload malformé
**Solution** :
- Validez votre JSON avec jsonlint
- Utilisez les templates fournis

#### 3. Headers Manquants
**Cause** : Content-Type absent
**Solution** :
```bash
-H "Content-Type: application/json"
```

### Logs de Debug
```bash
# Côté serveur (terminal bun dev)
🎯 Nouveau webhook reçu de 127.0.0.1
📝 Payload: {"event_type":"order.created"...
✅ Signature valide
📱 Paiement mobile détecté: Orange Money
✅ Webhook enregistré: abc-123-def
```

## 🚀 Workflow de Développement

### Phase 1: Développement Local
1. **Démarrez** l'inspector : `bun dev`
2. **Configurez** votre clé secrète dans `.env`
3. **Testez** avec l'interface web
4. **Vérifiez** les signatures et formats

### Phase 2: Tests d'Intégration  
1. **Pointez** votre app vers `http://localhost:3002/webhook`
2. **Déclenchez** les événements dans votre app
3. **Vérifiez** la réception en temps réel
4. **Ajustez** votre code si nécessaire

### Phase 3: Production
1. **Déployez** l'inspector sur votre serveur
2. **Configurez** Genuka pour pointer vers votre inspector  
3. **Monitorez** les webhooks en production
4. **Alertes** en cas de problèmes

## 📞 Support

- **Interface Web** : http://localhost:3002
- **API Health** : http://localhost:3002/api/stats  
- **WebSocket** : ws://localhost:3002/ws
- **Logs** : Terminal `bun dev`

Le Webhook Inspector vous permet de **tester et déboguer** vos webhooks Genuka de manière **simple et sécurisée** ! 🇨🇲