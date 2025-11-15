# Interview Analysis System

Système d'analyse en temps réel pour les entretiens d'embauche, composé de trois modules principaux qui détectent les contradictions, évaluent le fit culturel, et stockent les faits extraits du profil du candidat.

## 📋 Table des Matières

- [Architecture Globale](#architecture-globale)
- [Modules](#modules)
  - [Contradiction Detection](#1-module-contradiction-detection)
  - [Cultural Fit Detection](#2-module-cultural-fit-detection)
  - [Fact Store](#3-module-fact-store)
- [Intégration](#intégration)
- [Formats de Sortie](#formats-de-sortie)
- [Installation](#installation)
- [Configuration](#configuration)
- [Exemples d'Utilisation](#exemples-dutilisation)

## 🏗️ Architecture Globale

Le système est composé de trois modules indépendants qui travaillent ensemble pour analyser les transcriptions d'entretiens :

```
┌─────────────────────────────────────────────────────────┐
│           Interview Transcript Stream                    │
│              (chunks toutes les ~10s)                    │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌──────────────────────┐
│ Contradiction│    │  Cultural Fit        │
│  Detection    │    │  Detection           │
└───────┬───────┘    └──────┬───────────────┘
        │                  │
        │                  │
        └──────────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  Fact Store  │
            │  (mémoire)   │
            └──────────────┘
```

### Flux de Données

1. **Chaque chunk de transcription** (~10 secondes) est analysé par :
   - **Contradiction Detection** : Détecte les incohérences immédiates
   - **Cultural Fit Detection** : Évalue le fit culturel

2. **Toutes les 6 chunks** (~60 secondes) :
   - **Profile Extraction** : Extrait les faits structurés du profil
   - **Fact Store** : Stocke et fusionne les faits extraits

3. **Résultats combinés** : Les scores et alertes sont calculés et envoyés au frontend

## 📦 Modules

### 1. Module Contradiction Detection

Détecte les contradictions dans les déclarations du candidat (années d'expérience, postes, entreprises, éducation, etc.).

#### Fonctionnalités

- **Local Scan** : Analyse chaque chunk (~10s) pour détecter les contradictions immédiates
- **Profile Extraction** : Extrait les faits structurés toutes les ~60s
- **Profile Consistency Check** : Compare programmatiquement les faits pour détecter les incohérences
- **Scoring** : Maintient un score de cohérence (0-100) avec lissage exponentiel

#### Utilisation

```typescript
import { 
  localContradictionScan, 
  extractProfileFacts, 
  computeContradictionOutput 
} from './modules/contradiction_detection';

// Local scan (chaque chunk)
const localContradictions = await localContradictionScan({
  latest_chunk: "I have 5 years of experience...",
  recent_context: "Previously mentioned 2 years...",
  previous_score: 80
});

// Profile extraction (toutes les 60s)
const profileResult = await extractProfileFacts({
  transcript_summary: "Last 5 minutes of conversation...",
  previous_facts: getFacts()
});

// Calcul du score final
const output = computeContradictionOutput(previousScore, allContradictions);
```

#### Format de Sortie

```json
{
  "contradiction_score": 75,
  "trend": "-5",
  "contradictions": [
    {
      "msg": "Years of experience contradiction...",
      "severity": "major",
      "field": "years_experience"
    }
  ],
  "label": "Some Inconsistencies"
}
```

#### Niveaux de Sévérité

- `minor` : -2 points (petite incohérence)
- `medium` : -5 points (contradiction claire)
- `major` : -10 points (contradiction significative)
- `red_flag` : -20 points (contradiction sévère)

#### Labels

- **≥75** : "Consistent"
- **50-74** : "Some Inconsistencies"
- **25-49** : "High Risk"
- **<25** : "Severely Contradictory"

📖 [Documentation complète](./modules/contradiction_detection/README.md)

---

### 2. Module Cultural Fit Detection

Évalue le fit culturel du candidat en analysant ses signaux positifs et négatifs par rapport aux valeurs de l'entreprise.

#### Fonctionnalités

- **Analyse en temps réel** : Évalue chaque chunk de transcription
- **Signaux culturels** : Détecte les signaux positifs et négatifs
- **Score lissé** : Maintient un score stable avec lissage exponentiel (70% ancien, 30% nouveau)
- **Dimensions culturelles** : Ownership, accountability, collaboration, etc.

#### Utilisation

```typescript
import { evaluateCulturalFit } from './modules/cultural_fit';

const result = await evaluateCulturalFit({
  latest_chunk: "I think mistakes happen but it was not my fault...",
  history_summary: "Candidate previously showed good communication...",
  previous_score: 58,
  company_values_file_path: './company_values.txt'
});
```

#### Format de Sortie

```json
{
  "cultural_score": 45,
  "trend": "-13",
  "signals": [
    {
      "type": "negative",
      "msg": "Blame shifting: explicitly denies responsibility...",
      "dimension": "accountability"
    },
    {
      "type": "negative",
      "msg": "Avoidance: pattern of avoiding responsibility..."
    }
  ],
  "label": "Low Fit"
}
```

#### Labels

- **≥75** : "High Fit"
- **50-74** : "Moderate Fit"
- **25-49** : "Low Fit"
- **<25** : "At Risk" ⚠️

#### Types de Signaux

- **Positifs** : Ownership, accountability, collaboration, curiosité, etc.
- **Négatifs** : Blame shifting, évitement, arrogance, attitude toxique, etc.

📖 [Documentation complète](./modules/cultural_fit/README.md)

---

### 3. Module Fact Store

Stocke en mémoire les faits structurés extraits du profil du candidat et gère leur fusion avec détection de conflits.

#### Fonctionnalités

- **Stockage en mémoire** : Maintient les faits du profil candidat
- **Fusion intelligente** : Fusionne les nouveaux faits avec les anciens
- **Détection de conflits** : Identifie les incohérences lors de la fusion
- **Résumés** : Génère des résumés texte/JSON pour les prompts LLM

#### Utilisation

```typescript
import { getFacts, updateFacts, mergeFacts, summarizeFacts } from './modules/fact_store';

// Récupérer les faits actuels
const facts = getFacts();

// Mettre à jour les faits
updateFacts({
  years_experience: 5,
  job_titles: ['Senior Engineer'],
  companies: ['Tech Corp']
});

// Fusionner avec nouveaux faits
const result = mergeFacts(oldFacts, newFacts, {
  keep_conflicts: true,
  min_confidence: 0.6
});

// Résumé pour LLM
const summary = summarizeFacts(facts);
```

#### Structure des Faits

```typescript
interface ProfileFacts {
  years_experience?: number | string;
  job_titles?: string[];
  companies?: string[];
  degrees?: string[];
  leadership_experience?: string[];
  languages?: string[];
  tech_stack?: string[];
  salary_expectations?: string | number;
  other_facts?: Record<string, any>;
  confidence?: number;
  extracted_at?: number;
}
```

📖 [Documentation complète](./modules/fact_store/README.md)

---

## 🔗 Intégration

### Flux Complet d'Intégration

```typescript
import { 
  localContradictionScan, 
  extractProfileFacts, 
  computeContradictionOutput 
} from './modules/contradiction_detection';
import { evaluateCulturalFit } from './modules/cultural_fit';
import { getFacts, updateFacts, mergeFacts } from './modules/fact_store';

// État global
let contradictionScore = 100;
let culturalFitScore = 50;
let chunkCount = 0;

async function processTranscriptChunk(chunk: string) {
  chunkCount++;
  
  // 1. CONTRADICTION DETECTION - Local Scan (chaque chunk)
  const localContradictions = await localContradictionScan({
    latest_chunk: chunk,
    recent_context: getRecentContext(2), // Dernières 2 minutes
    previous_score: contradictionScore
  });
  
  let profileContradictions = [];
  let programmaticContradictions = [];
  
  // 2. PROFILE EXTRACTION (toutes les 6 chunks)
  if (chunkCount % 6 === 0 || isLastChunk) {
    const profileResult = await extractProfileFacts({
      transcript_summary: getRecentContext(5), // Dernières 5 minutes
      previous_facts: getFacts()
    });
    
    profileContradictions = profileResult.contradictions;
    
    // Fusionner et stocker les faits
    const mergeResult = mergeFacts(getFacts(), profileResult.facts);
    updateFacts(mergeResult.merged_facts);
    
    // Détecter les contradictions programmatiques
    programmaticContradictions = mergeResult.conflicts.map(c => ({
      msg: `Conflict in ${c.field}: ${c.old_value} vs ${c.new_value}`,
      severity: 'medium' as const,
      field: c.field
    }));
  }
  
  // 3. COMBINER TOUTES LES CONTRADICTIONS
  const allContradictions = [
    ...localContradictions,
    ...profileContradictions,
    ...programmaticContradictions
  ];
  
  // 4. CALCULER LE SCORE DE CONTRADICTION
  const contradictionOutput = computeContradictionOutput(
    contradictionScore, 
    allContradictions
  );
  contradictionScore = contradictionOutput.contradiction_score;
  
  // 5. CULTURAL FIT DETECTION (chaque chunk)
  const culturalFitOutput = await evaluateCulturalFit({
    latest_chunk: chunk,
    history_summary: getHistorySummary(),
    previous_score: culturalFitScore,
    company_values_file_path: './company_values.txt'
  });
  culturalFitScore = culturalFitOutput.cultural_score;
  
  // 6. ENVOYER AU FRONTEND
  sendToFrontend({
    contradiction: contradictionOutput,
    cultural_fit: culturalFitOutput,
    timestamp: Date.now()
  });
  
  return {
    contradiction: contradictionOutput,
    cultural_fit: culturalFitOutput
  };
}
```

### Fréquence des Appels

| Module | Fonction | Fréquence | Appel LLM |
|--------|----------|-----------|-----------|
| Contradiction | Local Scan | Chaque chunk (~10s) | ✅ Oui |
| Contradiction | Profile Extraction | Toutes les 6 chunks (~60s) | ✅ Oui |
| Contradiction | Profile Consistency | Quand profile extraction | ❌ Non |
| Cultural Fit | Evaluation | Chaque chunk (~10s) | ✅ Oui |
| Fact Store | Merge/Update | Quand profile extraction | ❌ Non |

---

## 📤 Formats de Sortie

### Contradiction Detection Output

```json
{
  "contradiction_score": 70,
  "trend": "-15",
  "contradictions": [
    {
      "msg": "Latest chunk states 'around three years of real backend experience' while recent context mentions 'working professionally for about five years now'",
      "severity": "major",
      "field": "years_experience"
    }
  ],
  "label": "Some Inconsistencies"
}
```

### Cultural Fit Output

```json
{
  "cultural_score": 20,
  "trend": "-25",
  "signals": [
    {
      "type": "negative",
      "msg": "Blame shifting: explicitly denies responsibility and blames teammates",
      "dimension": "accountability"
    },
    {
      "type": "negative",
      "msg": "Avoidance: pattern of avoiding responsibility (second occurrence)"
    }
  ],
  "label": "At Risk"
}
```

### Format Frontend Recommandé

```typescript
interface FrontendAlert {
  timestamp: number;
  contradiction: {
    score: number;
    trend: string;
    label: string;
    alerts: Array<{
      id: string;
      message: string;
      severity: 'minor' | 'medium' | 'major' | 'red_flag';
      field?: string;
      timestamp: number;
    }>;
  };
  cultural_fit: {
    score: number;
    trend: string;
    label: 'High Fit' | 'Moderate Fit' | 'Low Fit' | 'At Risk';
    alerts: Array<{
      id: string;
      type: 'positive' | 'negative';
      message: string;
      dimension?: string;
      timestamp: number;
    }>;
  };
}
```

📖 [Guide d'intégration frontend - Contradictions](./CONTRADICTION_FRONTEND_INTEGRATION.md)  
📖 [Guide d'intégration frontend - Cultural Fit](./CULTURAL_FIT_FRONTEND_INTEGRATION.md)

---

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn

### Installation des Dépendances

   ```bash
   npm install
   ```

### Dépendances Principales

- `groq-sdk` : Pour les appels LLM (Llama 4 Maverick)
- `dotenv` : Gestion des variables d'environnement
- `react` / `react-dom` : Frontend (optionnel)
- `typescript` : Compilation TypeScript

---

## ⚙️ Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet :

   ```bash
# LLM Configuration
GROQ_API_KEY=your_groq_api_key_here
# ou
OPENAI_API_KEY=your_openai_api_key_here

# Modèle LLM (optionnel)
LLM_MODEL=meta-llama/llama-4-maverick-17b-128e-instruct
# ou
LLM_MODEL=gpt-4o
```

### Configuration des Valeurs d'Entreprise

Pour le module Cultural Fit, créez un fichier `company_values.txt` ou passez un objet `CompanyCultureValues` :

```typescript
const companyValues = {
  company_name: "Tech Corp",
  core_values: ["Ownership", "Accountability", "Collaboration"],
  positive_values: ["Proactive", "Transparent", "Curious"],
  negative_values: ["Blame shifting", "Avoidance", "Arrogance"]
};
```

📖 [Guide des valeurs d'entreprise](./modules/cultural_fit/COMPANY_VALUES_GUIDE.md)

---

## 💡 Exemples d'Utilisation

### Exemple 1 : Analyse Simple d'un Chunk

```typescript
import { localContradictionScan } from './modules/contradiction_detection';
import { evaluateCulturalFit } from './modules/cultural_fit';

const chunk = "I've been working as a senior engineer for 5 years...";

// Contradiction
const contradictions = await localContradictionScan({
  latest_chunk: chunk,
  recent_context: "Previously said 2 years...",
  previous_score: 80
});

// Cultural Fit
const culturalFit = await evaluateCulturalFit({
  latest_chunk: chunk,
  previous_score: 50
});

console.log('Contradictions:', contradictions);
console.log('Cultural Fit:', culturalFit);
```

### Exemple 2 : Intégration avec Stream de Transcription

```typescript
class InterviewAnalyzer {
  private contradictionScore = 100;
  private culturalFitScore = 50;
  private chunkCount = 0;
  private transcriptHistory: string[] = [];
  
  async processChunk(chunk: string) {
    this.chunkCount++;
    this.transcriptHistory.push(chunk);
    
    // Garder seulement les 10 derniers chunks
    if (this.transcriptHistory.length > 10) {
      this.transcriptHistory.shift();
    }
    
    // Analyser
    const results = await this.analyzeChunk(chunk);
    
    // Alerter si nécessaire
    if (results.cultural_fit.label === 'At Risk') {
      this.triggerAlert('Cultural fit at risk!', results);
    }
    
    if (results.contradiction.label === 'Severely Contradictory') {
      this.triggerAlert('Severe contradictions detected!', results);
    }
    
    return results;
  }
  
  private async analyzeChunk(chunk: string) {
    // ... (voir exemple d'intégration complet ci-dessus)
  }
}
```

### Exemple 3 : Tests

```bash
# Test Cultural Fit
npm run test:cultural-fit

# Test Cultural Fit avec API réelle
npm run test:cultural-fit:real

# Test Contradiction Detection
npm run test:contradiction
```

---

## 📚 Documentation Complémentaire

- [Flux des Contradictions](./CONTRADICTION_FLOW.md) - Quand sont détectées les contradictions
- [Intégration Frontend - Contradictions](./CONTRADICTION_FRONTEND_INTEGRATION.md)
- [Intégration Frontend - Cultural Fit](./CULTURAL_FIT_FRONTEND_INTEGRATION.md)
- [Format des Payloads API](./FRONTEND_API.md) - Format exact des appels LLM
- [Module Contradiction Detection](./modules/contradiction_detection/README.md)
- [Module Cultural Fit](./modules/cultural_fit/README.md)
- [Module Fact Store](./modules/fact_store/README.md)

---

## 🎯 Points Clés

1. **Modules Indépendants** : Chaque module peut être utilisé séparément
2. **Temps Réel** : Analyse en streaming avec chunks de ~10 secondes
3. **Scores Lissés** : Les scores utilisent un lissage exponentiel pour éviter les fluctuations
4. **Fact Store Centralisé** : Les faits sont stockés et fusionnés de manière cohérente
5. **Alertes Configurables** : Les seuils d'alerte peuvent être ajustés selon vos besoins

---

## 🔮 Améliorations Futures

- [ ] Persistance des faits (base de données)
- [ ] Versioning des faits
- [ ] Analyse temporelle avancée
- [ ] Intégration avec systèmes de recrutement
- [ ] Dashboard de visualisation
- [ ] Export de rapports

---

## 📝 License

[Votre License]

---

## 🤝 Contribution

[Instructions de contribution]
