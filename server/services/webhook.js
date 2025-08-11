import { database } from './database.js';

class WebhookService {
    /**
     * Créer un nouveau webhook en base
     */
    static async create(webhookData) {
        const {
            delivery_id,
            event_type,
            company_id,
            payload,
            headers,
            signature,
            is_valid_signature,
            signature_error,
            source_ip,
            user_agent,
            processing_time_ms,
            received_at
        } = webhookData;
        
        const sql = `
            INSERT INTO webhooks (
                delivery_id, event_type, company_id, payload, headers,
                signature, is_valid_signature, signature_error,
                source_ip, user_agent, processing_time_ms, received_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            delivery_id, event_type, company_id, payload, headers,
            signature, is_valid_signature ? 1 : 0, signature_error,
            source_ip, user_agent, processing_time_ms, received_at
        ];
        
        try {
            const result = await database.run(sql, params);
            
            // Récupérer le webhook créé
            const createdWebhook = await database.get(
                'SELECT * FROM webhooks WHERE rowid = ?',
                [result.id]
            );
            
            // Parser le payload et les headers pour l'affichage
            if (createdWebhook) {
                try {
                    createdWebhook.payload = JSON.parse(createdWebhook.payload);
                    createdWebhook.headers = JSON.parse(createdWebhook.headers);
                } catch (parseError) {
                    console.warn('⚠️ Erreur parsing webhook:', parseError.message);
                }
            }
            
            return createdWebhook;
            
        } catch (error) {
            console.error('❌ Erreur création webhook:', error);
            throw error;
        }
    }
    
    /**
     * Récupérer tous les webhooks avec pagination
     */
    static async getAll(options = {}) {
        const {
            page = 1,
            limit = 50,
            event_type,
            company_id,
            is_valid_signature,
            start_date,
            end_date
        } = options;
        
        let sql = 'SELECT * FROM webhooks WHERE 1=1';
        const params = [];
        
        // Filtres
        if (event_type) {
            sql += ' AND event_type = ?';
            params.push(event_type);
        }
        
        if (company_id) {
            sql += ' AND company_id = ?';
            params.push(company_id);
        }
        
        if (typeof is_valid_signature === 'boolean') {
            sql += ' AND is_valid_signature = ?';
            params.push(is_valid_signature ? 1 : 0);
        }
        
        if (start_date) {
            sql += ' AND received_at >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            sql += ' AND received_at <= ?';
            params.push(end_date);
        }
        
        // Pagination
        sql += ' ORDER BY received_at DESC LIMIT ? OFFSET ?';
        params.push(limit, (page - 1) * limit);
        
        try {
            const webhooks = await database.all(sql, params);
            
            // Parser les JSON
            const parsedWebhooks = webhooks.map(webhook => {
                try {
                    return {
                        ...webhook,
                        payload: JSON.parse(webhook.payload),
                        headers: JSON.parse(webhook.headers),
                        is_valid_signature: webhook.is_valid_signature === 1
                    };
                } catch (parseError) {
                    console.warn('⚠️ Erreur parsing webhook:', webhook.id);
                    return webhook;
                }
            });
            
            return parsedWebhooks;
            
        } catch (error) {
            console.error('❌ Erreur récupération webhooks:', error);
            throw error;
        }
    }
    
    /**
     * Récupérer un webhook par ID
     */
    static async getById(id) {
        try {
            const webhook = await database.get(
                'SELECT * FROM webhooks WHERE id = ?',
                [id]
            );
            
            if (webhook) {
                webhook.payload = JSON.parse(webhook.payload);
                webhook.headers = JSON.parse(webhook.headers);
                webhook.is_valid_signature = webhook.is_valid_signature === 1;
            }
            
            return webhook;
            
        } catch (error) {
            console.error('❌ Erreur récupération webhook:', error);
            throw error;
        }
    }
    
    /**
     * Récupérer les statistiques
     */
    static async getStats() {
        try {
            const totalWebhooks = await database.get(
                'SELECT COUNT(*) as total FROM webhooks'
            );
            
            const todayWebhooks = await database.get(
                `SELECT COUNT(*) as today FROM webhooks 
                 WHERE date(received_at) = date('now')`
            );
            
            const validSignatures = await database.get(
                'SELECT COUNT(*) as valid FROM webhooks WHERE is_valid_signature = 1'
            );
            
            const invalidSignatures = await database.get(
                'SELECT COUNT(*) as invalid FROM webhooks WHERE is_valid_signature = 0'
            );
            
            const eventTypes = await database.all(
                `SELECT event_type, COUNT(*) as count 
                 FROM webhooks 
                 GROUP BY event_type 
                 ORDER BY count DESC`
            );
            
            const companies = await database.all(
                `SELECT company_id, COUNT(*) as count 
                 FROM webhooks 
                 WHERE company_id IS NOT NULL 
                 GROUP BY company_id 
                 ORDER BY count DESC`
            );
            
            return {
                total_webhooks: totalWebhooks.total,
                today_webhooks: todayWebhooks.today,
                valid_signatures: validSignatures.valid,
                invalid_signatures: invalidSignatures.invalid,
                event_types: eventTypes,
                companies: companies
            };
            
        } catch (error) {
            console.error('❌ Erreur récupération stats:', error);
            throw error;
        }
    }
    
    /**
     * Supprimer les anciens webhooks (nettoyage)
     */
    static async cleanup(olderThanDays = 30) {
        try {
            const result = await database.run(
                `DELETE FROM webhooks 
                 WHERE received_at < datetime('now', '-' || ? || ' days')`,
                [olderThanDays]
            );
            
            console.log(`🧹 ${result.changes} webhooks supprimés (> ${olderThanDays} jours)`);
            return result.changes;
            
        } catch (error) {
            console.error('❌ Erreur nettoyage webhooks:', error);
            throw error;
        }
    }
    
    /**
     * Rechercher dans les webhooks
     */
    static async search(query, options = {}) {
        const { limit = 50 } = options;
        
        try {
            const webhooks = await database.all(
                `SELECT * FROM webhooks 
                 WHERE payload LIKE ? OR event_type LIKE ? OR company_id LIKE ?
                 ORDER BY received_at DESC 
                 LIMIT ?`,
                [`%${query}%`, `%${query}%`, `%${query}%`, limit]
            );
            
            return webhooks.map(webhook => {
                try {
                    return {
                        ...webhook,
                        payload: JSON.parse(webhook.payload),
                        headers: JSON.parse(webhook.headers),
                        is_valid_signature: webhook.is_valid_signature === 1
                    };
                } catch (parseError) {
                    return webhook;
                }
            });
            
        } catch (error) {
            console.error('❌ Erreur recherche webhooks:', error);
            throw error;
        }
    }
}

export { WebhookService };