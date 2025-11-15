# Flux des Contradictions - Quand sont-elles détectées ?

## Résumé Rapide

**Non, `output.contradictions` ne sort pas à chaque appel LLM.** Voici le flux exact :

## Flux par Chunk

### Pour CHAQUE chunk (toutes les ~10 secondes) :

1. **Local Scan LLM Call** → Retourne `localContradictions[]`
   - Appelé : ✅ **À CHAQUE chunk**
   - Retourne : `Contradiction[]` directement

2. **Profile Extraction LLM Call** → Retourne `profileContradictions[]`
   - Appelé : ❌ **Seulement toutes les 6 chunks** (ou au dernier chunk)
   - Retourne : `{ facts, contradictions }`

3. **Profile Consistency Check** → Retourne `programmaticContradictions[]`
   - Appelé : ❌ **Seulement quand profile extraction est appelé**
   - **Avec appel LLM OpenAI** ✅ : Utilise GPT-4o pour comparer intelligemment les profils
   - **Compare quoi ?** Compare les nouveaux faits structurés (extraits par le LLM) avec les anciens faits stockés dans le Fact Store
   - **Comment ?** Appel LLM qui comprend le contexte :
     - Détecte que "Frontend Engineer" vs "Full Stack Engineer" n'est PAS une contradiction (progression de carrière)
     - Détecte que "Engineer" vs "Developer" n'est PAS une contradiction (rôles similaires)
     - Détecte les vraies contradictions : "5 years" vs "2 years" = major, "Engineer" vs "Sales Manager" = major

4. **Combinaison et Calcul Final** → `output.contradictions`
   - Calculé : ✅ **À CHAQUE chunk** (après avoir collecté toutes les sources)
   - Combine : `localContradictions + profileContradictions + programmaticContradictions`

## Exemple Concret

### Chunk 1-5 (pas de profile extraction)
```typescript
// Chunk 1
localContradictions = await localContradictionScan(...); // LLM call ✅
// → Retourne: [{ msg: "...", severity: "major" }]

profileContradictions = []; // Pas d'appel LLM ❌

allContradictions = [...localContradictions]; // Combine
output = computeContradictionOutput(score, allContradictions);
// output.contradictions = [{ msg: "...", severity: "major" }] ✅
```

### Chunk 6 (profile extraction appelé)
```typescript
// Chunk 6
localContradictions = await localContradictionScan(...); // LLM call ✅
// → Retourne: [{ msg: "...", severity: "medium" }]

// Profile extraction appelé (toutes les 6 chunks)
const { facts, contradictions } = await extractProfileFacts(...); // LLM call ✅
profileContradictions = contradictions; // → [{ msg: "...", severity: "major" }]

// Profile consistency check (avec appel LLM OpenAI)
// Compare les nouveaux faits extraits (newFacts) avec les anciens faits stockés (oldFacts)
programmaticContradictions = await compareProfiles(oldFacts, newFacts); // LLM call ✅
// Le LLM compare intelligemment les profils (détecte que "Frontend Engineer" vs "Full Stack Engineer" n'est PAS une contradiction)
// Exemple: oldFacts.years_experience = 5, newFacts.years_experience = 2
// → Retourne: [{ msg: "Years of experience contradiction: previously stated 5 years, now stating 2 years", severity: "major" }]

allContradictions = [
  ...localContradictions,      // 1 contradiction
  ...profileContradictions,    // 1 contradiction
  ...programmaticContradictions // 1 contradiction
];

output = computeContradictionOutput(score, allContradictions);
// output.contradictions = [3 contradictions] ✅
```

## Tableau Récapitulatif

| Événement | Fréquence | Appel LLM ? | Retourne Contradictions ? |
|-----------|-----------|-------------|--------------------------|
| **Local Scan** | Chaque chunk (~10s) | ✅ Oui | ✅ Oui, directement |
| **Profile Extraction** | Toutes les 6 chunks (~60s) | ✅ Oui | ✅ Oui, dans la réponse |
| **Profile Consistency** | Quand profile extraction | ✅ Oui (OpenAI GPT-4o) | ✅ Oui, comparaison intelligente avec LLM |
| **`output.contradictions`** | **Chaque chunk** | ❌ Non (calcul) | ✅ **Oui, combine toutes les sources** |

## Points Clés

1. **`output.contradictions` est calculé à CHAQUE chunk**, même si profile extraction n'est pas appelé.

