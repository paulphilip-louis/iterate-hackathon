# Flow Complet en Production - Détection de Contradictions

Ce document explique le flow complet depuis la réception du transcript jusqu'à l'envoi de l'output au frontend.

## 🔄 Flow Complet

```
1. Frontend/STT → Envoie chunk de transcript
   ↓
2. server/transcriptProcessor.js → Reçoit le chunk
   ↓
3. server/transcriptProcessor.js → Appelle le module de détection
   ↓
4. modules/contradiction_detection/ → Traite avec LLM (toutes les 10s)
   ↓
5. server/transcriptProcessor.js → Reçoit output.contradictions
   ↓
6. server/transcriptProcessor.js → Envoie via WebSocket au frontend
   ↓
7. Frontend → Reçoit et affiche les contradictions
```

## 📁 Fichier Principal : `server/transcriptProcessor.js`

**C'est CE fichier qui orchestre tout** - Il n'existe pas encore, il faut le créer.

### Structure du Fichier

```javascript
// server/transcriptProcessor.js
import { 
  localContradictionScan, 
  extractProfileFacts, 
  computeContradictionOutput 
} from '../interview-analysis-system/modules/contradiction_detection';
import { getFacts, updateFacts, resetFacts, mergeFacts } from '../interview-analysis-system/modules/fact_store';
import { compareProfiles } from '../interview-analysis-system/modules/contradiction_detection';

// État global pour cette interview
let contradictionScore = 100;
let recentContext = []; // Derniers 12 chunks (2 minutes)
let chunkCounter = 0;

/**
 * ⚠️ FONCTION PRINCIPALE - Appelée à chaque chunk de transcript
 * 
 * @param {string} transcriptChunk - Le chunk de transcript du candidat
 * @param {WebSocketServer} wss - Serveur WebSocket pour envoyer au frontend
 * @returns {Promise<ContradictionOutput>} - Les résultats de détection
 */
export async function processTranscriptChunk(transcriptChunk, wss) {
  chunkCounter++;
  console.log(`\n📝 Processing chunk #${chunkCounter}`);
  
  // 1. LOCAL SCAN (toutes les ~10 secondes = chaque chunk)
  console.log('🔍 Running local contradiction scan...');
  const localContradictions = await localContradictionScan({
    latest_chunk: transcriptChunk,
    recent_context: recentContext.join(' '),
    previous_score: contradictionScore
  });
  
  // 2. PROFILE EXTRACTION (toutes les 60 secondes = toutes les 6 chunks)
  let profileContradictions = [];
  if (chunkCounter % 6 === 0 || chunkCounter === 1) {
    console.log('📊 Running profile extraction...');
    
    // Récupérer les 5 dernières minutes (30 chunks)
    const transcriptSummary = recentContext.slice(-30).join(' ');
    const previousFacts = getFacts();
    
    const { facts, contradictions } = await extractProfileFacts({
      transcript_summary: transcriptSummary,
      previous_facts: previousFacts || undefined
    });
    
    profileContradictions = contradictions || [];
    
    // Merge et stocker les faits
    if (facts) {
      const merged = mergeFacts(previousFacts, facts);
      updateFacts(merged.merged_facts);
      
      // Vérification programmatique de cohérence
      if (previousFacts) {
        const programmaticContradictions = compareProfiles(previousFacts, facts);
        profileContradictions = [...profileContradictions, ...programmaticContradictions];
      }
    }
  }
  
  // 3. COMBINER TOUTES LES CONTRADICTIONS
  const allContradictions = [...localContradictions, ...profileContradictions];
  
  // 4. CALCULER L'OUTPUT FINAL
  const output = computeContradictionOutput(contradictionScore, allContradictions);
  contradictionScore = output.contradiction_score;
  
  // 5. ⚠️ ENVOI AU FRONTEND - C'EST ICI QUE ÇA SE PASSE
  sendToFrontend(wss, output);
  
  // 6. Mettre à jour le contexte (garder les 12 derniers chunks)
  recentContext.push(transcriptChunk);
  if (recentContext.length > 12) {
    recentContext.shift();
  }
  
  return output;
}

/**
 * ⚠️ FONCTION D'ENVOI AU FRONTEND
 * 
 * @param {WebSocketServer} wss - Serveur WebSocket
 * @param {ContradictionOutput} output - Les résultats à envoyer
 */
function sendToFrontend(wss, output) {
  const message = {
    type: 'contradiction_update',
    payload: {
      contradiction_score: output.contradiction_score,
      trend: output.trend,
      label: output.label,
      contradictions: output.contradictions, // ⚠️ ARRAY DE TOUTES LES CONTRADICTIONS
      timestamp: Date.now()
    }
  };
  
  // Envoyer à tous les clients connectés
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      console.log(`📤 Sent contradiction update: ${output.contradictions.length} contradiction(s), score: ${output.contradiction_score}`);
    }
  });
}

