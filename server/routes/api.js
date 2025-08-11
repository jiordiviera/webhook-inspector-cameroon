import express from 'express';
import { WebhookService } from '../services/webhook.js';
import { Logger } from '../services/logger.js';
import { SignatureValidator } from '../services/signature.js';
import { getWebSocketStats } from '../services/websocket.js';

const router = express.Router();

/**
 * GET /api/webhooks - Récupérer tous les webhooks avec pagination
 */
router.get('/webhooks', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            event_type,
            company_id,
            is_valid_signature,
            start_date,
            end_date
        } = req.query;
        
        const webhooks = await WebhookService.getAll({
            page: parseInt(page),
            limit: parseInt(limit),
            event_type,
            company_id,
            is_valid_signature: is_valid_signature ? is_valid_signature === 'true' : undefined,
            start_date,
            end_date
        });
        
        res.json({
            success: true,
            webhooks,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
        
    } catch (error) {
        Logger.logError('api_get_webhooks', error, { query: req.query });
        res.status(500).json({
            success: false,
            error: 'Erreur récupération des webhooks'
        });
    }
});

/**
 * GET /api/webhooks/:id - Récupérer un webhook par ID
 */
router.get('/webhooks/:id', async (req, res) => {
    try {
        const webhook = await WebhookService.getById(req.params.id);
        
        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: 'Webhook non trouvé'
            });
        }
        
        res.json({
            success: true,
            webhook
        });
        
    } catch (error) {
        Logger.logError('api_get_webhook', error, { id: req.params.id });
        res.status(500).json({
            success: false,
            error: 'Erreur récupération du webhook'
        });
    }
});

/**
 * GET /api/stats - Statistiques générales
 */
router.get('/stats', async (req, res) => {
    try {
        const webhookStats = await WebhookService.getStats();
        const wsStats = getWebSocketStats();
        
        res.json({
            success: true,
            stats: {
                webhooks: webhookStats,
                websocket: wsStats,
                server: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    node_version: process.version,
                    timezone: 'Africa/Douala'
                }
            }
        });
        
    } catch (error) {
        Logger.logError('api_get_stats', error);
        res.status(500).json({
            success: false,
            error: 'Erreur récupération des statistiques'
        });
    }
});

/**
 * POST /api/webhooks/search - Rechercher dans les webhooks
 */
router.post('/webhooks/search', async (req, res) => {
    try {
        const { query, limit = 50 } = req.body;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Query de recherche requise'
            });
        }
        
        const webhooks = await WebhookService.search(query.trim(), { limit });
        
        res.json({
            success: true,
            webhooks,
            query: query.trim(),
            count: webhooks.length
        });
        
    } catch (error) {
        Logger.logError('api_search_webhooks', error, { body: req.body });
        res.status(500).json({
            success: false,
            error: 'Erreur recherche webhooks'
        });
    }
});

/**
 * POST /api/webhooks/:id/replay - Rejouer un webhook
 */
router.post('/webhooks/:id/replay', async (req, res) => {
    try {
        const { target_url } = req.body;
        
        if (!target_url) {
            return res.status(400).json({
                success: false,
                error: 'URL cible requise'
            });
        }
        
        // Récupérer le webhook original
        const webhook = await WebhookService.getById(req.params.id);
        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: 'Webhook non trouvé'
            });
        }
        
        // Préparer la requête de replay
        const payloadString = JSON.stringify(webhook.payload);
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Genuka-Webhook-Inspector-Replay/2.0',
            'X-Webhook-Replay': 'true',
            'X-Original-Webhook-Id': webhook.id,
            'X-Original-Delivery-Id': webhook.delivery_id,
            'X-Genuka-Event': webhook.event_type,
            ...webhook.headers
        };
        
        // Ajouter la signature si elle existe
        if (webhook.signature) {
            headers['X-Webhook-Signature'] = webhook.signature;
        }
        
        // Envoyer la requête
        const fetch = (await import('node-fetch')).default;
        const startTime = Date.now();
        
        const response = await fetch(target_url, {
            method: 'POST',
            headers,
            body: payloadString,
            timeout: 10000 // 10 secondes max
        });
        
        const processingTime = Date.now() - startTime;
        const responseText = await response.text();
        
        // Logger le replay
        Logger.logInfo(`🔄 Webhook rejoué: ${webhook.id} -> ${target_url}`, {
            original_webhook_id: webhook.id,
            target_url,
            status: response.status,
            processing_time: processingTime
        });
        
        res.json({
            success: true,
            replay: {
                original_webhook_id: webhook.id,
                target_url,
                status: response.status,
                processing_time_ms: processingTime,
                response: responseText.substring(0, 1000), // Limiter la réponse
                headers: Object.fromEntries(response.headers.entries())
            }
        });
        
    } catch (error) {
        Logger.logError('api_replay_webhook', error, {
            webhook_id: req.params.id,
            body: req.body
        });
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors du replay',
            details: error.message
        });
    }
});

