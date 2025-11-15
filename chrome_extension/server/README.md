# Server - Contradiction Detection Integration

## 📁 Fichiers Créés

- **`transcriptProcessor.js`** : Orchestre la détection de contradictions et envoie les résultats au frontend
- **`index.js`** : Modifié pour intégrer le traitement des chunks de transcript

## 🚀 Utilisation

### Format du Message à Envoyer

Le frontend doit envoyer des messages WebSocket avec ce format :

```json
{
  "type": "transcript_chunk",
  "chunk": "Le texte du chunk de transcript",
  "speaker": "candidate"
}
```

### Format du Message Reçu

Le serveur envoie automatiquement les résultats via WebSocket :

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

## ⚠️ Note Importante - TypeScript vs JavaScript

Les modules de détection sont en **TypeScript** (`interview-analysis-system/modules/`) mais le serveur est en **JavaScript**.

### Option 1 : Utiliser tsx (Recommandé)

Installer `tsx` pour exécuter TypeScript directement :

```bash
npm install --save-dev tsx
```

Modifier `package.json` :
```json
{
  "scripts": {
    "start": "tsx index.js",
    "dev": "tsx --watch index.js"
  }
}
```

### Option 2 : Compiler les Modules TypeScript

Compiler les modules TypeScript en JavaScript avant d'utiliser le serveur.

### Option 3 : Utiliser ts-node

```bash
npm install --save-dev ts-node
```

## 🔄 Flow Complet

1. Frontend envoie `{ type: 'transcript_chunk', chunk: '...', speaker: 'candidate' }`
2. `server/index.js` reçoit le message
3. `server/transcriptProcessor.js` → `processTranscriptChunk()` est appelé
4. Modules TypeScript traitent avec LLM (toutes les 10s)
5. `sendToFrontend()` envoie automatiquement `output.contradictions` au frontend
6. Frontend reçoit et affiche les contradictions

## 📤 Fonction `sendToFrontend()`

Cette fonction est dans `transcriptProcessor.js` et envoie automatiquement les résultats à **tous les clients WebSocket connectés** après chaque traitement de chunk.

## 🧪 Test

Pour tester, envoyez un message WebSocket :

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/audio');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'transcript_chunk',
    chunk: 'I have 5 years of experience',
    speaker: 'candidate'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'contradiction_update') {
    console.log('Contradictions:', message.payload.contradictions);
  }
};
```

