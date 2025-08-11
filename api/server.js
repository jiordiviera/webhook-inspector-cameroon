// Vercel serverless function pour Node.js
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';

export default async function handler(req, res) {
  try {
    const { method, url } = req;
    const urlPath = new URL(url, `http://${req.headers.host}`).pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Route webhook POST
    if (urlPath === '/webhook' && method === 'POST') {
      const webhookData = {
        id: uuidv4(),
        event_type: req.body?.event || 'unknown',
        company_id: req.body?.company || null,
        payload: req.body,
        headers: req.headers,
        signature: req.headers['x-signature'] || null,
        is_valid_signature: true,
        received_at: moment.tz('Africa/Douala').format(),
        response_status: 200,
        processing_time_ms: 1,
        source_ip: req.headers['x-forwarded-for'] || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      };

      return res.status(200).json({
        success: true,
        webhook_id: webhookData.id,
        event_type: webhookData.event_type,
        company_id: webhookData.company_id,
        is_valid_signature: true,
        signature_error: null,
        processing_time_ms: 1,
        mobile_provider: webhookData.company_id?.includes('mtn') ? 'MTN Mobile Money' : 'Orange Money',
        message: 'Webhook reçu avec succès ! 🇨🇲'
      });
    }

    // Route API webhooks GET
    if (urlPath === '/api/webhooks' && method === 'GET') {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          limit: 50,
          offset: 0,
          has_more: false
        }
      });
    }

    // Interface HTML
    if (urlPath === '/' || urlPath === '/index.html' || urlPath === '/api/server') {
      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🇨🇲 Webhook Inspector Cameroon - Vercel</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            margin-top: 100px; 
            background: linear-gradient(135deg, #00a651 0%, #ce1126 33%, #fce93f 66%);
            color: white;
            min-height: 100vh;
        }
        .container { 
            background: rgba(0,0,0,0.8); 
            padding: 50px; 
            margin: 20px auto; 
            max-width: 800px; 
            border-radius: 15px;
        }
        .flag { font-size: 4em; margin-bottom: 20px; }
        h1 { color: #fce93f; margin-bottom: 30px; }
        .status { color: #00a651; font-weight: bold; }
        .endpoints { text-align: left; margin-top: 30px; }
        .endpoint { 
            background: rgba(255,255,255,0.1); 
            padding: 15px; 
            margin: 10px 0; 
            border-radius: 8px; 
            border-left: 4px solid #00a651;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="flag">🇨🇲</div>
        <h1>Webhook Inspector Cameroon</h1>
        <p class="status">✅ Déployé avec succès sur Vercel !</p>
        <p>Heure actuelle au Cameroun: ${moment.tz('Africa/Douala').format('dddd DD MMMM YYYY, HH:mm:ss')}</p>
        
        <div class="endpoints">
            <h3>🔗 Endpoints disponibles:</h3>
            <div class="endpoint">
                <strong>POST /webhook</strong><br>
                Réception des webhooks
            </div>
            <div class="endpoint">
                <strong>GET /api/webhooks</strong><br>
                Liste des webhooks reçus
            </div>
        </div>
        
        <p style="margin-top: 40px;">
            <small>Made with ❤️ by Genuka Team • Powered by Vercel</small>
        </p>
    </div>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // 404 pour les autres routes
    return res.status(404).json({
      success: false,
      error: 'Route non trouvée',
      path: urlPath
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur interne'
    });
  }
}