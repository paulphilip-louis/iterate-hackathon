# Guide de Test des Modules

Ce guide explique comment tester les 3 modules principaux du système d'analyse d'entretien.

## 🚀 Tests Disponibles

### Test Unifié (Tous les modules)
```bash
npm test
# ou
npm run test:all
```

Teste les 3 modules ensemble avec des scénarios réalistes :
- ✅ Cultural Fit Detection
- ✅ Contradiction Detection  
- ✅ Script Tracking

### Tests Individuels

#### 1. Cultural Fit Detection
```bash
npm run test:cultural-fit
```

#### 2. Contradiction Detection
```bash
npm run test:contradiction
```

#### 3. Script Tracking
```bash
npm run test:script-tracking
```

## 📋 Prérequis

1. **Fichier `.env`** à la racine avec votre clé API :
   ```env
   OPENAI_API_KEY=sk-...
   # ou
   GROQ_API_KEY=gsk_...
   LLM_PROVIDER=groq
   LLM_MODEL=llama-3.1-70b-versatile
   ```

2. **Dépendances installées** :
   ```bash
   npm install
   ```

## 🧪 Ce qui est testé

### Cultural Fit Detection
- Détection de signaux positifs (ownership, accountability, collaboration)
- Détection de signaux négatifs (blame shifting, évitement, arrogance)
- Calcul du score de fit culturel (0-100)
- Lissage exponentiel des scores

### Contradiction Detection
- Scan local de chaque chunk
- Extraction de profil (toutes les 6 chunks)
- Détection de contradictions (années d'expérience, postes, entreprises)
- Calcul du score de cohérence (0-100)

### Script Tracking
- Classification LLM des chunks en sections/subsections
- Détection de déviations (jump ahead, going backward, off-script)
- Suivi de progression du script d'entretien
- Calcul du pourcentage de complétion

## 📊 Format de Sortie

Chaque test affiche :
- ⏱️ Temps d'exécution
- 📊 Scores avec indicateurs visuels (🟢🟡🟠🔴)
- 🏷️ Labels (High Fit, Consistent, etc.)
- ⚠️ Alertes et détections
- 📈 Tendances et progressions

## 🔧 Dépannage

Si vous avez des erreurs :
1. Vérifiez que votre `.env` contient une clé API valide
2. Vérifiez que `mock_company_values.txt` existe dans `modules/cultural_fit/`
3. Vérifiez que toutes les dépendances sont installées
