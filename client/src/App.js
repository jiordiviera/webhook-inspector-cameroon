import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import WebhookDetails from './pages/WebhookDetails';
import TestWebhook from './pages/TestWebhook';
import Stats from './pages/Stats';

// Context
import { WebSocketProvider } from './context/WebSocketContext';
import { WebhookProvider } from './context/WebhookContext';

function App() {
  return (
    <Router>
      <WebSocketProvider>
        <WebhookProvider>
          <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="pb-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/webhook/:id" element={<WebhookDetails />} />
                <Route path="/test" element={<TestWebhook />} />
                <Route path="/stats" element={<Stats />} />
              </Routes>
            </main>
            
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </WebhookProvider>
      </WebSocketProvider>
    </Router>
  );
}

export default App;