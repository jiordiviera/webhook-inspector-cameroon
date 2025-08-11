#!/usr/bin/env node

/**
 * 🇨🇲 Exemple d'envoi de webhook avec signature HMAC-SHA256
 * Cet exemple montre comment un client peut envoyer des webhooks sécurisés
 */

const crypto = require("crypto");

// Configuration
const WEBHOOK_URL = "http://localhost:3002/webhook";
const WEBHOOK_SECRET = "votre-cle-secrete-ici"; // Même clé que dans .env

/**
 * Génère une signature HMAC-SHA256 pour un payload
 */
function generateSignature(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");
}

/**
 * Envoie un webhook avec signature
 */
async function sendWebhookWithSignature(payload) {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, WEBHOOK_SECRET);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": `sha256=${signature}`, // Format GitHub/GitLab
        // Alternative: 'X-Hub-Signature-256': `sha256=${signature}`,
        "User-Agent": "Genuka-Client/1.0",
        "X-Event-Type": payload.event_type || "unknown",
      },
      body: payloadString,
    });

    const result = await response.json();
    console.log("✅ Webhook envoyé avec succès:", result);
    return result;
  } catch (error) {
    console.error("❌ Erreur envoi webhook:", error);
    throw error;
  }
}

// Exemples de webhooks camerounais

// 1. Commande avec Orange Money
async function exempleCommandeOrangeMoney() {
  console.log("\n🍊 Exemple 1: Commande Orange Money");

  const payload = {
    event_type: "order.completed",
    company_id: "genuka-cm",
    order: {
      id: "ORD-CM-2024-001",
      customer: {
        name: "Marie-Claire Ngono",
        phone: "+237677123456",
        city: "Yaoundé",
        quarter: "Bastos",
      },
      total: 25000,
      currency: "FCFA",
      items: [
        {
          name: "Poisson braisé + Bâton de manioc",
          price: 15000,
          quantity: 1,
        },
        {
          name: "Jus de gingembre",
          price: 2500,
          quantity: 4,
        },
      ],
      payment: {
        method: "Orange Money",
        reference: "OM" + Date.now(),
        phone: "+237677123456",
      },
      delivery: {
        address: "Quartier Bastos, Yaoundé",
        time: "19h30",
      },
    },
    timestamp: new Date().toISOString(),
  };

  return await sendWebhookWithSignature(payload);
}

// 2. Paiement MTN Mobile Money
async function exemplePaiementMTN() {
  console.log("\n💛 Exemple 2: Paiement MTN Mobile Money");

  const payload = {
    event_type: "payment.completed",
    company_id: "boutique-douala",
    payment: {
      id: "PAY-MTN-2024-" + Math.floor(Math.random() * 10000),
      amount: 50000,
      currency: "FCFA",
      method: "MTN Mobile Money",
      phone: "+237698765432",
      customer: {
        name: "Paul Eto'o",
        phone: "+237698765432",
        city: "Douala",
        quarter: "Bonabéri",
      },
      reference: "MTN" + Date.now(),
      status: "completed",
    },
    timestamp: new Date().toISOString(),
  };

  return await sendWebhookWithSignature(payload);
}

// 3. Inscription utilisateur
async function exempleInscriptionUtilisateur() {
  console.log("\n👤 Exemple 3: Inscription utilisateur");

  const payload = {
    event_type: "user.created",
    company_id: "app-cameroun",
    user: {
      id: "USER-CM-" + Date.now(),
      name: "Sandrine Mbassi",
      email: "sandrine.mbassi@email.cm",
      phone: "+237654321098",
      location: {
        city: "Bafoussam",
        region: "Ouest",
      },
      preferences: {
        language: "fr",
        currency: "FCFA",
        notifications: {
          sms: true,
          whatsapp: true,
        },
      },
      registration: {
        source: "mobile_app",
        referral: "friend",
      },
    },
    timestamp: new Date().toISOString(),
  };

  return await sendWebhookWithSignature(payload);
}

// 4. Test de validation d'erreur (signature invalide)
async function exempleSignatureInvalide() {
  console.log("\n❌ Exemple 4: Test signature invalide");

  const payload = {
    event_type: "test.invalid_signature",
    message: "Ce webhook a une signature incorrecte",
  };

  const payloadString = JSON.stringify(payload);
  const invalidSignature = "signature_incorrecte_12345";

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": `sha256=${invalidSignature}`,
        "User-Agent": "Test-Client/1.0",
      },
      body: payloadString,
    });

    const result = await response.json();
    console.log("⚠️ Réponse signature invalide:", result);
  } catch (error) {
    console.error("❌ Erreur test signature:", error);
  }
}

// Exécution des exemples
async function main() {
  console.log("🇨🇲 Exemples Webhook Inspector Cameroon");
  console.log("=====================================\n");
  console.log(`📡 URL: ${WEBHOOK_URL}`);
  console.log(`🔐 Secret configuré: ${WEBHOOK_SECRET ? "Oui" : "Non"}\n`);

  try {
    await exempleCommandeOrangeMoney();
    await sleep(1000);

    await exemplePaiementMTN();
    await sleep(1000);

    await exempleInscriptionUtilisateur();
    await sleep(1000);

    await exempleSignatureInvalide();

    console.log("\n✅ Tous les exemples exécutés !");
    console.log("📊 Consultez le dashboard: http://localhost:3002");
  } catch (error) {
    console.error("❌ Erreur lors des tests:", error);
    process.exit(1);
  }
}

// Utilitaire sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exécuter si ce fichier est lancé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateSignature,
  sendWebhookWithSignature,
  exempleCommandeOrangeMoney,
  exemplePaiementMTN,
  exempleInscriptionUtilisateur,
};
