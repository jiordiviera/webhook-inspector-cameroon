// Vercel serverless function wrapper
import '../src/server.ts';

export default function handler(req, res) {
  // Le serveur Bun.serve() sera géré par Vercel
  return new Response('Webhook Inspector Cameroon is running!');
}