import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*', // remove on prod
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Audio receiver server is running' });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server for receiving audio
const wss = new WebSocketServer({ 
  server,
  path: '/ws/audio'
});

// Track statistics
let connectionCount = 0;
let messageCount = 0;
let audioChunkCount = 0;

wss.on('connection', (clientWs, req) => {
  connectionCount++;
  const clientId = connectionCount;
  console.log(`\n✅ Client #${clientId} connected from ${req.socket.remoteAddress}`);
  
  let clientMessageCount = 0;
  let clientAudioChunks = 0;
  const startTime = Date.now();

  // Handle incoming messages
  clientWs.on('message', (data) => {
    messageCount++;
    clientMessageCount++;
    
    try {
      // Try to parse as JSON
      if (data instanceof Buffer || typeof data === 'string') {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'audio') {
          audioChunkCount++;
          clientAudioChunks++;
          
          // Log audio chunk received
          const audioSize = message.audio ? message.audio.length : 0;
          console.log(`📦 [Client #${clientId}] Audio chunk #${clientAudioChunks} received (${audioSize} bytes base64)`);
          
          // Send acknowledgment back to client
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'ack',
              message: 'Audio chunk received successfully',
              chunkNumber: clientAudioChunks
            }));
          }
        } else if (message.type === 'config') {
          console.log(`⚙️  [Client #${clientId}] Configuration received:`, message.config);
        } else {
          console.log(`📨 [Client #${clientId}] Message received:`, message.type || 'unknown');
        }
      } else {
        console.log(`📦 [Client #${clientId}] Binary data received (${data.length} bytes)`);
      }
    } catch (error) {
      // If not JSON, treat as binary audio data
      audioChunkCount++;
      clientAudioChunks++;
      console.log(`📦 [Client #${clientId}] Binary audio chunk #${clientAudioChunks} received (${data.length} bytes)`);
      
      // Send acknowledgment
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'ack',
          message: 'Binary audio chunk received successfully',
          chunkNumber: clientAudioChunks
        }));
      }
    }
  });

  // Handle errors
  clientWs.on('error', (error) => {
    console.error(`❌ [Client #${clientId}] WebSocket error:`, error.message);
  });

  // Handle close
  clientWs.on('close', (code, reason) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🔌 [Client #${clientId}] Disconnected`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Total messages: ${clientMessageCount}`);
    console.log(`   Audio chunks: ${clientAudioChunks}`);
    console.log(`   Close code: ${code}, reason: ${reason.toString()}\n`);
  });

  // Send welcome message
  clientWs.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to audio receiver server',
    clientId: clientId
  }));
});

server.listen(PORT, () => {
  console.log(`\n🚀 Audio Receiver Server`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws/audio`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
