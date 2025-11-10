# 🎯 Personalization Engine Documentation

## Vue d'ensemble

Le **Personalization Engine** de NewsBot-AI est un système avancé de recommandation qui combine :
- ✅ **Filtrage collaboratif** : Recommande des articles basés sur des utilisateurs similaires
- ✅ **Filtrage basé sur le contenu** : Analyse les préférences de l'utilisateur (topics, sources, sentiment)
- ✅ **Apprentissage en temps réel** : S'adapte dynamiquement aux changements de comportement
- ✅ **Profils utilisateurs dynamiques** : Met à jour les préférences à chaque interaction

## 🏗️ Architecture

### Structure des fichiers

```
NewBot-AI-main/
├── types/
│   └── personalization.ts          # Interfaces TypeScript
├── services/
│   └── personalizationEngine.ts    # Algorithmes de recommandation
├── hooks/
│   └── usePersonalization.ts       # Hook React pour l'utilisation
├── contexts/
│   └── UserContext.tsx             # Contexte global utilisateur
├── components/
│   ├── NewsCard.tsx                # Carte d'article avec tracking
│   └── PersonalizationInsights.tsx # Widget d'insights utilisateur
└── pages/
    └── Dashboard.tsx               # Dashboard avec recommandations
```

## 🚀 Fonctionnalités principales

### 1. Tracking du comportement utilisateur

Le système track automatiquement :
- **Vues d'articles** : Quand un utilisateur clique sur un article
- **Temps de lecture** : Durée passée sur chaque article
- **Likes** : Articles aimés par l'utilisateur
- **Partages** : Articles partagés
- **Bookmarks** : Articles sauvegardés

```typescript
// Exemple d'utilisation
const { trackArticleView, trackLike, startReadingTimer } = useUser();

// Track une vue
trackArticleView(articleId, topic, source);

// Track un like
trackLike(articleId, topic, source);

// Start un timer de lecture
const stopTimer = startReadingTimer(articleId);
// ... plus tard
stopTimer(); // Enregistre automatiquement le temps de lecture
```

### 2. Algorithme de recommandation hybride

Le système combine plusieurs scores :

```
Score Final = (ContentScore × 0.50) + 
              (CollaborativeScore × 0.35) + 
              (RecencyBonus × 0.10) + 
              (PopularityBonus × 0.05)
```

#### Content-Based Score (50%)
- **Topics** (40%) : Basé sur les préférences de topics de l'utilisateur
- **Sources** (25%) : Préférence pour certaines sources d'information
- **Sentiment** (20%) : Alignement avec le sentiment préféré
- **Trust Score** (15%) : Bonus pour les sources fiables

#### Collaborative Score (35%)
- Trouve les 10 utilisateurs les plus similaires
- Calcule la similarité cosine sur les préférences de topics et sources
- Recommande ce que ces utilisateurs similaires ont aimé

#### Recency Bonus (10%)
- Articles récents obtiennent un bonus
- Décroissance sur 30 jours

#### Popularity Bonus (5%)
- Articles populaires obtiennent un petit boost

### 3. Apprentissage en ligne (Online Learning)

Le profil utilisateur s'adapte en temps réel avec un algorithme d'**exponential moving average** :

```typescript
newWeight = oldWeight + learningRate × (reward - oldWeight)
```

**Learning Rate** : 0.15 (paramétrable)

#### Système de récompenses
- **View** : 0.3
- **Read Time** : 0.5 (avec boost si lecture longue)
- **Like** : 0.8
- **Bookmark** : 0.9
- **Share** : 1.0

### 4. Décroissance temporelle

Les préférences anciennes perdent du poids avec le temps :
- **Decay Factor** : 0.97
- Appliqué périodiquement (toutes les 2 heures)
- Permet au système de s'adapter aux changements d'intérêts

### 5. Cold Start Handling

Pour les nouveaux utilisateurs (< 3 interactions) :
- Le système utilise uniquement le **content-based filtering**
- Poids ajustés : Content (70%), Recency (15%), Popularity (15%)
- Passage automatique au mode hybride après 3 interactions

## 📊 Insights utilisateur

Le système génère des insights détaillés :

```typescript
interface PersonalizationInsights {
  topTopics: Array<{ topic: string; weight: number }>;
  topSources: Array<{ source: string; weight: number }>;
  averageReadTime: number;
  engagementLevel: 'low' | 'medium' | 'high';
  mostActiveHours: Array<{ hour: number; count: number }>;
  readingPattern: string; // "Morning Reader", "Night Owl", etc.
  diversityScore: number; // 0-1
}
```

## 🎨 Interface utilisateur

