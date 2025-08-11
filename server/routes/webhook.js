import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { WebhookService } from '../services/webhook.js';
import { SignatureValidator } from '../services/signature.js';
import { Logger } from '../services/logger.js';
import { broadcastWebhook } from '../services/websocket.js';

const router = express.Router();

// Rate limiting pour éviter le spam
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requêtes par minute max
    message: {
        error: 'Trop de requêtes webhook',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Cache pour éviter les doublons (idempotence)
const processedDeliveries = new Set();

// Middleware de logging des webhooks
const logWebhookRequest = (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
        const processingTime = Date.now() - startTime;
        
        Logger.logWebhook({
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body_size: req.body ? req.body.length : 0,
            processing_time: processingTime,
            status: res.statusCode,
            ip: req.ip || req.connection.remoteAddress
        });
        
        return originalSend.call(this, data);
    };
    
    next();
};

/**
 * POST /webhook - Endpoint principal pour recevoir les webhooks
 */
router.post('/', webhookLimiter, logWebhookRequest, async (req, res) => {
    const startTime = Date.now();
    
    try {
        // 1. Extraction des headers Genuka
        const signature = req.headers['x-webhook-signature'] || 
                         req.headers['x-genuka-signature'] ||
                         req.headers['x-signature'] ||
                         req.headers['signature'];
                         
        const event = req.headers['x-genuka-event'] || 
                     req.headers['x-event-type'] ||
                     'unknown';
                     
        const deliveryId = req.headers['x-genuka-delivery'] ||
                          req.headers['x-delivery-id'] ||
                          crypto.randomUUID();
        
        const companyId = req.headers['x-genuka-company'] ||
                         req.headers['x-company-id'];
        
        // 2. Vérification de l'idempotence (éviter les doublons)
        if (processedDeliveries.has(deliveryId)) {
            console.log(`🔄 Webhook déjà traité: ${deliveryId}`);
            return res.status(200).json({
                received: true,
                delivery_id: deliveryId,
                already_processed: true,
                message: 'Webhook déjà traité'
            });
        }
        
        // 3. Conversion du body en string pour validation signature
        const payloadString = req.body.toString('utf-8');
        let payload;
        
        try {
            payload = JSON.parse(payloadString);
        } catch (parseError) {
            console.error('❌ Payload JSON invalide:', parseError.message);
            return res.status(400).json({
                error: 'Invalid JSON payload',
                code: 'INVALID_JSON',
                delivery_id: deliveryId
            });
        }
        
        // 4. Validation de la signature HMAC-SHA256
        let isValidSignature = true;
        let signatureError = null;
        
        if (signature && process.env.GENUKA_WEBHOOK_SECRET) {
            const validationResult = SignatureValidator.validate(
                payloadString,
                signature,
                process.env.GENUKA_WEBHOOK_SECRET
            );
            
            isValidSignature = validationResult.isValid;
            signatureError = validationResult.error;
            
            if (!isValidSignature) {
                console.error(`🔐 Signature invalide pour ${deliveryId}:`, signatureError);
                
                // En production, on peut rejeter les signatures invalides
                if (process.env.NODE_ENV === 'production' && process.env.REJECT_INVALID_SIGNATURES === 'true') {
                    return res.status(401).json({
                        error: 'Invalid signature',
                        code: 'INVALID_SIGNATURE',
                        delivery_id: deliveryId
                    });
                }
            }
        } else if (!signature) {
            console.warn(`⚠️  Aucune signature fournie pour ${deliveryId}`);
        } else if (!process.env.GENUKA_WEBHOOK_SECRET) {
            console.warn('⚠️  GENUKA_WEBHOOK_SECRET non configuré');
        }
        
        // 5. RÉPONSE RAPIDE (< 5 secondes) - OBLIGATOIRE
        res.status(200).json({
            received: true,
            delivery_id: deliveryId,
            event_type: event,
            is_valid_signature: isValidSignature,
            processing_time_ms: Date.now() - startTime,
            message: 'Webhook reçu avec succès ! 🇨🇲'
        });
        
        // 6. Marquer comme traité APRÈS la réponse
        processedDeliveries.add(deliveryId);
        
        // Nettoyer le cache (garder seulement les 1000 derniers)
        if (processedDeliveries.size > 1000) {
            const deliveriesArray = Array.from(processedDeliveries);
            const toRemove = deliveriesArray.slice(0, processedDeliveries.size - 1000);
            toRemove.forEach(id => processedDeliveries.delete(id));
        }
        
        // 7. TRAITEMENT ASYNCHRONE après la réponse
        setImmediate(async () => {
            try {
                await processWebhookAsync({
                    payload,
                    payloadString,
                    headers: req.headers,
                    signature,
                    isValidSignature,
                    signatureError,
                    event,
                    deliveryId,
                    companyId,
                    processingTime: Date.now() - startTime,
                    sourceIp: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent']
                });
                
            } catch (asyncError) {
                console.error('❌ Erreur traitement asynchrone:', asyncError);
                Logger.logError('webhook_async_processing', asyncError, {
                    delivery_id: deliveryId,
                    event
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur webhook:', error);
        
        // Log l'erreur mais retourner 200 si c'est non-critique
        if (error.code === 'NON_CRITICAL_ERROR') {
            res.status(200).json({
                received: true,
                warning: error.message,
                delivery_id: req.headers['x-genuka-delivery']
            });
        } else {
            // Erreur critique = retry de Genuka
            res.status(500).json({
                error: 'Internal server error',
                code: 'PROCESSING_ERROR',
                delivery_id: req.headers['x-genuka-delivery']
            });
        }
        
        Logger.logError('webhook_processing', error, {
            headers: req.headers,
            body_size: req.body ? req.body.length : 0
        });
    }
});

/**
 * POST /webhook/test - Endpoint de test pour développement
 */
router.post('/test', logWebhookRequest, (req, res) => {
    console.log('🧪 Test webhook reçu:', req.body);
    
    res.status(200).json({
        message: 'Test webhook reçu avec succès au Cameroun! 🇨🇲',
        timestamp: new Date().toISOString(),
        timezone: 'Africa/Douala',
        payload: req.body
    });
});

/**
 * Traitement asynchrone du webhook
 */
async function processWebhookAsync(webhookData) {
    const {
        payload,
        payloadString,
        headers,
        signature,
        isValidSignature,
        signatureError,
        event,
        deliveryId,
        companyId,
        processingTime,
        sourceIp,
        userAgent
    } = webhookData;
    
    console.log(`🎯 Traitement asynchrone ${event} - ${deliveryId}`);
    
    try {
        // 1. Sauvegarder en base de données
        const webhookRecord = await WebhookService.create({
            delivery_id: deliveryId,
            event_type: event,
            company_id: companyId,
            payload: payloadString,
            headers: JSON.stringify(headers),
            signature,
            is_valid_signature: isValidSignature,
            signature_error: signatureError,
            source_ip: sourceIp,
            user_agent: userAgent,
            processing_time_ms: processingTime,
            received_at: new Date().toISOString()
        });
        
        console.log(`✅ Webhook sauvegardé: ${webhookRecord.id}`);
        
        // 2. Diffuser via WebSocket aux clients connectés
        broadcastWebhook({
            type: 'webhook_received',
            webhook: webhookRecord,
            stats: await WebhookService.getStats()
        });
        
        // 3. Traitement métier spécifique par type d'événement
        await handleWebhookByType(event, payload, companyId, webhookRecord);
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde webhook:', error);
        throw error;
    }
}

/**
 * Traitement par type d'événement (logique métier)
 */
async function handleWebhookByType(eventType, payload, companyId, webhookRecord) {
    try {
        switch (eventType) {
            case 'order.created':
                await handleOrderCreated(payload, companyId);
                break;
                
            case 'order.completed':
                await handleOrderCompleted(payload, companyId);
                break;
                
            case 'payment.completed':
                await handlePaymentCompleted(payload, companyId);
                break;
                
            case 'payment.failed':
                await handlePaymentFailed(payload, companyId);
                break;
                
            case 'customer.created':
                await handleCustomerCreated(payload, companyId);
                break;
                
            default:
                console.log(`ℹ️  Type d'événement non géré: ${eventType}`);
        }
        
    } catch (error) {
        console.error(`❌ Erreur traitement ${eventType}:`, error);
        // Ne pas faire échouer le webhook pour des erreurs métier
    }
}

// Handlers spécifiques par type d'événement
async function handleOrderCreated(orderData, companyId) {
    console.log(`📦 Nouvelle commande créée pour ${companyId}:`, orderData.order?.id);
    
    // Exemple: Notification SMS au client camerounais
    if (orderData.order?.customer?.phone) {
        const phone = orderData.order.customer.phone;
        const total = orderData.order.total;
        
        // Détecter l'opérateur (MTN, Orange, Camtel)
        const operator = detectCameroonOperator(phone);
        console.log(`📱 Client ${operator}: ${phone} - Montant: ${total} FCFA`);
        
        // Ici: intégration SMS/WhatsApp Business
    }
}

async function handlePaymentCompleted(paymentData, companyId) {
    console.log(`💰 Paiement complété pour ${companyId}:`, paymentData.payment?.reference);
    
    const method = paymentData.payment?.method;
    if (method?.includes('Orange') || method?.includes('MTN')) {
        console.log(`📱 Paiement mobile money: ${method}`);
    }
}

async function handleOrderCompleted(orderData, companyId) {
    console.log(`✅ Commande terminée pour ${companyId}:`, orderData.order?.id);
}

async function handlePaymentFailed(paymentData, companyId) {
    console.log(`❌ Paiement échoué pour ${companyId}:`, paymentData.payment?.reference);
    console.log(`Raison: ${paymentData.payment?.error}`);
}

async function handleCustomerCreated(customerData, companyId) {
    console.log(`👤 Nouveau client pour ${companyId}:`, customerData.customer?.email);
}

/**
 * Détecter l'opérateur téléphonique camerounais
 */
function detectCameroonOperator(phone) {
    if (!phone) return 'unknown';
    
    const cleanPhone = phone.replace(/[^\d]/g, '');
    
    // Préfixes Cameroun (+237)
    if (cleanPhone.startsWith('237')) {
        const number = cleanPhone.substring(3);
        
        // MTN: 67X, 68X, 65X
        if (/^(67|68|65)/.test(number)) return 'MTN';
        
        // Orange: 69X, 65X, 66X
        if (/^(69|66)/.test(number)) return 'Orange';
        
        // Camtel: 62X, 63X
        if (/^(62|63)/.test(number)) return 'Camtel';
    }
    
    return 'unknown';
}

export default router;