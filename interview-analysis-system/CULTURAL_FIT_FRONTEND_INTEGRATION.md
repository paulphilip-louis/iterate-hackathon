# API Frontend - Format Cultural Fit / Cultural Misfit

Ce document explique le format exact des données de cultural fit à envoyer au frontend, notamment quand il y a une alerte (cultural misfit).

## Format de Sortie

Les résultats de cultural fit sont retournés dans l'objet `CulturalFitOutput` via la fonction `evaluateCulturalFit()`.

### Structure TypeScript

```typescript
interface CulturalFitOutput {
  cultural_score: number;        // Score 0-100 (100 = excellent fit, 0 = très mauvais fit)
  trend: string;                 // Changement depuis le score précédent (ex: "+3", "-13", "0")
  signals: CulturalSignal[];     // ⚠️ ARRAY DE TOUS LES SIGNAUX CULTURELS DÉTECTÉS
  label: 'High Fit' | 'Moderate Fit' | 'Low Fit' | 'At Risk';  // Label lisible
}

interface CulturalSignal {
  type: 'positive' | 'negative';  // Type de signal
  msg: string;                     // Description du signal culturel
  dimension?: string;              // Dimension concernée (ex: "accountability", "ownership", "collaboration")
}
```

## Exemple de Sortie JSON

### Exemple 1: Alerte "At Risk" (score très faible)

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
    },
    {
      "type": "negative",
      "msg": "Negative attitude: expresses frustration with team collaboration",
      "dimension": "collaboration"
    }
  ],
  "label": "At Risk"
}
```

### Exemple 2: "Low Fit" (score faible)

```json
{
  "cultural_score": 45,
  "trend": "-13",
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
  "label": "Low Fit"
}
```

### Exemple 3: "Moderate Fit" (score modéré)

```json
{
  "cultural_score": 65,
  "trend": "+5",
  "signals": [
    {
      "type": "positive",
      "msg": "Shows ownership: mentions taking responsibility for project outcomes",
      "dimension": "ownership"
    },
    {
      "type": "negative",
      "msg": "Limited collaboration: prefers working alone on complex tasks"
    }
  ],
  "label": "Moderate Fit"
}
```

### Exemple 4: "High Fit" (bon score)

```json
{
  "cultural_score": 85,
  "trend": "+8",
  "signals": [
    {
      "type": "positive",
      "msg": "Strong ownership: proactively takes responsibility and drives initiatives",
      "dimension": "ownership"
    },
    {
      "type": "positive",
      "msg": "Collaborative: emphasizes team success and knowledge sharing",
      "dimension": "collaboration"
    }
  ],
  "label": "High Fit"
}
```

## Comment Utiliser dans le Code

### 1. Après chaque évaluation cultural fit

```typescript
import { evaluateCulturalFit } from './modules/cultural_fit';

// Évaluer le fit culturel pour un chunk de transcript
const output = await evaluateCulturalFit({
  latest_chunk: transcriptChunk,
  history_summary: conversationHistorySummary,
  previous_score: currentCulturalScore,
  company_values_file_path: './company_values.txt' // ou company_values: {...}
});

// Envoyer au frontend
sendToFrontend({
  type: 'cultural_fit_alert',
  data: output
});
```

### 2. Format pour le Frontend

```typescript
// Format recommandé pour le frontend
interface FrontendCulturalFitAlert {
  timestamp: number;                    // Timestamp de la détection
  score: number;                        // Score actuel (0-100)
  trend: string;                        // Changement (ex: "-13", "+5")
  label: 'High Fit' | 'Moderate Fit' | 'Low Fit' | 'At Risk';  // Label lisible
  alerts: Array<{                       // ⚠️ ARRAY DES ALERTES/SIGNAUX
    id: string;                         // ID unique de l'alerte
    type: 'positive' | 'negative';      // Type de signal
    message: string;                    // Message du signal
    dimension?: string;                 // Dimension concernée (optionnel)
    timestamp: number;                  // Quand ce signal a été détecté
  }>;
}
```

### 3. Exemple d'implémentation

```typescript
// Dans votre code qui appelle le module
const output = await evaluateCulturalFit({
  latest_chunk: chunk,
  history_summary: history,
  previous_score: previousScore
});

// Transformer pour le frontend
const frontendAlert: FrontendCulturalFitAlert = {
  timestamp: Date.now(),
  score: output.cultural_score,
  trend: output.trend,
  label: output.label,
  alerts: output.signals.map((signal, index) => ({
    id: `cultural-fit-${Date.now()}-${index}`,
    type: signal.type,
    message: signal.msg,
    dimension: signal.dimension,
    timestamp: Date.now()
  }))
};