/**
 * Réinitialiser l'état pour une nouvelle interview
 */
export function resetState() {
  contradictionScore = 100;
  recentContext = [];
  chunkCounter = 0;
  resetFacts();
  console.log('🔄 Contradiction detection state reset');
}
```

## 🔌 Intégration dans `server/index.js`

```javascript
// server/index.js
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { processTranscriptChunk, resetState } from './transcriptProcessor.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

wss.on('connection', (clientWs, req) => {
  console.log('✅ Client connected');
  
  // Réinitialiser pour une nouvelle interview
  resetState();
  
  clientWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // ⚠️ ICI : Quand on reçoit un chunk de transcript
      if (message.type === 'transcript_chunk') {
        const transcriptChunk = message.chunk;
        const speaker = message.speaker; // 'candidate' ou 'recruiter'
        
        // Ne traiter que les chunks du candidat
        if (speaker === 'candidate') {
          // ⚠️ C'EST ICI QUE TOUT SE PASSE
          await processTranscriptChunk(transcriptChunk, wss);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  clientWs.on('close', () => {
    console.log('🔌 Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

## 📊 Timeline Détaillée

### Chunk 1 (t=0s)
```
1. Frontend envoie: { type: 'transcript_chunk', chunk: "...", speaker: 'candidate' }
2. server/index.js reçoit le message
3. server/transcriptProcessor.js → processTranscriptChunk()
4. Local scan LLM call (OpenAI) → ~1-2s
5. Profile extraction LLM call (premier chunk) → ~1-2s
6. computeContradictionOutput() → instantané
7. sendToFrontend() → envoie via WebSocket
8. Frontend reçoit: { type: 'contradiction_update', payload: {...} }
```

### Chunk 2-5 (t=10s, 20s, 30s, 40s)
```
1. Frontend envoie chunk
2. Local scan seulement (pas de profile extraction)
3. Envoi au frontend
```

### Chunk 6 (t=50s)
```
1. Frontend envoie chunk
2. Local scan + Profile extraction (toutes les 6 chunks)
3. Envoi au frontend avec toutes les contradictions
```

## 🎯 Fichiers Clés

| Fichier | Rôle |
|---------|------|
| **`server/transcriptProcessor.js`** | ⚠️ **ORCHESTRE TOUT** - Reçoit chunks, appelle modules, envoie au frontend |
| `server/index.js` | Reçoit WebSocket messages, appelle `processTranscriptChunk()` |
| `modules/contradiction_detection/localScan.ts` | Appel LLM pour scan local (toutes les 10s) |
| `modules/contradiction_detection/profileExtraction.ts` | Appel LLM pour extraction profil (toutes les 60s) |
| `modules/contradiction_detection/scoring.ts` | Calcule `output.contradictions` |

## 📤 Format du Message Envoyé

```json
{
  "type": "contradiction_update",
  "payload": {
    "contradiction_score": 70,
    "trend": "-15",
    "label": "Some Inconsistencies",
    "contradictions": [
      {
        "msg": "Description de la contradiction",
        "severity": "major",
        "field": "years_experience"
      }
    ],
    "timestamp": 1704067200000
  }
}
```

## 🔍 Réception Frontend

```javascript
// Frontend - Écouter les mises à jour
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'contradiction_update') {
    const output = message.payload;
    
    // ⚠️ output.contradictions contient toutes les contradictions
    console.log('Contradictions:', output.contradictions);
    console.log('Score:', output.contradiction_score);
    
    // Mettre à jour l'UI
    updateContradictionUI(output);
  }
};
```

## ⚠️ Points Importants

1. **`server/transcriptProcessor.js` est le fichier principal** qui orchestre tout
2. **`processTranscriptChunk()` est appelée à chaque chunk** (toutes les ~10 secondes)
3. **`sendToFrontend()` envoie automatiquement** après chaque traitement
4. **Le LLM est appelé dans les modules**, pas dans `transcriptProcessor.js`
5. **L'output est envoyé via WebSocket** à tous les clients connectés

## 🚀 Résumé

**Fichier à créer :** `server/transcriptProcessor.js`
- Reçoit les chunks de transcript
- Appelle les modules de détection
- **Envoie l'output au frontend via `sendToFrontend()`**

**Fichier à modifier :** `server/index.js`
- Intègre `processTranscriptChunk()` dans le handler WebSocket

**Flow :**
```
Transcript → server/index.js → server/transcriptProcessor.js → Modules LLM → output.contradictions → sendToFrontend() → Frontend
```

