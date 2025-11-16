/**
 * Interview Analysis Service - WebSocket Server
 * 
 * Point d'entrée principal du service d'analyse d'entretien
 * Écoute les chunks de transcript via WebSocket et retourne les analyses
 */

import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { processTranscriptChunk, resetState } from './transcriptProcessor.js';
import { markSubsectionCompleted, getScriptState } from './modules/script_tracking/index.js';

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Créer serveur HTTP pour WebSocket
const server = createServer();
const wss = new WebSocketServer({ server });

console.log('🚀 Starting Interview Analysis Service...');
console.log(`   WebSocket: ws://${HOST}:${PORT}`);

// Gérer les connexions WebSocket
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`\n✅ New WebSocket connection from ${clientIp}`);
  
  // Réinitialiser l'état pour chaque nouvelle interview
  resetState();
  
  // Envoyer un message de bienvenue
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    message: 'Interview Analysis Service ready'
  }));
  
  // Gérer les messages entrants
  ws.on('message', async (data) => {
    try {
      const rawMessage = data.toString();
      console.log(`\n📨 Received WebSocket message (${rawMessage.length} bytes):`, rawMessage.substring(0, 200));
      
      const message = JSON.parse(rawMessage);
      console.log(`📦 Parsed message type: ${message.type}`);
      
      // Vérifier le type de message
      if (message.type === 'transcript_chunk') {
        const { chunk, speaker } = message.payload;
        
        if (!chunk || typeof chunk !== 'string') {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid chunk: must be a non-empty string'
          }));
          return;
        }
        
        console.log(`\n📝 Processing chunk from ${speaker || 'unknown'}: "${chunk.substring(0, 50)}..."`);
        
        // Traiter le chunk
        const result = await processTranscriptChunk(chunk, speaker || 'candidate', wss);
        
        // Envoyer le résultat au client
        ws.send(JSON.stringify({
          type: 'analysis_result',
          payload: result,
          timestamp: Date.now()
        }));
        
      } else if (message.type === 'reset') {
        // Réinitialiser l'état
        resetState();
        ws.send(JSON.stringify({
          type: 'reset',
          status: 'ok',
          message: 'State reset for new interview'
        }));
        
      } else if (message.type === 'mark_subsection_completed') {
        // Marquer manuellement une subsection comme complétée
        const { subsectionId } = message.payload;
        
        if (!subsectionId || typeof subsectionId !== 'string') {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid subsectionId: must be a non-empty string (e.g., "1.1")'
          }));
          return;
        }
        
        console.log(`✅ Manually marking subsection ${subsectionId} as completed`);
        markSubsectionCompleted(subsectionId);
        
        // Envoyer l'état mis à jour
        const scriptState = getScriptState();
        ws.send(JSON.stringify({
          type: 'script_state_update',
          payload: {
            scriptState
          },
          timestamp: Date.now()
        }));
        
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`
        }));
      }
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Internal server error'
      }));
    }
  });
  
  // Gérer la déconnexion
  ws.on('close', () => {
    console.log(`\n👋 Client disconnected: ${clientIp}`);
  });
  
  // Gérer les erreurs
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${clientIp}:`, error);
  });
});

// Démarrer le serveur
server.listen(PORT, HOST, () => {
  console.log(`\n✨ Interview Analysis Service running on ws://${HOST}:${PORT}\n`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, closing server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, closing server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
  });
});

