import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

// ElevenLabs token endpoint
app.get("/scribe-token", async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is not set");
      return res.status(500).json({ error: "Server configuration error: API key not set" });
    }

    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      return res.status(response.status).json({ 
        error: `Failed to get token from ElevenLabs: ${response.statusText}` 
      });
    }

    const data = await response.json();
    
    if (!data.token) {
      console.error("No token in response:", data);
      return res.status(500).json({ error: "No token received from ElevenLabs" });
    }

    res.json({ token: data.token });
  } catch (error) {
    console.error("Error in /scribe-token:", error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

// Create HTTP server
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`\n🚀 Audio Receiver Server`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws/audio`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Token endpoint: http://localhost:${PORT}/scribe-token\n`);
});
