# Intégration STT → Détection de Contradictions

Ce document explique comment brancher le transcript en live au module de détection de contradictions.

## 🔄 Flow Complet

```
1. Audio arrive → server/index.js (WebSocket)
   ↓
2. STT traite l'audio → Génère transcript + speaker
   ↓
3. Envoie au module → processTranscriptChunk(transcript, wss)
   ↓
4. Détection de contradictions → Envoie output.contradictions au frontend
```

## ✅ Déjà Intégré !

Le code est **déjà branché** dans `server/index.js` ! Il suffit d'implémenter le STT dans `server/sttService.js`.

### Fichier : `server/sttService.js`

Ce fichier contient un placeholder. Vous devez implémenter votre service STT :

```javascript
// server/sttService.js
export async function transcribeAudio(audioData, format = 'pcm') {
  // TODO: Intégrer votre service STT ici
  // Retourner { text: string, speaker: string }
}
```

## 🔌 Options d'Intégration STT

### Option 1 : OpenAI Whisper (Recommandé)

```javascript
// server/sttService.js
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioData, format = 'pcm') {
  // Convertir base64 en fichier temporaire
  const audioBuffer = Buffer.from(audioData, 'base64');
  const tempFile = `/tmp/audio_${Date.now()}.wav`;
  fs.writeFileSync(tempFile, audioBuffer);
  
  // Appeler Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(tempFile),
    model: 'whisper-1',
    language: 'fr', // ou 'en'
    response_format: 'verbose_json'
  });
  
  // Nettoyer le fichier temporaire
  fs.unlinkSync(tempFile);
  
  // Diarization (identifier le speaker)
  const speaker = await identifySpeaker(audioData);
  
  return {
    text: transcription.text,
    speaker: speaker
  };
}
```

### Option 2 : Google Speech-to-Text

```javascript
// server/sttService.js
import speech from '@google-cloud/speech';

const client = new speech.SpeechClient();

export async function transcribeAudio(audioData, format = 'pcm') {
  const audioBuffer = Buffer.from(audioData, 'base64');
  
  const request = {
    audio: {
      content: audioBuffer.toString('base64'),
    },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'fr-FR',
      enableSpeakerDiarization: true,
      diarizationSpeakerCount: 2,
    },
  };
  
  const [response] = await client.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  
  // Identifier le speaker depuis la diarization
  const speaker = identifySpeakerFromDiarization(response);
  
  return {
    text: transcription,
    speaker: speaker
  };
}
```

### Option 3 : AssemblyAI (Streaming)

```javascript
// server/sttService.js
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

export async function transcribeAudio(audioData, format = 'pcm') {
  const audioBuffer = Buffer.from(audioData, 'base64');
  
  const transcript = await client.transcripts.transcribe({
    audio: audioBuffer,
    speaker_labels: true, // Diarization inclus
    language_code: 'fr'
  });
  
  // Identifier le speaker
  const speaker = identifySpeakerFromAssemblyAI(transcript);
  
  return {
    text: transcript.text,
    speaker: speaker
  };
}
```

### Option 4 : Service STT Externe (Python/autre)

Si votre STT est dans un service séparé (Python par exemple) :

```python
# stt_service.py
import websocket
import json
from speech_recognition import Recognizer, AudioData

def process_audio_and_send(audio_data, ws_nodejs):
    # 1. STT
    recognizer = Recognizer()
    audio = AudioData(audio_data, 16000, 2)
    transcript = recognizer.recognize_google(audio)
    
    # 2. Diarization
    speaker = identify_speaker(audio_data)
    
    # 3. Envoyer au serveur Node.js
    message = {
        'type': 'transcript_chunk',
        'chunk': transcript,
        'speaker': speaker
    }
    
    ws_nodejs.send(json.dumps(message))
```

Puis dans `server/index.js`, le message `transcript_chunk` sera automatiquement traité.

## 📍 Comment Ça Fonctionne Actuellement

### Dans `server/index.js` :

```javascript
// Quand l'audio arrive
if (message.type === 'audio') {
  // 1. STT traite l'audio
  const sttResult = await processAudioChunk(message.audio);
  
  // 2. Si c'est le candidat, envoyer au module de détection
  if (sttResult.chunk && sttResult.speaker === 'candidate') {
    await processTranscriptChunk(sttResult.chunk, wss);
  }
}

// OU si le transcript arrive directement
if (message.type === 'transcript_chunk') {
  if (message.speaker === 'candidate') {
    await processTranscriptChunk(message.chunk, wss);
  }
}
```

## 🎯 Deux Options

### Option A : STT dans le Backend (Recommandé)

1. Implémenter `transcribeAudio()` dans `server/sttService.js`
2. L'audio arrive → STT traite → `processTranscriptChunk()` appelé automatiquement

### Option B : STT dans le Frontend ou Service Séparé

1. STT traite l'audio ailleurs (frontend ou service Python)
2. Envoie directement `{ type: 'transcript_chunk', chunk: '...', speaker: 'candidate' }`
3. `server/index.js` reçoit et appelle automatiquement `processTranscriptChunk()`

## ✅ Checklist

- [ ] Implémenter `transcribeAudio()` dans `server/sttService.js` (si Option A)
- [ ] Ou configurer le STT pour envoyer `transcript_chunk` (si Option B)
- [ ] Tester que les transcripts arrivent bien
- [ ] Vérifier que `processTranscriptChunk()` est appelé
- [ ] Vérifier que les résultats sont envoyés au frontend

## 🚀 Quick Start

1. **Si vous avez déjà un STT** : Modifiez-le pour envoyer des messages au format :
   ```json
   {
     "type": "transcript_chunk",
     "chunk": "Le texte transcrit",
     "speaker": "candidate"
   }
   ```

2. **Si vous n'avez pas de STT** : Implémentez `transcribeAudio()` dans `server/sttService.js` avec votre service préféré (Whisper, Google, etc.)

3. **Tester** : Envoyez de l'audio ou des transcripts et vérifiez les logs du serveur

## 📝 Format Requis

Le STT doit retourner ou envoyer :

```typescript
{
  chunk: string;      // Le texte transcrit
  speaker: string;    // 'candidate' ou 'recruiter'
}
```

Le serveur appelle automatiquement `processTranscriptChunk()` qui :
1. Traite avec les modules LLM
2. Calcule `output.contradictions`
3. Envoie au frontend via WebSocket
