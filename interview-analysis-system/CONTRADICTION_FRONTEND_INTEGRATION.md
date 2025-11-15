# Frontend Integration Guide - Contradiction Detection API

Ce document décrit le format exact des données de sortie du module de détection de contradictions pour l'intégration frontend.

## 📦 Format de Sortie Principal

### Structure TypeScript

```typescript
interface ContradictionOutput {
  contradiction_score: number;        // Score 0-100 (100 = parfait, 0 = très contradictoire)
  trend: string;                      // Changement depuis le score précédent (ex: "+3", "-15", "0")
  contradictions: Contradiction[];    // ⚠️ ARRAY DE TOUTES LES CONTRADICTIONS DÉTECTÉES
  label: string;                      // Label lisible: "Consistent" | "Some Inconsistencies" | "High Risk" | "Severely Contradictory"
}

interface Contradiction {
  msg: string;                         // Description de la contradiction
  severity: 'minor' | 'medium' | 'major' | 'red_flag';  // Niveau de sévérité
  field?: string;                      // Champ concerné (ex: "years_experience", "job_title", "leadership_experience")
}
```

## 📤 Payload JSON Complet

### Exemple avec Contradictions

```json
{
  "contradiction_score": 70,
  "trend": "-15",
  "label": "Some Inconsistencies",
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
  ]
}
```

### Exemple sans Contradictions

```json
{
  "contradiction_score": 100,
  "trend": "0",
  "label": "Consistent",
  "contradictions": []
}
```

## 🔄 Fréquence de Mise à Jour

**Le payload est généré à CHAQUE chunk de transcript** (environ toutes les 10 secondes).

- **Local Scan** : Appelé à chaque chunk → peut détecter des contradictions
- **Profile Extraction** : Appelé toutes les 6 chunks → peut détecter des contradictions supplémentaires
- **Output Final** : Calculé à chaque chunk en combinant toutes les sources

## 📊 Niveaux de Sévérité

| Sévérité | Valeur | Pénalité | Description | Recommandation UI |
|----------|--------|----------|-------------|-------------------|
| `minor` | ⚪ | -5 points | Petite incohérence, peut être une clarification | Badge info (bleu clair) |
| `medium` | 🟡 | -7 points | Contradiction claire dans les détails | Badge warning (jaune) |
| `major` | 🟠 | -15 points | Contradiction significative | Badge alert (orange) |
| `red_flag` | 🔴 | -30 points | Contradiction sévère suggérant malhonnêteté | Badge error (rouge) + notification urgente |

## 🎯 Labels de Score

| Score | Label | Description |
|-------|-------|-------------|
| ≥ 75 | `"Consistent"` | Le candidat est cohérent |
| 50-74 | `"Some Inconsistencies"` | Quelques incohérences détectées |
| 25-49 | `"High Risk"` | Nombreuses contradictions |
| < 25 | `"Severely Contradictory"` | Très contradictoire, risque élevé |

## 💻 Exemple d'Intégration Frontend

### React/TypeScript

```typescript
// Types
interface ContradictionOutput {
  contradiction_score: number;
  trend: string;
  contradictions: Array<{
    msg: string;
    severity: 'minor' | 'medium' | 'major' | 'red_flag';
    field?: string;
  }>;
  label: string;
}

// Composant React
function ContradictionAlert({ data }: { data: ContradictionOutput }) {
  const hasAlerts = data.contradictions.length > 0;
  
  return (
    <div className="contradiction-alert">
      <div className="score">
        <span>Score: {data.contradiction_score}/100</span>
        <span className={`trend ${data.trend.startsWith('-') ? 'negative' : 'positive'}`}>
          {data.trend}
        </span>
        <span className="label">{data.label}</span>
      </div>
      
      {hasAlerts && (
        <div className="alerts">
          <h3>⚠️ Contradictions détectées ({data.contradictions.length})</h3>
          {data.contradictions.map((contradiction, index) => (
            <div 
              key={index} 
              className={`alert alert-${contradiction.severity}`}
            >
              <span className="severity-badge">{contradiction.severity}</span>
              <p>{contradiction.msg}</p>
              {contradiction.field && (
                <span className="field">Field: {contradiction.field}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### WebSocket/SSE Integration

```typescript
// WebSocket listener
websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'contradiction_update') {
    const output: ContradictionOutput = message.payload;
    
    // Mettre à jour l'UI
    updateContradictionDisplay(output);
    
    // Afficher des notifications pour les red flags
    output.contradictions
      .filter(c => c.severity === 'red_flag')
      .forEach(c => {
        showUrgentNotification(c.msg);
      });
  }
};
```

### REST API Integration

```typescript
// Endpoint: GET /api/contradiction/current
async function fetchCurrentContradictions(): Promise<ContradictionOutput> {
  const response = await fetch('/api/contradiction/current');
  return response.json();
}

