# NewsBot AI — Application d'intelligence des actualités

Une application React moderne qui agrège, analyse et explique l'actualité avec assistance IA, personnalisation, tendances, prévisions et interactions fluides.

## Sommaire

- Présentation rapide
- Fonctionnalités principales
- Architecture et technologies
- Démarrage rapide (Windows)
- Configuration de l'assistant IA (Gemini)
- Structure du projet
- Pages et parcours utilisateur
- Moteurs d'analyse (Trends & Forecast)
- Gestes et interactions (Swipe-to-Archive)
- Scripts XAI (explicabilité LIME/SHAP)
- Dépannage (FAQ)

---

## 🚀 Présentation rapide

NewsBot AI propose un fil d'actualités personnalisées, un assistant IA (Google Gemini) pour analyser/expliciter, des tendances thématiques, des prévisions d'événements et une page article professionnelle avec spectre de perspectives, analyse de biais/sentiment et sondage communautaire.

---

## ✨ Fonctionnalités principales

- Assistant IA intégré avec historique multi-conversations, citations de sources et mise en forme Markdown
- Page Article professionnelle (Deep Dive):
	- Résumé AI structuré, analyse biais/sentiment, entités clés
	- Perspectives sur un spectre politique, sondage communautaire, barre de progression de lecture
- Tendances par sujets (topic scoring) et sélection d'images automatique
- Prévisions d'événements avec indicateurs (croissance, pertinence historique, volatilité du sentiment, engagement)
- Personnalisation (likes, bookmarks, partages, sujets)
- Swipe-to-Archive sur le feed et gestion des archivés dans Profil
- UI moderne (Tailwind + Framer Motion), responsive et animée

---

## 🧱 Architecture et technologies

- Frontend: React 19 + Vite + TypeScript
- UI: Tailwind CSS, Framer Motion, React Markdown + GFM
- Routing: React Router DOM
- IA: `@google/genai` (Gemini 2.0 Flash)
- État/app: hooks custom, localStorage, Context API
- Tests: Jest (inclus, à compléter selon besoin)

---

## 🔧 Démarrage rapide (Windows PowerShell)

Prérequis: Node.js 18+ et npm.

1) Installer les dépendances

```powershell
cd C:\Users\rayen\Desktop\News3\NewBot-AI-main\NewBot-AI-main
npm install
```

2) Lancer le serveur de dev

```powershell
npm run dev
```

3) Ouvrir l'app

- Local: http://localhost:3000/

---

## 🔑 Configuration de l'assistant IA (Gemini)

L'assistant utilise l'API Google Gemini. Deux façons de lier votre clé API:

1) Via les paramètres dans l'application
- Ouvrez l'app → cliquez sur l'icône ⚙️ dans l'assistant → "Assistant API Configuration"
- Collez votre clé Gemini → Sauvegarder

2) Via localStorage (rapide pour dev)
- Exécutez dans la console du navigateur:

```js
localStorage.setItem('gemini_api_key', 'VOTRE_CLE_ICI');
```

Note sécurité:
- Le fichier `setup-api.js` contient un exemple de clé. Remplacez-la par la vôtre et NE commitez pas votre clé en production.
- Le composant: `components/GlobalAssistant.tsx` lit la clé via `localStorage.getItem('gemini_api_key')`.

---

## 🗂️ Structure du projet (extrait)

```
NewBot-AI-main/
	App.tsx
	components/
		GlobalAssistant.tsx      # Assistant IA (Gemini), UI chat, historique, settings
		NewsCard.tsx             # Carte article avec swipe-to-archive
	pages/
		Dashboard.tsx            # Feed principal personnalisé
		DeepDive.tsx             # Page article pro: résumé, biais/sentiment, perspectives, poll
		Profile.tsx              # Profil (likes, archivés, etc.)
		Settings.tsx             # Paramètres (incl. assistant)
	hooks/
		usePersonalization.ts
		useArchivedArticles.ts   # Persistance des archivés (localStorage)
	services/
		newsService.ts           # Chargement, sentiment estimé, utilitaires
		forecastService.ts       # Scoring prévisionnel & scénarios
		personalizationEngine.ts # Règles de personnalisation
	utils/
		trendingMetrics.ts       # Topics, scores de tendance, images
		forecastAnalytics.ts     # Pertinence historique, croissance, volatilité, engagement EMA
	scripts/
		explain_summary_xai.py   # Explicabilité LIME/SHAP sur résumés
		xai_sample_input.json    # Exemple d'entrée
```

---

## 🧭 Pages et parcours utilisateur

### Dashboard (Accueil)
- Affiche les articles triés par pertinence personnalisée
- Swipe vers la gauche pour archiver un article (gesture Framer Motion)
- Les articles archivés disparaissent du feed automatiquement

