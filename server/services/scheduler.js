import cron from 'node-cron';
import { WebhookService } from './webhook.js';
import { Logger } from './logger.js';
import { database } from './database.js';

/**
 * Configurer les tâches planifiées
 */
function setupCronJobs() {
    console.log('⏰ Configuration des tâches planifiées...');
    
    // Nettoyage des anciens webhooks - tous les jours à 2h du matin
    cron.schedule('0 2 * * *', async () => {
        try {
            Logger.logInfo('🧹 Démarrage nettoyage automatique des webhooks');
            
            const deletedCount = await WebhookService.cleanup(30); // 30 jours
            
            Logger.logInfo(`🧹 Nettoyage terminé: ${deletedCount} webhooks supprimés`);
            
        } catch (error) {
            Logger.logError('cleanup_webhooks', error);
        }
    }, {
        timezone: 'Africa/Douala'
    });
    
    // Nettoyage des logs - toutes les semaines le dimanche à 3h
    cron.schedule('0 3 * * 0', async () => {
        try {
            Logger.logInfo('🧹 Démarrage nettoyage automatique des logs');
            
            const deletedCount = await Logger.cleanupLogs(7); // 7 jours
            
            Logger.logInfo(`🧹 Nettoyage logs terminé: ${deletedCount} logs supprimés`);
            
        } catch (error) {
            Logger.logError('cleanup_logs', error);
        }
    }, {
        timezone: 'Africa/Douala'
    });
    
    // Rapport quotidien des statistiques - tous les jours à 8h
    cron.schedule('0 8 * * *', async () => {
        try {
            const stats = await WebhookService.getStats();
            
            Logger.logInfo('📊 Rapport quotidien des webhooks', {
                total: stats.total_webhooks,
                today: stats.today_webhooks,
                valid_signatures: stats.valid_signatures,
                invalid_signatures: stats.invalid_signatures,
                top_events: stats.event_types.slice(0, 5)
            });
            
        } catch (error) {
            Logger.logError('daily_report', error);
        }
    }, {
        timezone: 'Africa/Douala'
    });
    
    // Optimisation de la base de données - toutes les semaines
    cron.schedule('0 4 * * 1', async () => {
        try {
            Logger.logInfo('🔧 Optimisation de la base de données');
            
            // Analyser et optimiser les tables
            await database.run('ANALYZE');
            await database.run('VACUUM');
            
            Logger.logInfo('✅ Optimisation terminée');
            
        } catch (error) {
            Logger.logError('database_optimization', error);
        }
    }, {
        timezone: 'Africa/Douala'
    });
    
    console.log('✅ Tâches planifiées configurées:');
    console.log('   - Nettoyage webhooks: tous les jours à 2h');
    console.log('   - Nettoyage logs: dimanche à 3h');
    console.log('   - Rapport quotidien: tous les jours à 8h');
    console.log('   - Optimisation DB: lundi à 4h');
}

export { setupCronJobs };