### Dashboard personnalisé
- Badge **"🔥 Top Pick"** pour l'article le plus recommandé
- Badge **"⭐ For You"** pour les articles hautement recommandés
- Raisons de recommandation sous chaque article
- Topics préférés marqués avec ⭐

### Widget d'insights
- Niveau d'engagement (Low/Medium/High)
- Score de diversité
- Top 5 topics favoris avec pourcentages
- Top 3 sources de confiance
- Temps de lecture moyen
- Heures d'activité maximales
- Pattern de lecture (Morning Reader, Night Owl, etc.)

### Interactions sur les articles
- ❤️ Like button
- 🔖 Bookmark button
- 📤 Share button (avec Web Share API si disponible)

## 💾 Persistance

Les données sont sauvegardées dans le **localStorage** :
- `newsbot_user_profiles` : Profils utilisateurs
- `newsbot_article_features` : Features des articles
- `newsbot_current_user_id` : ID de l'utilisateur actuel

## 🔧 Configuration

### Hyperparamètres (dans `personalizationEngine.ts`)

```typescript
LEARNING_RATE = 0.15           // Vitesse d'apprentissage
DECAY_FACTOR = 0.97            // Facteur de décroissance temporelle
MIN_INTERACTIONS = 3           // Interactions min pour collaborative filtering
COLLABORATIVE_WEIGHT = 0.35    // Poids du filtrage collaboratif
CONTENT_WEIGHT = 0.50          // Poids du filtrage par contenu
RECENCY_WEIGHT = 0.10          // Poids de la récence
POPULARITY_WEIGHT = 0.05       // Poids de la popularité
SIMILARITY_THRESHOLD = 0.3     // Seuil de similarité entre utilisateurs
TOP_SIMILAR_USERS = 10         // Nombre d'utilisateurs similaires considérés
```

## 📈 Utilisation

### 1. Dans un composant React

```typescript
import { useUser } from '../contexts/UserContext';

function MyComponent() {
  const {
    profile,
    insights,
    trackArticleView,
    trackLike,
    getRecommendations,
    startReadingTimer
  } = useUser();

  // Obtenir des recommandations
  const recommendations = getRecommendations(articleIds, 10);

  // Tracker une vue
  trackArticleView(articleId, topic, source);

  // Tracker un like
  trackLike(articleId, topic, source);

  return <div>...</div>;
}
```

### 2. Accès direct au moteur

```typescript
import { personalizationEngine } from '../services/personalizationEngine';

// Enregistrer des articles
personalizationEngine.registerArticles(articleFeatures);

// Obtenir des recommandations
const recs = personalizationEngine.getRecommendations(userId, articleIds, 10);

// Obtenir le profil
const profile = personalizationEngine.getUserProfile(userId);

// Obtenir les insights
const insights = personalizationEngine.getInsights(userId);
```

## 🧪 Testing & Debug

### Mode développement
En mode développement, un panneau de debug est affiché en bas du Dashboard :
```typescript
{
  totalArticles: 7,
  topScores: [...],
  insights: {...}
}
```

### Console logs
Le système log automatiquement :
- ✅ Chargement des profils
- ✅ Processing des batches de comportement
- ✅ Application de la décroissance temporelle

## 🎯 Métriques de performance

### Calcul du score d'engagement
```typescript
engagementRate = (avgReadTime / expectedReadTime) × 0.7 + diversityBonus
```

### Score de diversité
```typescript
diversityScore = min(numberOfUniqueTopics / 10, 1)
```

## 🚀 Améliorations futures possibles

1. **Deep Learning** : Utiliser des embeddings d'articles (BERT, GPT)
2. **A/B Testing** : Tester différentes stratégies de recommandation
3. **Explainability** : Plus de détails sur pourquoi un article est recommandé
4. **Multi-Armed Bandits** : Équilibrer exploration vs exploitation
5. **Context-Aware** : Prendre en compte l'heure, le device, la localisation
6. **Social Features** : Intégrer les recommandations d'amis
7. **Feedback Loop** : Permettre à l'utilisateur de dire "pas intéressé"
8. **Analytics Dashboard** : Visualisation des performances du système

## 📝 Notes importantes

- Le système est **100% côté client** (localStorage)
- Les préférences sont **automatiquement sauvegardées**
- Le **background processing** tourne toutes les 60 secondes
- La **décroissance temporelle** s'applique toutes les 2 heures
- Le système supporte **plusieurs utilisateurs** (via userId)

## 🔐 Privacy

Toutes les données sont stockées **localement** dans le navigateur de l'utilisateur. Aucune donnée n'est envoyée à un serveur externe.

---

**Créé avec ❤️ pour NewsBot-AI**
