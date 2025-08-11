import { database } from './database.js';

class Logger {
    /**
     * Logger un webhook reçu
     */
    static logWebhook(webhookData) {
        const {
            method,
            url,
            headers,
            body_size,
            processing_time,
            status,
            ip
        } = webhookData;
        
        const message = `${method} ${url} - ${status} (${processing_time}ms) - ${ip}`;
        
        console.log(`🔍 [${new Date().toISOString()}] ${message}`);
        
        // Stocker en base si nécessaire
        this.log('webhook', message, {
            method,
            url,
            headers: typeof headers === 'object' ? JSON.stringify(headers) : headers,
            body_size,
            processing_time,
            status,
            ip
        });
    }
    
    /**
     * Logger une erreur
     */
    static logError(context, error, metadata = {}) {
        const message = `ERROR [${context}]: ${error.message}`;
        
        console.error(`❌ [${new Date().toISOString()}] ${message}`);
        console.error(error.stack);
        
        this.log('error', message, {
            context,
            error: error.message,
            stack: error.stack,
            ...metadata
        });
    }
    
    /**
     * Logger une information
     */
    static logInfo(message, metadata = {}) {
        const timestamp = new Date().toISOString();
        console.log(`ℹ️  [${timestamp}] ${message}`);
        
        this.log('info', message, metadata);
    }
    
    /**
     * Logger un warning
     */
    static logWarning(message, metadata = {}) {
        const timestamp = new Date().toISOString();
        console.warn(`⚠️  [${timestamp}] ${message}`);
        
        this.log('warning', message, metadata);
    }
    
    /**
     * Enregistrer un log en base de données
     */
    static async log(level, message, data = {}) {
        try {
            await database.run(
                'INSERT INTO logs (level, message, data) VALUES (?, ?, ?)',
                [level, message, JSON.stringify(data)]
            );
        } catch (error) {
            // Éviter la récursion en cas d'erreur de logging
            console.error('❌ Erreur logging en base:', error.message);
        }
    }
    
    /**
     * Récupérer les logs avec filtres
     */
    static async getLogs(options = {}) {
        const {
            level,
            limit = 100,
            start_date,
            end_date
        } = options;
        
        let sql = 'SELECT * FROM logs WHERE 1=1';
        const params = [];
        
        if (level) {
            sql += ' AND level = ?';
            params.push(level);
        }
        
        if (start_date) {
            sql += ' AND timestamp >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            sql += ' AND timestamp <= ?';
            params.push(end_date);
        }
        
        sql += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);
        
        try {
            const logs = await database.all(sql, params);
            
            return logs.map(log => ({
                ...log,
                data: log.data ? JSON.parse(log.data) : {}
            }));
            
        } catch (error) {
            console.error('❌ Erreur récupération logs:', error);
            throw error;
        }
    }
    
    /**
     * Nettoyer les anciens logs
     */
    static async cleanupLogs(olderThanDays = 7) {
        try {
            const result = await database.run(
                `DELETE FROM logs 
                 WHERE timestamp < datetime('now', '-' || ? || ' days')`,
                [olderThanDays]
            );
            
            console.log(`🧹 ${result.changes} logs supprimés (> ${olderThanDays} jours)`);
            return result.changes;
            
        } catch (error) {
            console.error('❌ Erreur nettoyage logs:', error);
            throw error;
        }
    }
}

export { Logger };