// Polling toutes les 10 secondes
setInterval(async () => {
  const output = await fetchCurrentContradictions();
  updateUI(output);
}, 10000);
```

## 🎨 Recommandations UI/UX

### Affichage du Score

```typescript
function getScoreColor(score: number): string {
  if (score >= 75) return '#10b981'; // Vert
  if (score >= 50) return '#f59e0b'; // Jaune
  if (score >= 25) return '#f97316'; // Orange
  return '#ef4444'; // Rouge
}

function getScoreIcon(score: number): string {
  if (score >= 75) return '✅';
  if (score >= 50) return '⚠️';
  if (score >= 25) return '🔴';
  return '🚨';
}
```

### Affichage des Contradictions

```typescript
function getSeverityColor(severity: string): string {
  const colors = {
    minor: '#3b82f6',      // Bleu
    medium: '#eab308',      // Jaune
    major: '#f97316',      // Orange
    red_flag: '#ef4444'    // Rouge
  };
  return colors[severity] || '#6b7280';
}

function getSeverityIcon(severity: string): string {
  const icons = {
    minor: '⚪',
    medium: '🟡',
    major: '🟠',
    red_flag: '🔴'
  };
  return icons[severity] || '•';
}
```

### Groupement par Field

```typescript
// Grouper les contradictions par champ
const groupedByField = output.contradictions.reduce((acc, c) => {
  const field = c.field || 'other';
  if (!acc[field]) acc[field] = [];
  acc[field].push(c);
  return acc;
}, {} as Record<string, typeof output.contradictions>);

// Afficher par section
Object.entries(groupedByField).map(([field, contradictions]) => (
  <div key={field}>
    <h4>{field}</h4>
    {contradictions.map((c, i) => <ContradictionCard key={i} data={c} />)}
  </div>
));
```

## 📡 Endpoint API (à implémenter côté backend)

### GET /api/contradiction/current

Retourne l'état actuel des contradictions.

**Response:**
```json
{
  "contradiction_score": 70,
  "trend": "-15",
  "label": "Some Inconsistencies",
  "contradictions": [...],
  "timestamp": 1704067200000
}
```

### GET /api/contradiction/history

Retourne l'historique des scores et contradictions.

**Response:**
```json
{
  "history": [
    {
      "timestamp": 1704067200000,
      "score": 100,
      "contradictions": []
    },
    {
      "timestamp": 1704067300000,
      "score": 85,
      "contradictions": [
        {
          "msg": "...",
          "severity": "major",
          "field": "years_experience"
        }
      ]
    }
  ]
}
```

## 🔍 Champs Possibles (field)

Les contradictions peuvent être associées à ces champs :

- `years_experience` - Contradictions sur les années d'expérience
- `job_title` - Contradictions sur les titres de poste
- `company` - Contradictions sur les entreprises
- `education` - Contradictions sur l'éducation/formation
- `leadership_experience` - Contradictions sur l'expérience de leadership
- `tech_stack` - Contradictions sur la stack technique
- `languages` - Contradictions sur les langages de programmation
- `salary_expectations` - Contradictions sur les attentes salariales

## ⚠️ Points Importants

1. **`contradictions` peut être vide** : Si aucune contradiction n'est détectée, `contradictions: []`

2. **Le score peut augmenter** : Si le trend est positif (ex: "+5"), cela signifie que le score s'améliore (moins de contradictions)

3. **Les contradictions sont cumulatives** : Chaque chunk peut ajouter de nouvelles contradictions, mais les anciennes restent dans l'historique

4. **Timestamp recommandé** : Ajoutez un timestamp côté backend lors de l'envoi pour tracker quand chaque mise à jour a été générée

5. **Field est optionnel** : Certaines contradictions peuvent ne pas avoir de `field` défini

## 📝 Exemple de Payload Complet avec Timestamp

```json
{
  "timestamp": 1704067200000,
  "contradiction_score": 70,
  "trend": "-15",
  "label": "Some Inconsistencies",
  "contradictions": [
    {
      "msg": "Latest chunk states 'around three years of real backend experience' while recent context mentions 'working professionally for about five years now'",
      "severity": "major",
      "field": "years_experience"
    }
  ]
}
```

## 🚀 Quick Start

1. **Écouter les mises à jour** via WebSocket/SSE ou polling REST
2. **Parser le payload** : `const output: ContradictionOutput = JSON.parse(data)`
3. **Vérifier s'il y a des alertes** : `if (output.contradictions.length > 0)`
4. **Afficher les contradictions** avec le bon style selon `severity`
5. **Mettre à jour le score** avec le `trend` pour montrer l'évolution

## 📞 Support

Pour toute question sur le format ou l'intégration, référez-vous à :
- `modules/contradiction_detection/types.ts` - Types TypeScript complets
- `modules/contradiction_detection/scoring.ts` - Logique de scoring
- `tests/contradiction_detection/testCustomTranscript.ts` - Exemple d'utilisation

