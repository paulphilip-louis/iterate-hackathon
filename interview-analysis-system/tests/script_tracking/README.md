# Script Tracking Tests

Tests pour le module de suivi de script d'entretien (`script_tracking`).

## 🚀 Exécution

### Prérequis

1. Avoir un fichier `.env` à la racine de `interview-analysis-system/` avec :
   ```env
   OPENAI_API_KEY=sk-...
   # ou
   GROQ_API_KEY=gsk_...
   LLM_PROVIDER=groq
   LLM_MODEL=llama-3.1-70b-versatile
   # ou
   OPENROUTER_API_KEY=sk-or-...
   LLM_PROVIDER=openrouter
   LLM_MODEL=openai/gpt-4o
   ```

2. Installer les dépendances :
   ```bash
   cd interview-analysis-system
   npm install
   ```

### Lancer les tests

```bash
# Depuis la racine du projet
cd interview-analysis-system
npx tsx tests/script_tracking/scriptTrackingTestRunner.ts
```

## 📋 Scénarios de test

Le test runner exécute 9 scénarios différents :

1. **Section 1 - Présentation personnelle** : Test de classification basique
2. **Section 1 - Parcours professionnel** : Progression normale dans une section
3. **Section 1 - Motivations** : Suite de la progression
4. **Section 2 - Company Fit** : Transition vers nouvelle section
5. **Section 3 - Technical Skills** : Classification technique
6. **OFF-SCRIPT** : Détection de sujet hors script (football)
7. **Section 4 - Behavioral Questions** : Questions comportementales
8. **JUMP AHEAD** : Détection de saut de section (4 → 6)
9. **GOING BACKWARD** : Détection de retour en arrière (6 → 2)

## ✅ Ce qui est testé

- ✅ Classification LLM des chunks de transcript
- ✅ Détection de déviations (jump ahead, going backward, off-script)
- ✅ Mise à jour de l'état du script (sections complétées, progress)
- ✅ Validation des résultats attendus

## 📊 Format de sortie

Le test affiche pour chaque scénario :
- 🤖 Classification LLM (section, subsection, confidence, off-script)
- ⚠️ Détection de déviation
- 📊 État du script (current section, progress, completed sections)
- ✅ Validation des résultats attendus

