# Interview Analysis Service

Service WebSocket pour l'analyse d'entretiens en temps réel.

## 🚀 Démarrage rapide

### Avec Docker

```bash
# Build le container (depuis interview-analysis-system/)
docker build -t interview-analysis:latest .

# Run le container
docker run -p 8080:8080 --env-file .env interview-analysis:latest
```

### Localement (dev)

```bash
# Installer les dépendances
npm install

# Démarrer le service
npm start

# Ou en mode watch (dev)
npm run dev
```

## 📡 WebSocket API

### Connexion

```
ws://localhost:8080
```

### Messages Client → Server

#### 1. Envoyer un chunk de transcript

```json
{
  "type": "transcript_chunk",
  "payload": {
    "chunk": "Bonjour, je m'appelle Jean...",
    "speaker": "candidate" // ou "recruiter"
  }
}
```

#### 2. Réinitialiser l'état

```json
{
  "type": "reset"
}
```

### Messages Server → Client

#### 1. Connexion établie

```json
{
  "type": "connection",
  "status": "connected",
  "message": "Interview Analysis Service ready"
}
```

#### 2. Résultat d'analyse

```json
{
  "type": "analysis_result",
  "payload": {
    "contradiction": {
      "contradiction_score": 85,
      "trend": "-5",
      "label": "Consistent",
      "contradictions": [...]
    },
    "scriptTracking": {
      "llm": { ... },
      "deviation": { ... },
      "scriptState": { ... }
    },
    "metadata": {
      "chunkNumber": 1,
      "speaker": "candidate",
      "timestamp": 1234567890
    }
  },
  "timestamp": 1234567890
}
```

#### 3. Erreur

```json
{
  "type": "error",
  "message": "Error description"
}
```

## 🔧 Configuration

Copier `.env.example` vers `.env` et configurer :

- `PORT`: Port du serveur WebSocket (défaut: 8080)
- `HOST`: Host du serveur (défaut: 0.0.0.0)
- `OPENAI_API_KEY`: Clé API OpenAI
- `LLM_PROVIDER`: Provider LLM (openai, groq, openrouter)
- `LLM_MODEL`: Modèle à utiliser

## 📦 Modules inclus

- **Contradiction Detection**: Détection de contradictions dans les réponses
- **Script Tracking**: Suivi du script d'entretien (recruteur uniquement)
- **Fact Store**: Stockage des faits extraits du profil

## 🐳 Docker

Le service est containerisé avec Docker. Voir `Dockerfile` pour les détails.

Pour l'orchestration avec d'autres services, voir le `docker-compose.yml` à la racine du projet.