// Envoyer via WebSocket, SSE, ou API REST
websocket.send(JSON.stringify({
  type: 'cultural_fit_update',
  payload: frontendAlert
}));
```

## Niveaux de Labels et Seuils

| Label | Score | Description | Action Frontend Recommandée |
|-------|-------|-------------|----------------------------|
| `High Fit` | ≥ 75 | Excellent fit culturel | Afficher en vert, indicateur positif |
| `Moderate Fit` | 50-74 | Fit culturel modéré | Afficher en jaune/orange, neutre |
| `Low Fit` | 25-49 | Fit culturel faible | Afficher en orange, alerte modérée |
| `At Risk` | < 25 | Fit culturel très faible | Afficher en rouge, **alerte urgente** |

## Types de Signaux

### Signaux Positifs (`type: "positive"`)
- Indiquent des comportements alignés avec les valeurs de l'entreprise
- Exemples: prise de responsabilité, collaboration, proactivité, apprentissage continu

### Signaux Négatifs (`type: "negative"`)
- Indiquent des comportements non alignés avec les valeurs de l'entreprise
- Exemples: évitement de responsabilité, blâme des autres, attitude négative, manque de collaboration

## Dimensions Culturelles Communes

Le champ `dimension` (optionnel) peut contenir des valeurs comme:
- `"accountability"` - Responsabilité et ownership
- `"collaboration"` - Travail d'équipe et collaboration
- `"ownership"` - Prise d'initiative et ownership
- `"learning"` - Apprentissage et croissance
- `"communication"` - Communication et transparence
- `"values"` - Alignement avec les valeurs de l'entreprise

## Quand Déclencher une Alerte Frontend

### Alerte Urgente (à afficher immédiatement)
- `label === "At Risk"` (score < 25)
- `trend` négatif significatif (ex: "-20" ou moins)
- Présence de signaux négatifs multiples

### Alerte Modérée
- `label === "Low Fit"` (score 25-49)
- `trend` négatif modéré (ex: "-10" à "-19")
- Présence de signaux négatifs

### Notification Info
- `label === "Moderate Fit"` ou `"High Fit"`
- Changements de score normaux

## Où est le Code

### Fonction principale
```typescript
// modules/cultural_fit/culturalFitEvaluator.ts
const output = await evaluateCulturalFit({
  latest_chunk: string,
  history_summary?: string,
  previous_score: number,
  company_values_file_path?: string,
  company_values?: CompanyCultureValues
});
// Retourne: CulturalFitOutput
```

### Types
```typescript
// modules/cultural_fit/types.ts
export interface CulturalFitOutput { ... }
export interface CulturalSignal { ... }
```

## Points Clés

1. **Tous les signaux sont dans `output.signals`** : C'est un array qui contient TOUS les signaux culturels détectés lors de cette évaluation.

2. **Chaque signal a un `type`** : Utilisez `type: "negative"` pour identifier les alertes à afficher.

3. **Le `dimension` est optionnel** : Il indique la dimension culturelle concernée pour faciliter le filtrage/groupement.

4. **Le score global** : `cultural_score` donne une vue d'ensemble (0-100), mais les détails sont dans `signals[]`.

5. **Le `label` indique le niveau d'alerte** : Utilisez `label === "At Risk"` pour déclencher des alertes urgentes.

6. **Le `trend` montre l'évolution** : Un trend négatif important (ex: "-25") indique une détérioration rapide.

7. **Timestamp** : Ajoutez un timestamp lors de l'envoi au frontend pour tracker quand chaque signal a été détecté.

## Exemple Complet d'Intégration

```typescript
// Backend: Évaluation et envoi
async function processCulturalFitChunk(chunk: string) {
  const output = await evaluateCulturalFit({
    latest_chunk: chunk,
    history_summary: getHistorySummary(),
    previous_score: currentScore,
    company_values_file_path: './company_values.txt'
  });

  // Mettre à jour le score
  currentScore = output.cultural_score;

  // Préparer pour le frontend
  const frontendPayload = {
    timestamp: Date.now(),
    score: output.cultural_score,
    trend: output.trend,
    label: output.label,
    alerts: output.signals.map((s, i) => ({
      id: `cultural-${Date.now()}-${i}`,
      type: s.type,
      message: s.msg,
      dimension: s.dimension,
      timestamp: Date.now()
    }))
  };

  // Envoyer au frontend
  if (output.label === 'At Risk' || output.label === 'Low Fit') {
    // Alerte urgente ou modérée
    websocket.send(JSON.stringify({
      type: 'cultural_fit_alert',
      payload: frontendPayload
    }));
  } else {
    // Mise à jour normale
    websocket.send(JSON.stringify({
      type: 'cultural_fit_update',
      payload: frontendPayload
    }));
  }
}
```

```typescript
// Frontend: Réception et affichage
websocket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'cultural_fit_alert' || data.type === 'cultural_fit_update') {
    const payload = data.payload;
    
    // Afficher le score
    updateCulturalFitScore(payload.score, payload.trend, payload.label);
    
    // Afficher les alertes
    if (payload.label === 'At Risk') {
      showUrgentAlert('Cultural Fit At Risk!', payload.alerts);
    } else if (payload.label === 'Low Fit') {
      showWarningAlert('Cultural Fit Low', payload.alerts);
    }
    
    // Afficher tous les signaux
    payload.alerts.forEach(alert => {
      if (alert.type === 'negative') {
        displayNegativeSignal(alert);
      } else {
        displayPositiveSignal(alert);
      }
    });
  }
};
```

