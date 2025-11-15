import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import rateLimit from 'express-rate-limit';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const app = express();
const PORT = process.env.PORT || 3001;

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const activeRequests = new Map();
const pollingRequests = new Map();

function pcmToWav(pcmBuffer, sampleRate = 16000, channels = 1, bitsPerSample = 16) {
  const dataLength = pcmBuffer.length;
  const headerLength = 44;
  const fileSize = headerLength + dataLength - 8;
  
  const buffer = Buffer.alloc(headerLength + dataLength);
  
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  buffer.writeUInt16LE(channels * bitsPerSample / 8, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  pcmBuffer.copy(buffer, headerLength);
  
  return buffer;
}

function pollTranscriptionResult(requestId, ws, sessionId) {
  const pollingData = { ws, sessionId, pollInterval: null };
  
  pollingRequests.set(requestId, pollingData);
  
  pollingData.pollInterval = setInterval(async () => {
    try {
      if (!pollingRequests.has(requestId)) {
        clearInterval(pollingData.pollInterval);
        return;
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/speech-to-text/${requestId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Request not found');
        }
        throw new Error(`API returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'completed' && result.transcription) {
        console.log(`✅ Transcription ${requestId} completed (polling)`);
        
        const requestData = pollingRequests.get(requestId);
        if (requestData && requestData.ws && requestData.ws.readyState === 1) {
          requestData.ws.send(JSON.stringify({
            type: 'transcription_completed',
            requestId: requestId,
            transcription: {
              text: result.transcription.text,
              language_code: result.transcription.language_code,
              language_probability: result.transcription.language_probability,
              words: result.transcription.words,
            },
          }));
        }
        
        clearInterval(pollingData.pollInterval);
        pollingRequests.delete(requestId);
      } else if (result.status === 'failed') {
        console.error(`❌ Transcription ${requestId} failed`);
        clearInterval(pollingData.pollInterval);
        pollingRequests.delete(requestId);
      }
    } catch (error) {
      console.error(`❌ Error polling transcription ${requestId}:`, error);
      if (error.message === 'Request not found' || (error.statusCode === 404)) {
        clearInterval(pollingData.pollInterval);
        pollingRequests.delete(requestId);
      }
    }
  }, 2000);
}

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many webhook requests from this IP',
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Audio receiver server is running' });
});

app.post('/webhook/speech-to-text', webhookLimiter, async (req, res) => {
  try {
    console.log('📨 Webhook received:', req.body);
    
    const signature = req.headers['elevenlabs-signature'];
    const payload = JSON.stringify(req.body);
    
    if (process.env.WEBHOOK_SECRET) {
      try {
        await elevenlabs.webhooks.constructEvent(payload, signature, process.env.WEBHOOK_SECRET);
      } catch (error) {
        console.error('❌ Invalid webhook signature:', error);
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    const event = req.body;
    
    if (event.type === 'speech_to_text_transcription') {
      const { request_id, transcription } = event.data;
      
      console.log(`✅ Transcription ${request_id} completed`);
      console.log(`   Language: ${transcription.language_code}`);
      console.log(`   Text: ${transcription.text}`);
      
      const requestData = activeRequests.get(request_id);
      
      if (requestData && requestData.ws) {
        requestData.ws.send(JSON.stringify({
          type: 'transcription_completed',
          requestId: request_id,
          transcription: {
            text: transcription.text,
            language_code: transcription.language_code,
            language_probability: transcription.language_probability,
            words: transcription.words,
          },
        }));
        
        activeRequests.delete(request_id);
      } else {
        console.warn(`⚠️ No active WebSocket connection found for request ${request_id}`);
      }
      
      res.status(200).json({ received: true });
    } else {
      console.log('ℹ️ Unknown webhook event type:', event.type);
      res.status(200).json({ received: true });
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const server = createServer(app);

const wss = new WebSocketServer({ server });

app.post('/speech-to-text/upload', async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: "Server configuration error: API key not set" });
    }

    const { audioData, sessionId, requestId } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: "Audio data is required" });
    }

    const pcmBuffer = Buffer.from(audioData, 'base64');
    
    const wavBuffer = pcmToWav(pcmBuffer, 16000, 1, 16);

    const useWebhook = process.env.USE_WEBHOOK === 'true';
    const webhookUrl = process.env.WEBHOOK_URL || `http://localhost:${PORT}/webhook/speech-to-text`;
    
    console.log(`📤 Sending audio to ElevenLabs STT API (webhook: ${useWebhook ? webhookUrl : 'disabled'}), WAV buffer size: ${wavBuffer.length} bytes`);
    
    const requestOptions = {
      file: wavBuffer,
      modelId: 'scribe_v2',
      languageCode: 'en',
    };

    if (useWebhook) {
      requestOptions.webhook = true;
      requestOptions.webhookUrl = webhookUrl;
    }

    let result;
    try {
      result = await elevenlabs.speechToText.convert(requestOptions);
    } catch (error) {
      if (useWebhook && error.statusCode === 400 && error.body?.detail?.status === 'no_webhooks_configured') {
        console.warn('⚠️ Webhooks not configured in ElevenLabs dashboard, using synchronous mode');
        result = await elevenlabs.speechToText.convert({
          file: wavBuffer,
          modelId: 'scribe_v2',
          languageCode: 'en',
        });
      } else {
        throw error;
      }
    }

    let ws = null;
    if (sessionId && wss) {
      wss.clients.forEach((client) => {
        if (client.sessionId === sessionId && client.readyState === 1) {
          ws = client;
        }
      });
    }

    let actualRequestId = requestId || `req_${Date.now()}`;
    let responseMessage = 'Transcription processed';

    if (result.text && (result.transcriptionId || result.languageCode !== undefined)) {
      actualRequestId = result.transcriptionId || `sync_${Date.now()}`;
      responseMessage = 'Transcription completed (synchronous mode)';
      console.log(result);
      
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'transcription_completed',
          requestId: actualRequestId,
          transcription: {
            text: result.text,
            language_code: result.languageCode,
            language_probability: result.languageProbability,
            words: result.words,
          },
        }));
      }
    } else if (result.requestId) {
      actualRequestId = result.requestId;
      responseMessage = useWebhook ? 'Transcription started (webhook mode)' : 'Transcription started (polling mode)';
      console.log(`✅ Transcription started: ${actualRequestId}`);

      if (useWebhook && ws) {
        activeRequests.set(actualRequestId, {
          ws,
          sessionId: sessionId || 'default',
          chunks: [],
        });
      } else if (ws) {
        pollTranscriptionResult(actualRequestId, ws, sessionId || 'default');
      }
    } else {
      console.warn('⚠️ Unexpected response format from ElevenLabs API:', result);
    }

    res.json({ 
      requestId: actualRequestId,
      message: responseMessage,
    });
  } catch (error) {
    console.error('❌ Error in /speech-to-text/upload:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

wss.on('connection', (ws, req) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔌 WebSocket connected: ${sessionId}`);
  
  ws.sessionId = sessionId;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'register_session') {
        console.log(`📝 Session registered: ${sessionId}`);
        ws.send(JSON.stringify({
          type: 'session_registered',
          sessionId: sessionId,
        }));
      }
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: ${sessionId}`);
    for (const [requestId, data] of activeRequests.entries()) {
      if (data.sessionId === sessionId) {
        activeRequests.delete(requestId);
      }
    }
    for (const [requestId, data] of pollingRequests.entries()) {
      if (data.sessionId === sessionId) {
        if (data.pollInterval) {
          clearInterval(data.pollInterval);
        }
        pollingRequests.delete(requestId);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${sessionId}:`, error);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Audio Receiver Server`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Upload endpoint: http://localhost:${PORT}/speech-to-text/upload`);
  console.log(`   Webhook endpoint: http://localhost:${PORT}/webhook/speech-to-text\n`);
  console.log(`⚠️  Make sure to set WEBHOOK_URL in .env if your server is not accessible at http://localhost:${PORT}`);
});