### Article (Deep Dive)
- Header riche (badges sentiment/topic, source, auteur, date, trust score)
- Panneau latéral "AI Analysis" avec onglets:
	- Summary: points clés numérotés
	- Bias & Sentiment: jauges + BiasMeter
	- Key Entities: tags d'entités
- Corps d'article avec mise en forme (prose), lien source, barre de progression de lecture
- Perspectives Spectrum: cartes positionnées sur un axe gauche→droite par biais
- Community Poll: sondage 3 options avec résultats animés

### Profil
- Liste des articles archivés, restauration et "Clear All"
- Likes/bookmarks/partages comptabilisés via `useUser`

### Assistant
- Chat multi-conversations, suggestions, analyse de l'article courant, citations de sources
- Gestion des erreurs Gemini (401/403/429) avec messages clairs

---

## 📈 Moteurs d'analyse

### Tendances (`utils/trendingMetrics.ts`)
- `sanitizeTopicName(value)`: nettoie les topics (trim, fallback '')
- `inferTopicFromText(article)`: devine le topic via mots-clés dans headline/summary/fullText
- `resolveArticleTopic(article)`: garde le topic non-générique sinon infère, fallback "Global"
- `buildTopicScores(articles)`: calcule volume, croissance, récence par topic
- `selectTopTopics(scores, topicImageMap, fallback)`: top topics avec image (Unsplash-like URL)

### Prévisions (`utils/forecastAnalytics.ts`)
- `calculateHistoricalRelevance(articles)`: pertinence historique avec décroissance exponentielle
- `calculateGrowthRate(articles)`: pente de croissance (régression linéaire) normalisée
- `calculateSentimentVolatility(articles)`: écart-type des sentiments → controverse
- `calculateEngagementEma(articles)`: EMA d'un proxy engagement (longueur résumé, bullets)
- `buildEventAnalytics(articles, scenarioModifiers)`: score final pondéré + scénarios

Formule (exemple simplifié):

```
score = 0.4 * historicalRelevance
			+ 0.3 * normalizedGrowth
			+ 0.2 * sentimentVolatility
			+ 0.1 * engagementEma
```

---

## 🧠 Gestes et interactions

### Swipe-to-Archive
- Implémenté dans `components/NewsCard.tsx` avec Framer Motion
- Seuil: ~150px vers la gauche → animation de sortie → `archiveArticle(id)`
- Persistance: `hooks/useArchivedArticles.ts` (localStorage)
- Intégration:
	- `pages/Dashboard.tsx`: filtre les archivés du feed
	- `pages/Profile.tsx`: section "Archived Articles" (restore / clear)

---

## 🔬 Scripts XAI (explicabilité LIME/SHAP)

But: expliquer, pour chaque bullet du résumé, quels tokens du texte de l'article sont les plus influents.

Entrée JSON (`scripts/xai_sample_input.json`):

```json
{
	"article": "Texte complet de l'article...",
	"summary": [
		"Point 1 du résumé",
		"Point 2 du résumé"
	]
}
```

Exécution (PowerShell, depuis le dossier `scripts/`):

```powershell
python explain_summary_xai.py --input xai_sample_input.json --output xai_report.json --lime-top 8 --shap-top 8 --shap-max-evals 100
```

Sortie: `xai_report.json` avec tokens et poids pour LIME/SHAP.

Détails internes:
- `predict_proba`: transforme la similarité cosinus en probabilité:
	- `sims ∈ [-1, 1]` → `probs = clip(0.5 * (sims + 1), 0, 1)` → `[0, 1]`
	- `complement = 1 - probs` pour la classe opposée

---

## 🧩 Dépannage (FAQ)

1) Assistant: "API Key Required"
- Configurez la clé Gemini via ⚙️ Settings, ou `localStorage.setItem('gemini_api_key', '...')`

2) Erreur 429 (rate limit) côté Gemini
- Attendez quelques secondes avant de réessayer; modèle utilisé: `gemini-2.0-flash` (stable)

3) Vite démarre mais rien ne s'affiche
- Ouvrez http://localhost:3000/ et vérifiez la console du navigateur

4) Avertissements Tailwind `@tailwind` inconnus
- Normaux côté éditeur brut; l'app fonctionne (postCSS/Tailwind gèrent ces directives au build)

5) Le swipe n’archive pas
- Vérifiez que `enableSwipe` est `true` sur `NewsCard` et que `onArchive` est passé depuis `Dashboard`

---

## 📜 Licence

Projet éducatif/démo. Ne pas publier de clés API en clair en production.

---

## 🙌 Remerciements

- Google Gemini (`@google/genai`)
- Framer Motion, Tailwind CSS, React Router, React Markdown + GFM