/**
 * POST /api/webhooks/test - Créer un webhook de test
 */
router.post('/webhooks/test', async (req, res) => {
    try {
        const {
            event_type = 'test.webhook',
            company_id = 'test-company',
            payload = {},
            generate_signature = false,
            secret
        } = req.body;
        
        // Préparer le payload de test
        const testPayload = {
            event_type,
            company_id,
            ...payload,
            timestamp: new Date().toISOString(),
            test: true
        };
        
        const payloadString = JSON.stringify(testPayload);
        
        // Générer la signature si demandé
        let signature = null;
        if (generate_signature && secret) {
            signature = SignatureValidator.generate(payloadString, secret);
        }
        
        // Headers de test
        const headers = {
            'content-type': 'application/json',
            'user-agent': 'Genuka-Webhook-Inspector-Test/2.0',
            'x-genuka-event': event_type,
            'x-genuka-delivery': `test-${Date.now()}`,
            'x-genuka-company': company_id
        };
        
        if (signature) {
            headers['x-webhook-signature'] = signature;
        }
        
        // Envoyer vers notre propre endpoint webhook
        const fetch = (await import('node-fetch')).default;
        const baseUrl = `http://localhost:${process.env.PORT || 3002}`;
        
        const response = await fetch(`${baseUrl}/webhook`, {
            method: 'POST',
            headers,
            body: payloadString
        });
        
        const result = await response.json();
        
        res.json({
            success: true,
            test_webhook: {
                payload: testPayload,
                signature,
                headers,
                response: result
            }
        });
        
    } catch (error) {
        Logger.logError('api_test_webhook', error, { body: req.body });
        res.status(500).json({
            success: false,
            error: 'Erreur création webhook de test'
        });
    }
});

/**
 * GET /api/logs - Récupérer les logs
 */
router.get('/logs', async (req, res) => {
    try {
        const {
            level,
            limit = 100,
            start_date,
            end_date
        } = req.query;
        
        const logs = await Logger.getLogs({
            level,
            limit: parseInt(limit),
            start_date,
            end_date
        });
        
        res.json({
            success: true,
            logs,
            count: logs.length
        });
        
    } catch (error) {
        Logger.logError('api_get_logs', error, { query: req.query });
        res.status(500).json({
            success: false,
            error: 'Erreur récupération des logs'
        });
    }
});

/**
 * POST /api/signature/validate - Valider une signature
 */
router.post('/signature/validate', (req, res) => {
    try {
        const { payload, signature, secret } = req.body;
        
        if (!payload || !signature || !secret) {
            return res.status(400).json({
                success: false,
                error: 'Payload, signature et secret requis'
            });
        }
        
        const validation = SignatureValidator.validate(payload, signature, secret);
        
        res.json({
            success: true,
            validation
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur validation signature'
        });
    }
});

/**
 * POST /api/signature/generate - Générer une signature
 */
router.post('/signature/generate', (req, res) => {
    try {
        const { payload, secret } = req.body;
        
        if (!payload || !secret) {
            return res.status(400).json({
                success: false,
                error: 'Payload et secret requis'
            });
        }
        
        const signature = SignatureValidator.generate(payload, secret);
        
        res.json({
            success: true,
            signature
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur génération signature'
        });
    }
});

export default router;