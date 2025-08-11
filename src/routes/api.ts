import { WebhookModel, WebhookFilter } from "../models/webhook.ts";
import { CameroonTimeUtils } from "../utils/cameroon.ts";

export const apiRoutes = {
  
  async handleAPI(req: Request, url: URL): Promise<Response> {
    const path = url.pathname;
    const method = req.method;
    
    // Headers CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    try {
      // GET /api/webhooks - Liste des webhooks avec filtres
      if (path === '/api/webhooks' && method === 'GET') {
        const params = url.searchParams;
        
        const filter: WebhookFilter = {
          event_type: params.get('event_type') || undefined,
          company_id: params.get('company_id') || undefined,
          date_from: params.get('date_from') || undefined,
          date_to: params.get('date_to') || undefined,
          is_valid_signature: params.get('is_valid_signature') === 'true' ? true : 
                            params.get('is_valid_signature') === 'false' ? false : undefined,
          limit: parseInt(params.get('limit') || '50'),
          offset: parseInt(params.get('offset') || '0'),
          search: params.get('search') || undefined
        };
        
        const webhooks = WebhookModel.findAll(filter);
        const total = WebhookModel.count(filter);
        
        // Ajouter les temps humanisés
        const enhancedWebhooks = webhooks.map(webhook => ({
          ...webhook,
          received_at_human: CameroonTimeUtils.humanize(webhook.received_at)
        }));
        
        return new Response(JSON.stringify({
          success: true,
          data: enhancedWebhooks,
          pagination: {
            total,
            limit: filter.limit,
            offset: filter.offset,
            has_more: (filter.offset + filter.limit) < total
          }
        }), { headers: corsHeaders });
      }
      
      // GET /api/webhooks/:id - Détail d'un webhook
      if (path.startsWith('/api/webhooks/') && method === 'GET') {
        const id = path.split('/')[3];
        const webhook = WebhookModel.findById(id);
        
        if (!webhook) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Webhook non trouvé'
          }), { status: 404, headers: corsHeaders });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            ...webhook,
            received_at_human: CameroonTimeUtils.humanize(webhook.received_at)
          }
        }), { headers: corsHeaders });
      }
      
      // GET /api/stats - Statistiques générales
      if (path === '/api/stats' && method === 'GET') {
        const stats = WebhookModel.getStats();
        const hourlyStats = WebhookModel.getHourlyStats();
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            ...stats,
            hourly: hourlyStats,
            last_updated: CameroonTimeUtils.now().format()
          }
        }), { headers: corsHeaders });
      }
      
      // GET /api/events - Liste des types d'événements
      if (path === '/api/events' && method === 'GET') {
        // Récupérer les types d'événements uniques
        const events = WebhookModel.findAll({ limit: 1000 })
          .map(w => w.event_type)
          .filter((value, index, self) => self.indexOf(value) === index)
          .sort();
        
        return new Response(JSON.stringify({
          success: true,
          data: events
        }), { headers: corsHeaders });
      }
      
      // GET /api/companies - Liste des entreprises
      if (path === '/api/companies' && method === 'GET') {
        const companies = WebhookModel.findAll({ limit: 1000 })
          .map(w => w.company_id)
          .filter(id => id !== null && id !== undefined)
          .filter((value, index, self) => self.indexOf(value) === index)
          .sort();
        
        return new Response(JSON.stringify({
          success: true,
          data: companies
        }), { headers: corsHeaders });
      }
      
      // POST /api/webhooks/replay/:id - Rejouer un webhook
      if (path.startsWith('/api/webhooks/') && path.endsWith('/replay') && method === 'POST') {
        const id = path.split('/')[3];
        const webhook = WebhookModel.findById(id);
        
        if (!webhook) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Webhook non trouvé'
          }), { status: 404, headers: corsHeaders });
        }
        
        const body = await req.json();
        const targetUrl = body.target_url;
        
        if (!targetUrl) {
          return new Response(JSON.stringify({
            success: false,
            error: 'URL cible requise'
          }), { status: 400, headers: corsHeaders });
        }
        
        // Envoyer le webhook vers l'URL cible
        try {
          const replayResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Replayed-From': 'webhook-inspector-cameroon',
              'X-Original-Webhook-Id': webhook.id,
              'X-Original-Received-At': webhook.received_at,
              ...webhook.headers
            },
            body: JSON.stringify(webhook.payload)
          });
          
          return new Response(JSON.stringify({
            success: true,
            replay_status: replayResponse.status,
            replay_statusText: replayResponse.statusText,
            message: `Webhook rejoué vers ${targetUrl}`
          }), { headers: corsHeaders });
          
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: `Erreur lors du replay: ${error.message}`
          }), { status: 500, headers: corsHeaders });
        }
      }
      
      // DELETE /api/webhooks - Nettoyer les anciens webhooks
      if (path === '/api/webhooks/clean' && method === 'DELETE') {
        const params = url.searchParams;
        const keepCount = parseInt(params.get('keep') || '1000');
        
        const deletedCount = WebhookModel.cleanOld(keepCount);
        
        return new Response(JSON.stringify({
          success: true,
          deleted_count: deletedCount,
          message: `${deletedCount} anciens webhooks supprimés`
        }), { headers: corsHeaders });
      }
      
      // POST /api/test - Créer un webhook de test
      if (path === '/api/test' && method === 'POST') {
        const body = await req.json();
        
        const testWebhook = {
          event_type: body.event_type || 'test',
          company_id: body.company_id || 'test-company',
          payload: JSON.stringify(body.payload || { test: true, message: "Webhook de test depuis Cameroun" }),
          headers: JSON.stringify(body.headers || { 'Content-Type': 'application/json' }),
          signature: body.signature || null,
          is_valid_signature: true,
          received_at: CameroonTimeUtils.now().format(),
          response_status: 200,
          processing_time_ms: 5,
          source_ip: '127.0.0.1',
          user_agent: 'Webhook-Inspector-Test'
        };
        
        const webhookId = WebhookModel.create(testWebhook);
        
        return new Response(JSON.stringify({
          success: true,
          webhook_id: webhookId,
          message: 'Webhook de test créé avec succès'
        }), { headers: corsHeaders });
      }
      
      // Export CSV/JSON
      if (path === '/api/export' && method === 'GET') {
        const format = url.searchParams.get('format') || 'json';
        const params = url.searchParams;
        
        const filter: WebhookFilter = {
          event_type: params.get('event_type') || undefined,
          company_id: params.get('company_id') || undefined,
          date_from: params.get('date_from') || undefined,
          date_to: params.get('date_to') || undefined,
          limit: parseInt(params.get('limit') || '1000')
        };
        
        const webhooks = WebhookModel.findAll(filter);
        
        if (format === 'csv') {
          const csvHeaders = 'ID,Type Événement,Société,Date Réception,Signature Valide,IP Source,User Agent\n';
          const csvRows = webhooks.map(w => 
            `"${w.id}","${w.event_type}","${w.company_id || ''}","${w.received_at}","${w.is_valid_signature}","${w.source_ip}","${w.user_agent}"`
          ).join('\n');
          
          return new Response(csvHeaders + csvRows, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="webhooks-export-${CameroonTimeUtils.now().format('YYYY-MM-DD')}.csv"`
            }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: webhooks,
          exported_at: CameroonTimeUtils.now().format(),
          count: webhooks.length
        }), {
          headers: {
            ...corsHeaders,
            'Content-Disposition': `attachment; filename="webhooks-export-${CameroonTimeUtils.now().format('YYYY-MM-DD')}.json"`
          }
        });
      }
      
      // Route non trouvée
      return new Response(JSON.stringify({
        success: false,
        error: `Route ${path} non trouvée`
      }), { status: 404, headers: corsHeaders });
      
    } catch (error) {
      console.error('❌ Erreur API:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};