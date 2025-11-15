# Point de Déclenchement - Envoi des Contradictions au Frontend

Ce document explique **où et comment** déclencher l'envoi des résultats de détection de contradictions au frontend.

## 📍 Où est Calculé `output.contradictions` ?

### Actuellement (dans les tests)

Le calcul est fait dans les fichiers de test :
- `interview-analysis-system/tests/contradiction_detection/testCustomTranscript.ts` (ligne 215)
- `interview-analysis-system/tests/contradiction_detection/contradictionTestRunner.ts` (ligne 212)

```typescript
// Dans la boucle qui traite chaque chunk
const output = computeContradictionOutput(contradictionScore, allContradictions);
// ⚠️ ICI : output.contradictions est disponible
```

## 🚀 Où Déclencher l'Envoi au Frontend ?

### Option 1 : Dans le Serveur Backend (Recommandé)

Créez un nouveau fichier ou modifiez `server/index.js` pour intégrer le module de détection :

```javascript
// server/contradictionHandler.js
import { localContradictionScan, extractProfileFacts, computeContradictionOutput } from '../interview-analysis-system/modules/contradiction_detection';
import { getFacts, updateFacts, resetFacts, mergeFacts } from '../interview-analysis-system/modules/fact_store';
import { compareProfiles } from '../interview-analysis-system/modules/contradiction_detection';

let contradictionScore = 100;
let recentContext = [];
let chunkCounter = 0;

export async function processTranscriptChunk(chunk, wss) {
  chunkCounter++;
  
  // 1. LOCAL SCAN (chaque chunk)
  const localContradictions = await localContradictionScan({
    latest_chunk: chunk,
    recent_context: recentContext.join(' '),
    previous_score: contradictionScore
  });
  
  // 2. PROFILE EXTRACTION (toutes les 6 chunks)
  let profileContradictions = [];
  if (chunkCounter % 6 === 0) {
    const { facts, contradictions } = await extractProfileFacts({
      transcript_summary: recentContext.slice(-30).join(' ')
    });
    profileContradictions = contradictions || [];
    
    // Merge facts
    const previousFacts = getFacts();
    if (facts) {
      const merged = mergeFacts(previousFacts, facts);
      updateFacts(merged.merged_facts);
    }
  }
  
  // 3. COMBINE ET CALCULE
  const allContradictions = [...localContradictions, ...profileContradictions];
  const output = computeContradictionOutput(contradictionScore, allContradictions);
  contradictionScore = output.contradiction_score;
  
  // 4. ⚠️ ENVOI AU FRONTEND ICI
  broadcastToClients(wss, {
    type: 'contradiction_update',
    payload: {
      ...output,
      timestamp: Date.now()
    }
  });
  
  // Mettre à jour le contexte
  recentContext.push(chunk);
  if (recentContext.length > 12) {
    recentContext.shift();
  }
  
  return output;
}

function broadcastToClients(wss, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
```

### Option 2 : Modifier `server/index.js` Directement

```javascript
// server/index.js
import { processTranscriptChunk } from './contradictionHandler.js';

// Dans le handler WebSocket
clientWs.on('message', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'transcript_chunk') {
      // Traiter le chunk de transcript
      const output = await processTranscriptChunk(message.chunk, wss);
      
      // ⚠️ ENVOI AUTOMATIQUE ICI
      // output.contradictions est déjà envoyé dans processTranscriptChunk
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});
```

## 📋 Structure Recommandée

### Fichier : `server/contradictionHandler.js`

