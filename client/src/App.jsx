import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'

function App() {
  const [webhooks, setWebhooks] = useState([])
  const [stats, setStats] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  // Charger les données initiales
  useEffect(() => {
    loadInitialData()
    connectWebSocket()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Charger les stats
      const statsRes = await axios.get('/api/stats')
      setStats(statsRes.data.stats)
      
      // Charger les webhooks
      const webhooksRes = await axios.get('/api/webhooks?limit=10')
      setWebhooks(webhooksRes.data.webhooks)
      
      setLoading(false)
      
    } catch (error) {
      console.error('Erreur chargement:', error)
      toast.error('Erreur de chargement des données')
      setLoading(false)
    }
  }

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:3002/ws')
    
    ws.onopen = () => {
      setIsConnected(true)
      toast.success('Connexion temps réel établie! 📡')
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'webhook_received') {
        setWebhooks(prev => [data.webhook, ...prev.slice(0, 9)])
        toast.success(`Nouveau webhook: ${data.webhook.event_type}`)
      }
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      toast.error('Connexion temps réel fermée')
    }
  }

  const sendTestWebhook = async () => {
    try {
      const testData = {
        event_type: 'test.from.react',
        company_id: 'react-test',
        data: {
          message: 'Test depuis l\'interface React V2!',
          timestamp: new Date().toISOString(),
          user: 'Développeur Cameroun 🇨🇲'
        }
      }

      await axios.post('/api/webhooks/test', {
        ...testData,
        generate_signature: false
      })
      
      toast.success('Webhook de test envoyé!')
      
    } catch (error) {
      console.error('Erreur test webhook:', error)
      toast.error('Erreur lors du test')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'inspector...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📡</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Webhook Inspector V2</h1>
                  <p className="text-sm text-gray-500">Bun + Express + React + Tailwind v4</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>{isConnected ? 'Connecté' : 'Déconnecté'}</span>
              </div>
              
              <button
                onClick={sendTestWebhook}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Test Webhook
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.webhooks?.total_webhooks || 0}
                  </div>
                  <div className="text-sm text-gray-500">Total Webhooks</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.webhooks?.valid_signatures || 0}
                  </div>
                  <div className="text-sm text-gray-500">Signatures Valides</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">❌</span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.webhooks?.invalid_signatures || 0}
                  </div>
                  <div className="text-sm text-gray-500">Signatures Invalides</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🔗</span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.websocket?.total_connections || 0}
                  </div>
                  <div className="text-sm text-gray-500">Connexions WebSocket</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Webhooks List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>📡</span>
              <span>Derniers Webhooks</span>
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {webhooks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun webhook pour le moment
                </h3>
                <p className="text-gray-500 mb-6">
                  Les webhooks apparaîtront ici en temps réel
                </p>
                <button
                  onClick={sendTestWebhook}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Créer un webhook de test
                </button>
              </div>
            ) : (
              webhooks.map((webhook, index) => (
                <div key={webhook.id || index} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        webhook.is_valid_signature ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      
                      <div>
                        <div className="font-medium text-gray-900">
                          {webhook.event_type}
                        </div>
                        <div className="text-sm text-gray-500">
                          {webhook.company_id} • {webhook.source_ip}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <span className={`webhook-badge ${
                          webhook.is_valid_signature ? 'webhook-badge-success' : 'webhook-badge-error'
                        }`}>
                          {webhook.is_valid_signature ? '✅ Valide' : '❌ Invalide'}
                        </span>
                        
                        {webhook.processing_time_ms && (
                          <span className="webhook-badge webhook-badge-blue">
                            {webhook.processing_time_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {webhook.received_at ? new Date(webhook.received_at).toLocaleString('fr-FR', {
                        timeZone: 'Africa/Douala'
                      }) : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              Genuka Webhook Inspector V2.0
            </div>
            <div className="text-sm text-gray-500">
              Bun + Express + React + Tailwind v4 • Made with ❤️ au Cameroun 🇨🇲
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App