2. **À chaque chunk, vous avez au minimum** :
   - Les contradictions du local scan (si détectées)
   - `output.contradictions` contiendra ces contradictions

3. **Toutes les 6 chunks, vous avez en plus** :
   - Les contradictions du profile extraction (si détectées)
   - Les contradictions programmatiques (si détectées)
   - `output.contradictions` contiendra TOUTES (local + profile + programmatique)

4. **Donc `output.contradictions` peut être** :
   - Vide `[]` si aucune contradiction détectée
   - Avec 1-N contradictions du local scan seulement
   - Avec 1-N contradictions combinées (local + profile + programmatique)

## Code Actuel dans testCustomTranscript.ts

```typescript
for (let i = 0; i < chunks.length; i++) {
  // 1. LOCAL SCAN (chaque chunk)
  localContradictions = await localContradictionScan(...); // LLM ✅
  
  // 2. PROFILE EXTRACTION (toutes les 6 chunks)
  if ((i + 1) % 6 === 0 || i === chunks.length - 1) {
    const { contradictions: profileContradictions } = await extractProfileFacts(...); // LLM ✅
    const programmaticContradictions = compareProfiles(...); // Pas LLM
    // ...
  }
  
  // 3. COMBINE TOUT (chaque chunk)
  const allContradictions = [...localContradictions, ...profileContradictions];
  
  // 4. CALCULE OUTPUT (chaque chunk)
  const output = computeContradictionOutput(score, allContradictions);
  // output.contradictions est disponible ICI à chaque chunk ✅
}
```

## Comment fonctionne le Profile Consistency Check ?

### Étape 1 : Profile Extraction (avec LLM)
Le LLM extrait des **faits structurés** du transcript :
```typescript
const { facts, contradictions } = await extractProfileFacts({
  transcript_summary: "Last 5 minutes...",
  previous_facts: oldFacts
});

// facts = {
//   years_experience: 2,
//   job_titles: ["Junior Developer"],
//   companies: ["Startup Inc"],
//   ...
// }
```

### Étape 2 : Profile Consistency Check (avec LLM OpenAI)
Compare **intelligemment** les nouveaux faits avec les anciens faits stockés en utilisant GPT-4o :

```typescript
// Anciens faits stockés dans Fact Store
const oldFacts = {
  years_experience: 5,
  job_titles: ["Frontend Engineer"],
  companies: ["Tech Corp"]
};

// Nouveaux faits extraits par le LLM
const newFacts = {
  years_experience: 2,
  job_titles: ["Full Stack Engineer"],
  companies: ["Startup Inc"]
};

// Comparaison intelligente avec LLM OpenAI
const contradictions = await compareProfiles(oldFacts, newFacts);
// → Le LLM comprend le contexte :
//   - years_experience: 5 vs 2 = différence de 3 ans → "major" ✅
//   - job_titles: "Frontend Engineer" vs "Full Stack Engineer" → PAS de contradiction ✅
//     (progression de carrière normale)
//   - companies: différentes entreprises → PAS de contradiction ✅
//     (candidat peut avoir travaillé dans plusieurs entreprises)
```

### Pourquoi utiliser un LLM ?
Pour comprendre le **contexte** et éviter les faux positifs :
- "Frontend Engineer" vs "Full Stack Engineer" = progression de carrière, PAS une contradiction
- "Engineer" vs "Developer" = rôles similaires, PAS une contradiction
- "5 years" vs "2 years" = vraie contradiction à détecter
- Le LLM comprend les nuances que la logique programmatique ne peut pas capturer

### Exemples de Détection

| Ancien Fait | Nouveau Fait | Détection |
|-------------|--------------|-----------|
| `years_experience: 5` | `years_experience: 2` | **Major** (différence ≥3) |
| `years_experience: 5` | `years_experience: 4` | **Minor** (différence =1) |
| `job_titles: ["Senior Engineer"]` | `job_titles: ["Junior Dev"]` | **Major** (pas d'overlap) |
| `leadership: ["led a project"]` | `leadership: ["mentored juniors"]` | **Major** (significant → minor) |

## Réponse Directe

**Oui, `output.contradictions` sort à chaque chunk**, mais :
- Il combine les contradictions de **plusieurs sources** (pas juste un appel LLM)
- Il peut être vide si aucune contradiction n'est détectée
- Il contient au minimum les contradictions du local scan (appelé à chaque chunk)
- Il contient en plus les contradictions du profile extraction (appelé toutes les 6 chunks)
- Il contient aussi les contradictions programmatiques (comparaison directe des faits structurés)