```javascript
import { 
  localContradictionScan, 
  extractProfileFacts, 
  computeContradictionOutput 
} from '../interview-analysis-system/modules/contradiction_detection';
import { getFacts, updateFacts, resetFacts, mergeFacts } from '../interview-analysis-system/modules/fact_store';
import { compareProfiles } from '../interview-analysis-system/modules/contradiction_detection';

// État global
let contradictionScore = 100;
let recentContext = [];
let chunkCounter = 0;

/**
 * Traite un chunk de transcript et envoie les résultats au frontend
 * 
 * @param {string} chunk - Le chunk de transcript à analyser
 * @param {WebSocketServer} wss - Le serveur WebSocket pour broadcast
 * @returns {Promise<ContradictionOutput>} - Les résultats de détection
 */
export async function processTranscriptChunk(chunk, wss) {
  chunkCounter++;
  
  // 1. LOCAL SCAN (chaque chunk)
  const localContradictions = await localContradictionScan({
    latest_chunk: chunk,
    recent_context: recentContext.join(' '),
    previous_score: contradictionScore
  });
  
  // 2. PROFILE EXTRACTION (toutes les 6 chunks)
  let profileContradictions = [];
  if (chunkCounter % 6 === 0 || chunkCounter === 1) {
    const transcriptSummary = recentContext.slice(-30).join(' ');
    const previousFacts = getFacts();
    
    const { facts, contradictions } = await extractProfileFacts({
      transcript_summary: transcriptSummary,
      previous_facts: previousFacts || undefined
    });
    
    profileContradictions = contradictions || [];
    
    // Merge facts
    if (facts) {
      const merged = mergeFacts(previousFacts, facts);
      updateFacts(merged.merged_facts);
      
      // Programmatic consistency check
      if (previousFacts) {
        const programmaticContradictions = compareProfiles(previousFacts, facts);
        profileContradictions = [...profileContradictions, ...programmaticContradictions];
      }
    }
  }
  
  // 3. COMBINE TOUTES LES CONTRADICTIONS
  const allContradictions = [...localContradictions, ...profileContradictions];
  
  // 4. CALCULE L'OUTPUT FINAL
  const output = computeContradictionOutput(contradictionScore, allContradictions);
  contradictionScore = output.contradiction_score;
  
  // 5. ⚠️ ENVOI AU FRONTEND - C'EST ICI QUE ÇA SE PASSE
  broadcastContradictionUpdate(wss, output);
  
  // 6. Mettre à jour le contexte
  recentContext.push(chunk);
  if (recentContext.length > 12) {
    recentContext.shift();
  }
  
  return output;
}

/**
 * Envoie les résultats de contradiction à tous les clients connectés
 * 
 * @param {WebSocketServer} wss - Le serveur WebSocket
 * @param {ContradictionOutput} output - Les résultats à envoyer
 */
function broadcastContradictionUpdate(wss, output) {
  const message = {
    type: 'contradiction_update',
    payload: {
      ...output,
      timestamp: Date.now()
    }
  };
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
  
  console.log(`📤 Contradiction update sent: ${output.contradictions.length} contradiction(s), score: ${output.contradiction_score}`);
}

/**
 * Réinitialise l'état (pour une nouvelle interview)
 */
export function resetContradictionState() {
  contradictionScore = 100;
  recentContext = [];
  chunkCounter = 0;
  resetFacts();
}
```

### Intégration dans `server/index.js`

```javascript
// server/index.js
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { processTranscriptChunk, resetContradictionState } from './contradictionHandler.js';

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
  path: '/ws/audio'
});

wss.on('connection', (clientWs, req) => {
  console.log('✅ Client connected');
  
  // Réinitialiser l'état pour une nouvelle interview
  resetContradictionState();
  
  clientWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'transcript_chunk') {
        // ⚠️ ICI : Traiter le chunk et envoyer automatiquement au frontend
        await processTranscriptChunk(message.chunk, wss);
      } else if (message.type === 'audio') {
        // Traiter l'audio (STT, diarization, etc.)
        // Puis extraire le chunk de transcript et appeler processTranscriptChunk
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

## 🔄 Flux Complet

```
1. Frontend envoie transcript_chunk via WebSocket
   ↓
2. server/index.js reçoit le message
   ↓
3. processTranscriptChunk() est appelé
   ↓
4. Local scan + Profile extraction (si nécessaire)
   ↓
5. computeContradictionOutput() calcule output.contradictions
   ↓
6. broadcastContradictionUpdate() envoie à TOUS les clients
   ↓
7. Frontend reçoit { type: 'contradiction_update', payload: {...} }
```

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

## ⚠️ Points Importants

1. **`output.contradictions` est calculé dans `processTranscriptChunk()`**
2. **L'envoi se fait automatiquement via `broadcastContradictionUpdate()`**
3. **Le message est envoyé à TOUS les clients connectés** (broadcast)
4. **Le timestamp est ajouté automatiquement** pour tracker quand la mise à jour a été générée

## 🎯 Résumé

**Fichier à créer/modifier :**
- `server/contradictionHandler.js` - Contient la logique de traitement et d'envoi
- `server/index.js` - Intègre `processTranscriptChunk()` dans le handler WebSocket

**Point de déclenchement :**
- Ligne où `computeContradictionOutput()` est appelé
- Immédiatement après, `broadcastContradictionUpdate()` envoie au frontend

