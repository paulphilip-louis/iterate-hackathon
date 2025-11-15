# API Frontend - Format des Contradictions

Ce document explique le format exact des données de contradictions à envoyer au frontend.

## Format de Sortie

Les contradictions sont retournées dans l'objet `ContradictionOutput` via la fonction `computeContradictionOutput()`.

### Structure TypeScript

```typescript
interface ContradictionOutput {
  contradiction_score: number;        // Score 0-100 (100 = parfait, 0 = très contradictoire)
  trend: string;                      // Changement depuis le score précédent (ex: "+3", "-15")
  contradictions: Contradiction[];     // ⚠️ ARRAY DE TOUTES LES CONTRADICTIONS DÉTECTÉES
  label: string;                      // Label lisible: "Consistent" | "Some Inconsistencies" | "High Risk" | "Severely Contradictory"
}

interface Contradiction {
  msg: string;                         // Description de la contradiction
  severity: 'minor' | 'medium' | 'major' | 'red_flag';  // Niveau de sévérité
  field?: string;                      // Champ concerné (ex: "years_experience", "job_title", "leadership_experience")
}
```

## Exemple de Sortie JSON

```json
{
  "contradiction_score": 70,
  "trend": "-15",
  "contradictions": [
    {
      "msg": "Latest chunk states 'around three years of real backend experience' while recent context mentions 'working professionally for about five years now'",
      "severity": "major",
      "field": "years_experience"
    },
    {
      "msg": "Claims this was technically their first real backend job, contradicting previous claim of having around three years of real backend experience",
      "severity": "major",
      "field": "years_experience"
    },
    {
      "msg": "Previously claimed 'led a project with a critical bug in production and took full responsibility', now only mentions acknowledging a mistake and sharing it with the team",
      "severity": "major",
      "field": "leadership_experience"
    }
  ],
  "label": "Some Inconsistencies"
}
```

## Comment Utiliser dans le Code

### 1. Après chaque analyse (local scan ou profile extraction)

```typescript
import { computeContradictionOutput } from './modules/contradiction_detection';

// Collecter toutes les contradictions détectées
const allContradictions = [...localContradictions, ...profileContradictions];

// Calculer l'output complet
const output = computeContradictionOutput(previousScore, allContradictions);

// Envoyer au frontend
sendToFrontend({
  type: 'contradiction_alert',
  data: output
});
```

### 2. Format pour le Frontend

```typescript
// Format recommandé pour le frontend
interface FrontendContradictionAlert {
  timestamp: number;                    // Timestamp de la détection
  score: number;                        // Score actuel (0-100)
  trend: string;                        // Changement (ex: "-15")
  label: string;                        // Label lisible
  alerts: Array<{                       // ⚠️ ARRAY DES ALERTES/FLAGS
    id: string;                         // ID unique de l'alerte
    message: string;                    // Message de la contradiction
    severity: 'minor' | 'medium' | 'major' | 'red_flag';
    field?: string;                     // Champ concerné
    timestamp: number;                  // Quand cette contradiction a été détectée
  }>;
}
```

### 3. Exemple d'implémentation

```typescript
// Dans votre code qui appelle le module
const output = computeContradictionOutput(previousScore, allContradictions);

// Transformer pour le frontend
const frontendAlert: FrontendContradictionAlert = {
  timestamp: Date.now(),
  score: output.contradiction_score,
  trend: output.trend,
  label: output.label,
  alerts: output.contradictions.map((c, index) => ({
    id: `contradiction-${Date.now()}-${index}`,
    message: c.msg,
    severity: c.severity,
    field: c.field,
    timestamp: Date.now()
  }))
};

// Envoyer via WebSocket, SSE, ou API REST
websocket.send(JSON.stringify({
  type: 'contradiction_update',
  payload: frontendAlert
}));
```

## Niveaux de Sévérité

| Sévérité | Pénalité | Description | Action Frontend |
|----------|----------|-------------|-----------------|
| `minor` | -5 points | Petite incohérence, peut être une clarification | Afficher en info/bleu |
| `medium` | -7 points | Contradiction claire dans les détails | Afficher en warning/jaune |
| `major` | -15 points | Contradiction significative | Afficher en alert/orange |
| `red_flag` | -30 points | Contradiction sévère suggérant malhonnêteté | Afficher en erreur/rouge, alerte urgente |

## Où sont les Contradictions dans le Code

### 1. Local Scan (toutes les ~10 secondes)
```typescript
// modules/contradiction_detection/localScan.ts
const localContradictions = await localContradictionScan({
  latest_chunk: chunk,
  recent_context: recentContextSummary,
  previous_score: contradictionScore
});
// Retourne: Contradiction[]
```

### 2. Profile Extraction (toutes les 60-120 secondes)
```typescript
// modules/contradiction_detection/profileExtraction.ts
const { facts, contradictions: profileContradictions } = await extractProfileFacts({
  transcript_summary: transcriptSummary,
  previous_facts: previousFacts
});
// Retourne: { facts: ProfileFacts, contradictions: Contradiction[] }
```

### 3. Profile Consistency Check (programmatique)
```typescript
// modules/contradiction_detection/profileConsistencyCheck.ts
const programmaticContradictions = compareProfiles(oldFacts, newFacts);
// Retourne: Contradiction[]
```

### 4. Calcul Final
```typescript
// Combiner toutes les contradictions
const allContradictions = [
  ...localContradictions,
  ...profileContradictions,
  ...programmaticContradictions
];

// Calculer l'output complet
const output = computeContradictionOutput(previousScore, allContradictions);
// Retourne: ContradictionOutput avec toutes les contradictions dans output.contradictions
```

## Points Clés

1. **Toutes les contradictions sont dans `output.contradictions`** : C'est un array qui contient TOUTES les contradictions détectées lors de cette analyse.

2. **Chaque contradiction a un `severity`** : Utilisez ce champ pour déterminer le niveau d'alerte à afficher.

3. **Le `field` est optionnel** : Il indique le champ concerné (ex: "years_experience", "leadership_experience") pour faciliter le filtrage/groupement.

4. **Le score global** : `contradiction_score` donne une vue d'ensemble (0-100), mais les détails sont dans `contradictions[]`.

5. **Timestamp** : Ajoutez un timestamp lors de l'envoi au frontend pour tracker quand chaque contradiction a été détectée.

