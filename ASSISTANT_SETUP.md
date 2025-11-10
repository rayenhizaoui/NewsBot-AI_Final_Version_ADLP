# 🤖 Configuration du NewsBot Assistant

## ⚠️ Message d'erreur actuel
Si vous voyez : **"Sorry, I'm unable to connect to my services at the moment. Please try again later."**

C'est parce que l'API Key Google Gemini n'est pas configurée.

## ✅ Solution : Configurer votre API Key

### Étape 1 : Obtenir une API Key gratuite

1. Visitez **https://aistudio.google.com/apikey**
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Create API Key"** (ou "Get API Key")
4. Copiez la clé générée (elle ressemble à : `AIzaSyC...`)

> 💡 **Gratuit !** Gemini API offre un généreux quota gratuit. Aucune carte bancaire requise !

### Étape 2 : Configurer dans NewsBot AI

1. Dans l'application, cliquez sur **⚙️ Settings** (menu de gauche)
2. Sélectionnez **"Assistant"** dans le menu
3. Collez votre API key dans le champ **"Google Gemini API Key"**
4. Cliquez sur **"Save API Key"**
5. (Optionnel) Cliquez sur **"Test Connection"** pour vérifier

### Étape 3 : Utiliser l'Assistant

1. Fermez les Settings
2. Cliquez sur le bouton **💬** en bas à droite (bouton turquoise)
3. L'assistant devrait maintenant fonctionner !

## 🎯 Fonctionnalités du NewsBot Assistant

Une fois configuré, vous pouvez :

### Analyse d'articles
```
"Analyze the article about AI regulation"
"What's the bias in this article?"
"Summarize the key points"
```

### Recherche en temps réel
```
"What are the latest news about fusion energy?"
"What happened with the chip shortage?"
"Explain quantum computing"
```

### Prévisions & Analyse
```
"What are the potential impacts of this trade agreement?"
"Forecast three scenarios for space tourism"
"What's a contrarian view on remote work?"
```

### Comparaison
```
"Compare media bias on the recent election"
"What are different perspectives on this topic?"
```

## 🔐 Sécurité

- ✅ Votre API key est stockée **localement** dans votre navigateur
- ✅ Elle n'est **jamais envoyée** à nos serveurs
- ✅ Seul Google Gemini y a accès (pour traiter vos requêtes)
- ✅ Vous pouvez la supprimer à tout moment

## ⚙️ Modèle utilisé

- **Model** : `gemini-2.0-flash-exp`
- **Features** : Google Search intégré pour informations en temps réel
- **Sources** : Citations automatiques des sources web

## 🐛 Problèmes courants

### "API Key is invalid"
- Vérifiez que vous avez copié la clé complète
- Assurez-vous qu'il n'y a pas d'espaces avant/après
- Essayez de générer une nouvelle clé

### "Error testing API key"
- Vérifiez votre connexion internet
- Vérifiez que l'API Gemini est accessible dans votre région
- Essayez de recharger la page

### L'assistant ne répond pas
- Vérifiez que l'API key est bien sauvegardée
- Essayez de créer un nouveau chat (bouton + en haut)
- Vérifiez la console (F12) pour les erreurs

## 💡 Tips

1. **Nouveau chat** : Cliquez sur **+** pour démarrer une nouvelle conversation
2. **Focus Mode** : Cliquez sur **⛶** pour agrandir l'assistant en plein écran
3. **Historique** : En mode Focus, accédez à tous vos anciens chats
4. **Contexte** : Sur une page d'article, cliquez sur **✨** pour analyser l'article actuel
5. **Sources** : L'assistant cite ses sources en bas de chaque réponse

## 🚀 Limites du quota gratuit

Google Gemini offre généreusement :
- **60 requêtes par minute**
- **1500 requêtes par jour**

Largement suffisant pour un usage personnel !

## 📞 Support

Si vous avez encore des problèmes :
1. Ouvrez la console (F12)
2. Vérifiez les erreurs
3. Essayez de recharger la page
4. Vérifiez que votre navigateur supporte localStorage

---

**Bon chat avec NewsBot Assistant ! 🤖✨**
